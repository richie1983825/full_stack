use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;

/// Derive a 32-byte key from the JWT secret (AES-256 needs exactly 32 bytes).
pub fn encryption_key(jwt_secret: &str) -> Vec<u8> {
    let secret = jwt_secret.as_bytes();
    if secret.len() >= 32 {
        secret[..32].to_vec()
    } else {
        let mut key = vec![0u8; 32];
        key[..secret.len()].copy_from_slice(secret);
        key
    }
}

pub fn encrypt_secret(plaintext: &str, jwt_secret: &str) -> Result<String, String> {
    let key = encryption_key(jwt_secret);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {e}"))?;
    let nonce_bytes = rand::random::<[u8; 12]>();
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("encrypt: {e}"))?;
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(&combined))
}

pub fn decrypt_secret(encoded: &str, jwt_secret: &str) -> Result<String, String> {
    let combined = BASE64
        .decode(encoded)
        .map_err(|e| format!("base64 decode: {e}"))?;
    if combined.len() < 12 {
        return Err("invalid ciphertext".into());
    }
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let key = encryption_key(jwt_secret);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {e}"))?;
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("decrypt: {e}"))?;
    String::from_utf8(plaintext).map_err(|e| format!("utf8: {e}"))
}
