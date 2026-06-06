use serde::{Deserialize, Serialize};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const DEFAULT_MODEL: &str = "deepseek-chat";
const REQUEST_TIMEOUT_SECS: u64 = 90;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug)]
pub enum DeepseekError {
    NotConfigured,
    Timeout,
    RateLimited,
    InsufficientBalance,
    InvalidKey,
    Api(String),
}

impl std::fmt::Display for DeepseekError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotConfigured => write!(f, "AI 服务未配置"),
            Self::Timeout => write!(f, "AI 请求超时，请稍后重试"),
            Self::RateLimited => write!(f, "AI 请求过于频繁，请稍后再试"),
            Self::InsufficientBalance => write!(f, "DeepSeek 账户余额不足，请充值后重试"),
            Self::InvalidKey => write!(f, "DeepSeek API Key 无效，请检查配置"),
            Self::Api(msg) => write!(f, "{msg}"),
        }
    }
}

#[derive(Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    response_format: ResponseFormat,
}

#[derive(Serialize)]
struct ResponseFormat {
    #[serde(rename = "type")]
    format_type: String,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
    error: Option<ApiErrorBody>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Deserialize)]
struct ApiErrorBody {
    message: Option<String>,
    #[serde(rename = "type")]
    error_type: Option<String>,
    code: Option<String>,
}

pub async fn chat_json(api_key: &str, messages: Vec<ChatMessage>) -> Result<String, DeepseekError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| DeepseekError::Api(e.to_string()))?;

    let body = ChatCompletionRequest {
        model: DEFAULT_MODEL.into(),
        messages,
        temperature: 0.2,
        response_format: ResponseFormat {
            format_type: "json_object".into(),
        },
    };

    let url = format!("{DEFAULT_BASE_URL}/chat/completions");
    let response = client
        .post(&url)
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                DeepseekError::Timeout
            } else {
                DeepseekError::Api(format!("网络请求失败: {e}"))
            }
        })?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| DeepseekError::Api(e.to_string()))?;

    if !status.is_success() {
        return Err(map_http_error(status.as_u16(), &text));
    }

    let parsed: ChatCompletionResponse = serde_json::from_str(&text).map_err(|e| {
        DeepseekError::Api(format!("响应解析失败: {e}"))
    })?;

    if let Some(err) = parsed.error {
        return Err(classify_api_body(&err));
    }

    let content = parsed
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .filter(|c| !c.trim().is_empty())
        .ok_or_else(|| DeepseekError::Api("AI 返回内容为空".into()))?;

    Ok(content)
}

fn map_http_error(status: u16, body: &str) -> DeepseekError {
    if let Ok(json) = serde_json::from_str::<ChatCompletionResponse>(body) {
        if let Some(err) = json.error {
            return classify_api_body(&err);
        }
    }

    match status {
        401 => DeepseekError::InvalidKey,
        402 => DeepseekError::InsufficientBalance,
        429 => DeepseekError::RateLimited,
        _ if body.to_lowercase().contains("insufficient balance")
            || body.to_lowercase().contains("余额")
            || body.to_lowercase().contains("quota") =>
        {
            DeepseekError::InsufficientBalance
        }
        _ if body.to_lowercase().contains("rate limit") => DeepseekError::RateLimited,
        _ => DeepseekError::Api(format!("DeepSeek API 错误 ({status}): {body}")),
    }
}

fn classify_api_body(err: &ApiErrorBody) -> DeepseekError {
    let msg = err.message.as_deref().unwrap_or("");
    let detail = match (&err.error_type, &err.code) {
        (Some(t), Some(c)) if !msg.is_empty() => format!("{msg} ({t}/{c})"),
        (Some(t), Some(c)) => format!("{t}/{c}"),
        _ => msg.to_string(),
    };
    classify_api_message(if detail.is_empty() { msg } else { &detail })
}

fn classify_api_message(msg: &str) -> DeepseekError {
    let lower = msg.to_lowercase();
    if lower.contains("insufficient balance") || lower.contains("余额") || lower.contains("quota") {
        DeepseekError::InsufficientBalance
    } else if lower.contains("rate limit") || lower.contains("too many") {
        DeepseekError::RateLimited
    } else if lower.contains("invalid api key") || lower.contains("authentication") {
        DeepseekError::InvalidKey
    } else if msg.is_empty() {
        DeepseekError::Api("DeepSeek API 返回未知错误".into())
    } else {
        DeepseekError::Api(msg.to_string())
    }
}

pub fn ensure_configured(api_key: Option<&String>) -> Result<&String, DeepseekError> {
    api_key.ok_or(DeepseekError::NotConfigured)
}
