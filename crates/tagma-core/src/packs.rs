//! Pack admission, disposable extraction and installed version metadata.
//! Runtime health must succeed before activation. Permission declarations are
//! not an OS sandbox; process execution belongs to tagma-runtime.
mod archive;
#[cfg(test)]
mod archive_tests;
mod manifest;
mod installed;
mod observed_space;
mod paths;
mod prepared;
mod space;
mod trust;
pub use archive::*;
pub use manifest::*;
pub use installed::*;
pub use observed_space::*;
pub use paths::*;
pub use prepared::*;
pub use space::*;
pub use trust::*;

pub const PACK_CONTRACT_VERSION: u32 = 1;
pub const MAX_MANIFEST_BYTES: usize = 64 * 1024;
pub const MAX_ARCHIVE_BYTES: u64 = 512 * 1024 * 1024;
pub const MAX_UNPACKED_BYTES: u64 = 2 * 1024 * 1024 * 1024;
pub const MAX_ARCHIVE_ENTRIES: u32 = 10_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackError {
    InvalidManifest,
    UnsupportedContract,
    UnsupportedPlatform,
    UntrustedPublisher,
    InvalidSignature,
    ExpiredManifest,
    ChecksumMismatch,
    ArchiveLimit,
    UnsafePath,
    InvalidArchiveIndex,
    ArithmeticOverflow,
    InvalidSpaceObservation,
    ReadFailed,
    WriteFailed,
    Cancelled,
    InvalidArchive,
    UnsupportedArchive,
    TimedOut,
    InvalidPreparedPack,
}
impl std::fmt::Display for PackError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::InvalidManifest => "PACK_INVALID_MANIFEST",
            Self::UnsupportedContract => "PACK_UNSUPPORTED_CONTRACT",
            Self::UnsupportedPlatform => "PACK_UNSUPPORTED_PLATFORM",
            Self::UntrustedPublisher => "PACK_UNTRUSTED_PUBLISHER",
            Self::InvalidSignature => "PACK_INVALID_SIGNATURE",
            Self::ExpiredManifest => "PACK_EXPIRED_MANIFEST",
            Self::ChecksumMismatch => "PACK_CHECKSUM_MISMATCH",
            Self::ArchiveLimit => "PACK_ARCHIVE_LIMIT",
            Self::UnsafePath => "PACK_UNSAFE_PATH",
            Self::InvalidArchiveIndex => "PACK_INVALID_ARCHIVE_INDEX",
            Self::ArithmeticOverflow => "PACK_ARITHMETIC_OVERFLOW",
            Self::InvalidSpaceObservation => "PACK_INVALID_SPACE_OBSERVATION",
            Self::ReadFailed => "PACK_READ_FAILED",
            Self::WriteFailed => "PACK_WRITE_FAILED",
            Self::Cancelled => "PACK_CANCELLED",
            Self::InvalidArchive => "PACK_INVALID_ARCHIVE",
            Self::UnsupportedArchive => "PACK_UNSUPPORTED_ARCHIVE",
            Self::TimedOut => "PACK_STAGE_TIMEOUT",
            Self::InvalidPreparedPack => "PACK_INVALID_PREPARED",
        })
    }
}
impl std::error::Error for PackError {}
pub type PackResult<T> = Result<T, PackError>;
