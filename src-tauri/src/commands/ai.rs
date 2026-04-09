use directories::ProjectDirs;
use futures::StreamExt;
use keyring::Entry;
use once_cell::sync::Lazy;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionTestResponse {
    pub success: bool,
    pub error: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AICompletionResponse {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionTestRequest {
    pub provider: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub model_id: Option<String>,
    pub request_template: Option<String>,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Clone, Serialize)]
struct StreamChunk {
    request_id: String,
    chunk_type: String,
    data: String,
}

static ACTIVE_REQUESTS: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));

fn get_keyring_entry(provider: &str) -> Result<Entry, String> {
    Entry::new("doom-code-ai", provider).map_err(|e| e.to_string())
}

fn default_base_url(provider: &str) -> String {
    match provider {
        "openrouter" => "https://openrouter.ai/api/v1".to_string(),
        "deepseek" => "https://api.deepseek.com".to_string(),
        "google" => "https://generativelanguage.googleapis.com/v1beta".to_string(),
        "huggingface" => "https://router.huggingface.co/v1".to_string(),
        "ollama" => "http://localhost:11434".to_string(),
        _ => String::new(),
    }
}

fn normalise_base_url(base_url: &str) -> String {
    base_url.trim().trim_end_matches('/').to_string()
}

fn is_active_request(request_id: &str) -> bool {
    ACTIVE_REQUESTS
        .lock()
        .map(|active| active.contains(request_id))
        .unwrap_or(false)
}

fn mark_request_active(request_id: &str) -> Result<(), String> {
    let mut active = ACTIVE_REQUESTS.lock().map_err(|e| e.to_string())?;
    active.insert(request_id.to_string());
    Ok(())
}

fn mark_request_inactive(request_id: &str) {
    if let Ok(mut active) = ACTIVE_REQUESTS.lock() {
        active.remove(request_id);
    }
}

#[command]
pub async fn store_api_key(provider: String, api_key: String) -> Result<(), String> {
    let entry = get_keyring_entry(&provider)?;

    if api_key.trim().is_empty() {
        match entry.delete_password() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        entry.set_password(&api_key).map_err(|e| e.to_string())
    }
}

