use crate::{AppError, AppResult, ErrorCode};
use zeroize::Zeroizing;

/// Implementations must never fall back to files/localStorage or include secrets in errors.
pub trait CredentialStore: Send + Sync {
    fn set(&self, reference: &str, secret: &str) -> AppResult<()>;
    fn get(&self, reference: &str) -> AppResult<Zeroizing<String>>;
    fn delete(&self, reference: &str) -> AppResult<()>;
}

pub struct SystemCredentials;

impl SystemCredentials {
    fn entry(reference: &str) -> AppResult<keyring::Entry> {
        keyring::Entry::new("com.tagmaai.desktop", reference)
            .map_err(|_| AppError::new(ErrorCode::CredentialStoreUnavailable))
    }
}

impl CredentialStore for SystemCredentials {
    fn set(&self, reference: &str, secret: &str) -> AppResult<()> {
        Self::entry(reference)?
            .set_password(secret)
            .map_err(|_| AppError::new(ErrorCode::CredentialStoreUnavailable))
    }
    fn get(&self, reference: &str) -> AppResult<Zeroizing<String>> {
        Self::entry(reference)?
            .get_password()
            .map(Zeroizing::new)
            .map_err(|_| AppError::new(ErrorCode::CredentialStoreUnavailable))
    }
    fn delete(&self, reference: &str) -> AppResult<()> {
        match Self::entry(reference)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(_) => Err(AppError::new(ErrorCode::CredentialStoreUnavailable)),
        }
    }
}
