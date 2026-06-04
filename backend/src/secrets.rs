use std::env;
use std::fs;
use std::path::Path;

use serde::Deserialize;

use crate::crypto;

const DEFAULT_SECRETS_PATH: &str = "secrets/deepseek.toml";

#[derive(Debug, Deserialize)]
struct DeepseekSecretsFile {
    api_key_encrypted: String,
}

#[derive(Debug, Clone)]
pub struct DeepseekSecrets {
    pub api_key: String,
}

impl DeepseekSecrets {
    pub fn load() -> Result<Self, String> {
        let path = env::var("DEEPSEEK_SECRETS_FILE").unwrap_or_else(|_| DEFAULT_SECRETS_PATH.into());
        Self::load_from_path(&path)
    }

    pub fn load_from_path(path: impl AsRef<Path>) -> Result<Self, String> {
        let path = path.as_ref();
        if !path.exists() {
            return Err(format!("secrets file not found: {}", path.display()));
        }

        let contents = fs::read_to_string(path)
            .map_err(|e| format!("read secrets file {}: {e}", path.display()))?;
        let file: DeepseekSecretsFile = toml::from_str(&contents)
            .map_err(|e| format!("parse secrets file {}: {e}", path.display()))?;

        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "cmp-dev-secret-change-in-production".into());
        let api_key = crypto::decrypt_secret(&file.api_key_encrypted, &jwt_secret)?;

        Ok(Self { api_key })
    }
}
