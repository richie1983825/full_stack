use std::env;
use std::fs;
use std::path::Path;

use cmp_backend::crypto;

fn main() {
    dotenv::dotenv().ok();

    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("用法: cargo run --bin encrypt-secret -- <明文密钥> [输出文件路径]");
        eprintln!("示例: cargo run --bin encrypt-secret -- sk-xxx secrets/deepseek.toml");
        std::process::exit(1);
    }

    let plaintext = &args[1];
    let output_path = args
        .get(2)
        .map(String::as_str)
        .unwrap_or("secrets/deepseek.toml");

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| "cmp-dev-secret-change-in-production".into());
    let encrypted = crypto::encrypt_secret(plaintext, &jwt_secret).expect("encrypt failed");

    if let Some(parent) = Path::new(output_path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).expect("create secrets dir failed");
        }
    }

    let contents = format!(
        "# Deepseek API 密钥（AES-256-GCM 加密，请勿提交到 Git）\n\
         # 解密依赖 JWT_SECRET，更换 JWT_SECRET 后需重新加密\n\
         api_key_encrypted = \"{encrypted}\"\n"
    );
    fs::write(output_path, contents).expect("write secrets file failed");

    println!("已写入加密密钥到 {output_path}");
}