#[command]
pub async fn get_api_key(provider: String) -> Result<String, String> {
    let entry = get_keyring_entry(&provider)?;

    match entry.get_password() {
        Ok(password) => Ok(password),
        Err(keyring::Error::NoEntry) => Ok(String::new()),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn clear_api_key(provider: String) -> Result<(), String> {
    let entry = get_keyring_entry(&provider)?;

    match entry.delete_password() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn has_api_key(provider: String) -> Result<bool, String> {
    let entry = get_keyring_entry(&provider)?;

    match entry.get_password() {
        Ok(password) => Ok(!password.trim().is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn test_ai_connection(
    request: Option<ConnectionTestRequest>,
    provider: Option<String>,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<ConnectionTestResponse, String> {
    let provider = provider
        .or_else(|| request.as_ref().map(|value| value.provider.clone()))
        .unwrap_or_default();

    if provider.trim().is_empty() {
        return Err("Provider is required".to_string());
    }

    let api_key = api_key
        .or_else(|| request.as_ref().and_then(|value| value.api_key.clone()))
        .unwrap_or_default();

    let base_url = base_url
        .or_else(|| request.as_ref().and_then(|value| value.base_url.clone()))
        .unwrap_or_else(|| default_base_url(&provider));

    let base_url = normalise_base_url(&base_url);
    if base_url.is_empty() && provider != "custom" {
        return Err(format!("Base URL is missing for provider: {}", provider));
    }

    let test_url = match provider.as_str() {
        "openrouter" | "deepseek" | "custom" => format!("{}/models", base_url),
        "google" => format!("{}/models?key={}", base_url, api_key),
        "huggingface" => "https://huggingface.co/api/whoami-v2".to_string(),
        "ollama" => format!("{}/api/tags", base_url),
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    let client = Client::new();
    let mut request_builder = client.get(&test_url);

    match provider.as_str() {
        "openrouter" | "deepseek" | "custom" | "huggingface" => {
            if !api_key.trim().is_empty() {
                request_builder = request_builder.header("Authorization", format!("Bearer {}", api_key));
            }
        }
        "google" | "ollama" => {}
        _ => {}
    }

    match request_builder.send().await {
        Ok(response) => {
            if response.status().is_success() {
                Ok(ConnectionTestResponse {
                    success: true,
                    error: None,
                    message: Some(format!("Connected to {} successfully", provider)),
                })
            } else {
                let status = response.status();
                let error_text = response.text().await.unwrap_or_default();
                let error_msg = match status.as_u16() {
                    401 => "Invalid API key".to_string(),
                    403 => "Access forbidden - check API key permissions".to_string(),
                    404 => "Endpoint not found - check base URL".to_string(),
                    429 => "Rate limited - try again later".to_string(),
                    _ => format!("HTTP {}: {}", status, error_text),
                };

                Ok(ConnectionTestResponse {
                    success: false,
                    error: Some(error_msg),
                    message: None,
                })
            }
        }
        Err(error) => {
            let error_msg = if error.is_connect() {
                "Connection failed - check internet or local service availability".to_string()
            } else if error.is_timeout() {
                "Connection timed out".to_string()
            } else {
                error.to_string()
            };

            Ok(ConnectionTestResponse {
                success: false,
                error: Some(error_msg),
                message: None,
            })
        }
    }
}

#[command]
pub async fn ai_complete(
    provider: String,
    endpoint: String,
    headers: HashMap<String, String>,
    body: String,
) -> Result<AICompletionResponse, String> {
    let _ = provider;
    let client = Client::new();

    let mut request_builder = client.post(&endpoint);
    for (key, value) in &headers {
        request_builder = request_builder.header(key, value);
    }

    let response = request_builder
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        Ok(AICompletionResponse {
            success: true,
            data: Some(json),
            error: None,
        })
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Ok(AICompletionResponse {
            success: false,
            data: None,
            error: Some(format!("HTTP {}: {}", status, error_text)),
        })
    }
}

#[command]
pub async fn list_ollama_models(base_url: String) -> Result<Vec<String>, String> {
    let client = Client::new();
    let url = format!("{}/api/tags", normalise_base_url(&base_url));

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned error: {}", response.status()));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let models = json["models"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|model| model["name"].as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    Ok(models)
}

fn get_config_path() -> Result<PathBuf, String> {
    let proj_dirs = ProjectDirs::from("dev", "doomcode", "DoomCode")
        .ok_or_else(|| "Failed to determine config directory".to_string())?;

    let config_dir = proj_dirs.config_dir();
    fs::create_dir_all(config_dir).map_err(|e| e.to_string())?;

    Ok(config_dir.join("ai-config.json"))
}

#[command]
pub async fn save_ai_config(config: serde_json::Value) -> Result<(), String> {
    let path = get_config_path()?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn load_ai_config() -> Result<serde_json::Value, String> {
    let path = get_config_path()?;

    if !path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

#[command]
pub async fn ai_stream_complete(
    app_handle: AppHandle,
    request_id: String,
    endpoint: String,
    headers: HashMap<String, String>,
    body: String,
) -> Result<(), String> {
    mark_request_active(&request_id)?;

    let client = Client::new();
    let mut request_builder = client.post(&endpoint);

    for (key, value) in &headers {
        request_builder = request_builder.header(key, value);
    }

    let response = request_builder
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string());

    let response = match response {
        Ok(value) => value,
        Err(error) => {
            mark_request_inactive(&request_id);
            return Err(error);
        }
    };

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        let _ = app_handle.emit(
            &format!("ai-stream-{}", request_id),
            StreamChunk {
                request_id: request_id.clone(),
                chunk_type: "error".to_string(),
                data: error_text,
            },
        );
        mark_request_inactive(&request_id);
        return Ok(());
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        if !is_active_request(&request_id) {
            break;
        }

        match chunk_result {
            Ok(chunk) => {
                let text = String::from_utf8_lossy(&chunk);
                buffer.push_str(&text);

                while let Some(line_end) = buffer.find('\n') {
                    let line = buffer[..line_end].trim().to_string();
                    buffer = buffer[line_end + 1..].to_string();

                    if !line.starts_with("data: ") {
                        continue;
                    }

                    let data = &line[6..];

                    if data == "[DONE]" {
                        let _ = app_handle.emit(
                            &format!("ai-stream-{}", request_id),
                            StreamChunk {
                                request_id: request_id.clone(),
                                chunk_type: "complete".to_string(),
                                data: String::new(),
                            },
                        );
                        mark_request_inactive(&request_id);
                        return Ok(());
                    }

                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                            let _ = app_handle.emit(
                                &format!("ai-stream-{}", request_id),
                                StreamChunk {
                                    request_id: request_id.clone(),
                                    chunk_type: "chunk".to_string(),
                                    data: content.to_string(),
                                },
                            );
                        } else if let Some(content) = json["choices"][0]["text"].as_str() {
                            let _ = app_handle.emit(
                                &format!("ai-stream-{}", request_id),
                                StreamChunk {
                                    request_id: request_id.clone(),
                                    chunk_type: "chunk".to_string(),
                                    data: content.to_string(),
                                },
                            );
                        }
                    }
                }
            }
            Err(error) => {
                let _ = app_handle.emit(
                    &format!("ai-stream-{}", request_id),
                    StreamChunk {
                        request_id: request_id.clone(),
                        chunk_type: "error".to_string(),
                        data: error.to_string(),
                    },
                );
                mark_request_inactive(&request_id);
                return Ok(());
            }
        }
    }

    let _ = app_handle.emit(
        &format!("ai-stream-{}", request_id),
        StreamChunk {
            request_id: request_id.clone(),
            chunk_type: "complete".to_string(),
            data: String::new(),
        },
    );

    mark_request_inactive(&request_id);
    Ok(())
}

#[command]
pub async fn cancel_ai_request(request_id: String) -> Result<(), String> {
    mark_request_inactive(&request_id);
    Ok(())
}
