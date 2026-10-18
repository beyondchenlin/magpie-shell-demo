use super::*;

pub const PACK_FREE_MARGIN_BYTES: u64 = 10 * 1024 * 1024 * 1024;
// Bounded preparation receipt (8MiB) plus directory/journal headroom.
const METADATA_RESERVE_BYTES: u64 = 16 * 1024 * 1024;
#[derive(Debug, Clone, Copy)]
pub struct PackVolumeSpace {
    pub target_available_bytes: u64,
    pub temp_available_bytes: u64,
    /// Measured by the host for the target filesystem, not supplied by a pack.
    pub target_allocation_unit_bytes: u64,
    pub temp_allocation_unit_bytes: u64,
    /// The host must determine volume identity, not compare directory strings.
    pub same_volume: bool,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackSpacePlan {
    pub download_bytes: u64,
    pub staged_unpack_bytes: u64,
    pub retained_existing_bytes: u64,
    pub logical_peak_bytes: u64,
    pub additional_target_bytes: u64,
    pub additional_temp_bytes: u64,
    pub allocation_allowance_bytes: u64,
    pub required_target_free_bytes: u64,
    pub required_temp_free_bytes: u64,
    pub target_shortfall_bytes: u64,
    pub temp_shortfall_bytes: u64,
    pub same_volume: bool,
}
impl PackSpacePlan {
    pub fn fits(&self) -> bool {
        self.target_shortfall_bytes == 0 && self.temp_shortfall_bytes == 0
    }
}
impl VerifiedManifest {
    /// Existing active/task-pinned versions contribute to logical peak, but
    /// already reduce actual free space and must not be charged a second time.
    /// Stage and atomic switch share the target volume; switch does not copy.
    pub fn plan_install_space(
        &self,
        target: PackTarget,
        retained_existing_bytes: u64,
        space: PackVolumeSpace,
    ) -> PackResult<PackSpacePlan> {
        let a = self.artifact(target)?;
        let unit = space.target_allocation_unit_bytes;
        let temp_unit = space.temp_allocation_unit_bytes;
        if [unit, temp_unit]
            .iter()
            .any(|unit| !(512..=1024 * 1024).contains(unit) || !unit.is_power_of_two())
        {
            return Err(PackError::InvalidSpaceObservation);
        }
        let download = a.download.size_bytes;
        let unpack = a.resources.max_unpacked_bytes;
        let add = |a: u64, b: u64| a.checked_add(b).ok_or(PackError::ArithmeticOverflow);
        // Allow one rounded tail allocation and one metadata/directory
        // allocation per signed maximum entry, in addition to logical bytes.
        // This remains a preflight estimate, not a hard filesystem quota.
        let allocation_allowance = u64::from(a.resources.max_archive_entries)
            .checked_mul(unit)
            .and_then(|bytes| bytes.checked_mul(2))
            .ok_or(PackError::ArithmeticOverflow)?;
        let additional_target = add(add(unpack, METADATA_RESERVE_BYTES)?, allocation_allowance)?;
        let additional_temp = add(
            add(download, temp_unit - 1)? / temp_unit * temp_unit,
            temp_unit * 2,
        )?;
        let logical_peak = add(add(retained_existing_bytes, unpack)?, download)?;
        let (target_required, temp_required, target_free, temp_free) = if space.same_volume {
            let required = add(
                add(additional_target, additional_temp)?,
                PACK_FREE_MARGIN_BYTES,
            )?;
            let free = space.target_available_bytes.min(space.temp_available_bytes);
            (required, required, free, free)
        } else {
            (
                add(additional_target, PACK_FREE_MARGIN_BYTES)?,
                add(additional_temp, PACK_FREE_MARGIN_BYTES)?,
                space.target_available_bytes,
                space.temp_available_bytes,
            )
        };
        Ok(PackSpacePlan {
            download_bytes: download,
            staged_unpack_bytes: unpack,
            retained_existing_bytes,
            logical_peak_bytes: logical_peak,
            additional_target_bytes: additional_target,
            additional_temp_bytes: additional_temp,
            allocation_allowance_bytes: allocation_allowance,
            required_target_free_bytes: target_required,
            required_temp_free_bytes: temp_required,
            target_shortfall_bytes: target_required.saturating_sub(target_free),
            temp_shortfall_bytes: temp_required.saturating_sub(temp_free),
            same_volume: space.same_volume,
        })
    }
}
