//! Read-only host observations. They are a point-in-time estimate, not a quota
//! or authority to create/delete anything on either volume.
use super::*;
use std::{
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

#[derive(Debug)]
pub struct ObservedPackSpace {
    target_root: PathBuf,
    temp_root: PathBuf,
    space: PackVolumeSpace,
    observed: Instant,
}
impl ObservedPackSpace {
    pub fn target_root(&self) -> &Path {
        &self.target_root
    }
    pub fn temp_root(&self) -> &Path {
        &self.temp_root
    }
    pub fn space(&self) -> PackResult<PackVolumeSpace> {
        if self.age() > Duration::from_secs(2) {
            return Err(PackError::InvalidSpaceObservation);
        }
        Ok(self.space)
    }
    pub fn age(&self) -> Duration {
        self.observed.elapsed()
    }
}
/// Both directories must already exist. Resolve them before obtaining volume
/// identity; directory names/drive letters alone cannot establish shared space.
pub fn observe_pack_space(target: &Path, temp: &Path) -> PackResult<ObservedPackSpace> {
    // Age includes query time; slow filesystem queries cannot appear freshly
    // observed just because the final API call returned a moment ago.
    let observed = Instant::now();
    let directory = |path: &Path| -> PackResult<PathBuf> {
        let resolved =
            std::fs::canonicalize(path).map_err(|_| PackError::InvalidSpaceObservation)?;
        if !std::fs::metadata(&resolved)
            .map_err(|_| PackError::InvalidSpaceObservation)?
            .is_dir()
        {
            return Err(PackError::InvalidSpaceObservation);
        }
        Ok(resolved)
    };
    let target_root = directory(target)?;
    let temp_root = directory(temp)?;
    let (target_identity, target_unit) = volume(&target_root)?;
    let (temp_identity, temp_unit) = volume(&temp_root)?;
    let space = PackVolumeSpace {
        target_available_bytes: fs2::available_space(&target_root)
            .map_err(|_| PackError::InvalidSpaceObservation)?,
        temp_available_bytes: fs2::available_space(&temp_root)
            .map_err(|_| PackError::InvalidSpaceObservation)?,
        target_allocation_unit_bytes: target_unit,
        temp_allocation_unit_bytes: temp_unit,
        same_volume: target_identity == temp_identity,
    };
    Ok(ObservedPackSpace {
        target_root,
        temp_root,
        space,
        observed,
    })
}
fn valid_unit(unit: u64) -> PackResult<u64> {
    if (512..=1024 * 1024).contains(&unit) && unit.is_power_of_two() {
        Ok(unit)
    } else {
        Err(PackError::InvalidSpaceObservation)
    }
}
#[cfg(windows)]
fn volume(path: &Path) -> PackResult<(String, u64)> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        GetDiskFreeSpaceW, GetVolumeNameForVolumeMountPointW, GetVolumePathNameW,
    };
    let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
    wide.push(0);
    if wide.len() > 32768 {
        return Err(PackError::InvalidSpaceObservation);
    }
    let mut root = vec![0u16; 32768];
    let mut identity = [0u16; 64];
    let mut sectors = 0;
    let mut bytes = 0;
    let mut free = 0;
    let mut total = 0;
    // Pointers reference initialized, correctly sized owned buffers for these
    // synchronous Win32 read-only calls. Local volume GUIDs avoid alias letters.
    unsafe {
        if GetVolumePathNameW(wide.as_ptr(), root.as_mut_ptr(), root.len() as u32) == 0
            || GetVolumeNameForVolumeMountPointW(
                root.as_ptr(),
                identity.as_mut_ptr(),
                identity.len() as u32,
            ) == 0
            || GetDiskFreeSpaceW(
                root.as_ptr(),
                &mut sectors,
                &mut bytes,
                &mut free,
                &mut total,
            ) == 0
        {
            return Err(PackError::InvalidSpaceObservation);
        }
    }
    let length = identity
        .iter()
        .position(|c| *c == 0)
        .ok_or(PackError::InvalidSpaceObservation)?;
    let identity = String::from_utf16(&identity[..length])
        .map_err(|_| PackError::InvalidSpaceObservation)?
        .to_ascii_lowercase();
    if identity.is_empty() {
        return Err(PackError::InvalidSpaceObservation);
    }
    let unit = valid_unit(
        u64::from(sectors)
            .checked_mul(u64::from(bytes))
            .ok_or(PackError::ArithmeticOverflow)?,
    )?;
    Ok((identity, unit))
}
#[cfg(unix)]
fn volume(path: &Path) -> PackResult<(String, u64)> {
    use std::os::unix::{ffi::OsStrExt, fs::MetadataExt};
    let path_c = std::ffi::CString::new(path.as_os_str().as_bytes())
        .map_err(|_| PackError::InvalidSpaceObservation)?;
    let mut stat = std::mem::MaybeUninit::<libc::statvfs>::uninit();
    // statvfs initializes the structure only on success; CString is NUL-closed.
    let stat = unsafe {
        if libc::statvfs(path_c.as_ptr(), stat.as_mut_ptr()) != 0 {
            return Err(PackError::InvalidSpaceObservation);
        }
        stat.assume_init()
    };
    let unit = if stat.f_frsize > 0 {
        stat.f_frsize
    } else {
        stat.f_bsize
    };
    let identity = std::fs::metadata(path)
        .map_err(|_| PackError::InvalidSpaceObservation)?
        .dev()
        .to_string();
    Ok((identity, valid_unit(unit as u64)?))
}
#[cfg(not(any(windows, unix)))]
fn volume(_path: &Path) -> PackResult<(String, u64)> {
    Err(PackError::InvalidSpaceObservation)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn actual_same_volume_directories_have_real_allocation_and_available_space() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-space-observe-")
            .tempdir()
            .unwrap();
        let a = temp.path().join("target");
        let b = temp.path().join("temp");
        std::fs::create_dir(&a).unwrap();
        std::fs::create_dir(&b).unwrap();
        let observation = observe_pack_space(&a, &b).unwrap();
        let space = observation.space().unwrap();
        assert!(space.same_volume);
        assert!(space.target_available_bytes > 0 && space.temp_available_bytes > 0);
        assert_eq!(
            space.target_allocation_unit_bytes,
            space.temp_allocation_unit_bytes
        );
        assert_eq!(
            observation.target_root(),
            std::fs::canonicalize(&a).unwrap()
        );
        assert_eq!(observation.temp_root(), std::fs::canonicalize(&b).unwrap());
        assert!(observation.age() < Duration::from_secs(2));
        println!(
            "Actual same-volume observation:target/temp siblings,unit{}bytes,available target{} temp{},canonical directories;no install/quota/cleanup action",
            space.target_allocation_unit_bytes,
            space.target_available_bytes,
            space.temp_available_bytes
        );
    }
    #[test]
    fn missing_or_non_directory_input_is_not_created_or_reinterpreted() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-space-observe-")
            .tempdir()
            .unwrap();
        let missing = temp.path().join("not-created");
        assert!(matches!(
            observe_pack_space(&missing, temp.path()),
            Err(PackError::InvalidSpaceObservation)
        ));
        assert!(!missing.exists());
        let file = temp.path().join("owned-file");
        std::fs::write(&file, b"retained").unwrap();
        assert!(matches!(
            observe_pack_space(&file, temp.path()),
            Err(PackError::InvalidSpaceObservation)
        ));
        assert_eq!(std::fs::read(file).unwrap(), b"retained");
    }
    #[test]
    fn delayed_observation_cannot_supply_old_free_space_as_current() {
        let temp = tempfile::Builder::new()
            .prefix("tagma-space-observe-")
            .tempdir()
            .unwrap();
        let mut observation = observe_pack_space(temp.path(), temp.path()).unwrap();
        observation.observed = Instant::now() - Duration::from_secs(3);
        assert!(matches!(
            observation.space(),
            Err(PackError::InvalidSpaceObservation)
        ));
        assert!(observation.age() >= Duration::from_secs(3));
    }
    #[cfg(windows)]
    #[test]
    #[ignore = "Explicit Windows C:/D: volume-bound fixture;not a portable assumption about drive aliases"]
    fn actual_windows_c_and_workspace_d_are_distinct_volumes() {
        use std::path::{Component, Prefix};
        let drive = |p: &Path| match p.components().next() {
            Some(Component::Prefix(v)) => match v.kind() {
                Prefix::Disk(d) | Prefix::VerbatimDisk(d) => Some(d.to_ascii_uppercase()),
                _ => None,
            },
            _ => None,
        };
        let temp = tempfile::Builder::new()
            .prefix("tagma-space-observe-")
            .tempdir()
            .unwrap();
        let target_parent = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target");
        let target = tempfile::Builder::new()
            .prefix("tagma-space-observe-")
            .tempdir_in(target_parent)
            .unwrap();
        let observation = observe_pack_space(target.path(), temp.path()).unwrap();
        let space = observation.space().unwrap();
        assert_eq!(drive(observation.target_root()), Some(b'D'));
        assert_eq!(drive(observation.temp_root()), Some(b'C'));
        assert!(!space.same_volume);
        assert!(space.target_available_bytes > 0 && space.temp_available_bytes > 0);
        println!(
            "Explicit Windows C/D volume IDs distinct,targetD available{} unit{},tempC available{} unit{};readonly observation,only new empty owned fixture dirs,RAII;no redistribution/download/install",
            space.target_available_bytes,
            space.target_allocation_unit_bytes,
            space.temp_available_bytes,
            space.temp_allocation_unit_bytes
        );
    }
}
