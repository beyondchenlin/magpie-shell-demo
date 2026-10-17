//! Pack admission primitives, without downloads, extraction, process execution,
//! configuration writes, or a claim that permission declarations are a sandbox.
mod manifest;
mod paths;
mod space;
mod trust;
pub use manifest::*;
pub use paths::*;
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
        })
    }
}
impl std::error::Error for PackError {}
pub type PackResult<T> = Result<T, PackError>;
