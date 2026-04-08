use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use walkdir::WalkDir;

use crate::utils::is_excluded;

const MAX_SCAN_DEPTH: usize = 10;
const MAX_TEXT_FILE_BYTES: u64 = 8 * 1024 * 1024; // 8MB
const BINARY_SNIFF_BYTES: usize = 8192;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub path: String,
    pub line: u32,
    pub column: u32,
    pub line_content: String,
}

#[derive(Clone)]
struct SearchParams {
    directory: String,
    query: String,
    case_sensitive: bool,
    whole_word: bool,
    use_regex: bool,
    include_pattern: Option<String>,
    exclude_pattern: Option<String>,
    max_results: u32,
    token: u64,
}

#[tauri::command]
pub async fn search_in_files(
    directory: String,
    query: String,
    case_sensitive: bool,
    whole_word: bool,
    use_regex: bool,
    include_pattern: Option<String>,
    exclude_pattern: Option<String>,
    max_results: u32,
    search_token: Option<u64>,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<Vec<SearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let token = search_token.unwrap_or_else(|| {
        state
            .latest_search_token
            .fetch_add(1, Ordering::Relaxed)
            .saturating_add(1)
    });
    state.latest_search_token.store(token, Ordering::Relaxed);

    let params = SearchParams {
        directory,
        query,
        case_sensitive,
        whole_word,
        use_regex,
        include_pattern,
        exclude_pattern,
        max_results,
        token,
    };

    let token_state = state.latest_search_token.clone();
    tauri::async_runtime::spawn_blocking(move || search_impl(params, token_state))
        .await
        .map_err(|e| format!("Search worker failed: {}", e))?
}

fn search_impl(params: SearchParams, token_state: Arc<AtomicU64>) -> Result<Vec<SearchResult>, String> {
    let started = Instant::now();
    let results = match search_with_ripgrep(&params) {
        Some(found) => found,
        None => search_with_streaming_fallback(&params, &token_state)?,
    };
    if std::env::var_os("DOOM_CODE_METRICS").is_some() {
        eprintln!(
            "[metrics] search_in_files={}ms results={}",
            started.elapsed().as_millis(),
            results.len()
        );
    }
    Ok(results)
}

fn search_with_ripgrep(params: &SearchParams) -> Option<Vec<SearchResult>> {
    let mut cmd = std::process::Command::new("rg");
    cmd.arg("--json")
        .arg("--line-number")
        .arg("--column")
        .arg("--max-count")
        .arg(params.max_results.to_string());

    if !params.case_sensitive {
        cmd.arg("-i");
    }
    if params.whole_word {
        cmd.arg("-w");
    }
    if !params.use_regex {
        cmd.arg("-F");
    }

    if let Some(include) = params.include_pattern.as_ref() {
        for item in include.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
            cmd.arg("-g").arg(item);
        }
    }
    if let Some(exclude) = params.exclude_pattern.as_ref() {
        for item in exclude.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
            cmd.arg("-g").arg(format!("!{}", item));
        }
    }

    cmd.arg(&params.query).arg(&params.directory);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd.output().ok()?;
    if output.status.code() == Some(1) {
        // ripgrep uses exit code 1 for "no matches found"
        return Some(Vec::new());
    }
    if !output.status.success() && output.stdout.is_empty() {
        return None;
    }

    let mut results = Vec::new();
    for raw_line in String::from_utf8_lossy(&output.stdout).lines() {
        if results.len() >= params.max_results as usize {
            break;
        }

        let json: Value = match serde_json::from_str(raw_line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        if json.get("type").and_then(|t| t.as_str()) != Some("match") {
            continue;
        }

        let data = match json.get("data") {
            Some(d) => d,
            None => continue,
        };
        let path = data
            .get("path")
            .and_then(|p| p.get("text"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let line_number = data
            .get("line_number")
            .and_then(Value::as_u64)
            .unwrap_or(1) as u32;
        let line_content = data
            .get("lines")
            .and_then(|l| l.get("text"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim_end_matches('\n')
            .trim_end_matches('\r')
            .to_string();

        let submatches = data
            .get("submatches")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();

        if submatches.is_empty() {
            results.push(SearchResult {
                path: path.clone(),
                line: line_number,
                column: 1,
                line_content: line_content.clone(),
            });
            continue;
        }

        for sub in submatches {
            if results.len() >= params.max_results as usize {
                break;
            }
            let start = sub.get("start").and_then(Value::as_u64).unwrap_or(0) as u32;
            results.push(SearchResult {
                path: path.clone(),
                line: line_number,
                column: start.saturating_add(1),
                line_content: line_content.clone(),
            });
        }
    }

    Some(results)
}

fn search_with_streaming_fallback(
    params: &SearchParams,
    token_state: &Arc<AtomicU64>,
) -> Result<Vec<SearchResult>, String> {
    let regex = build_pattern(params)?;
    let include_globs: Vec<glob::Pattern> = parse_globs(params.include_pattern.as_deref());
    let exclude_globs: Vec<glob::Pattern> = parse_globs(params.exclude_pattern.as_deref());

    let mut results: Vec<SearchResult> = Vec::new();
    for entry in WalkDir::new(&params.directory)
        .max_depth(MAX_SCAN_DEPTH)
        .into_iter()
        .filter_entry(|e| !is_excluded(&e.file_name().to_string_lossy()))
    {
        if token_state.load(Ordering::Relaxed) != params.token {
            break;
        }
        if results.len() >= params.max_results as usize {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        if entry.file_type().is_dir() {
            continue;
        }

        let file_path = entry.path();
        let file_name = file_path.file_name().unwrap_or_default().to_string_lossy();

        if !include_globs.is_empty() && !include_globs.iter().any(|g| g.matches(&file_name)) {
            continue;
        }
        if exclude_globs.iter().any(|g| g.matches(&file_name)) {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if metadata.len() > MAX_TEXT_FILE_BYTES {
            continue;
        }
        if is_binary_fast(file_path) {
            continue;
        }

        let file = match fs::File::open(file_path) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let reader = BufReader::new(file);

        for (line_idx, line_result) in reader.lines().enumerate() {
            if token_state.load(Ordering::Relaxed) != params.token {
                break;
            }
            if results.len() >= params.max_results as usize {
                break;
            }
            let line = match line_result {
                Ok(l) => l,
                Err(_) => break,
            };
            let clean_line = line.trim_end_matches('\r').to_string();
            for mat in regex.find_iter(&clean_line) {
                if results.len() >= params.max_results as usize {
                    break;
                }
                results.push(SearchResult {
                    path: file_path.to_string_lossy().to_string(),
                    line: (line_idx + 1) as u32,
                    column: (mat.start() + 1) as u32,
                    line_content: clean_line.clone(),
                });
            }
        }
    }

    Ok(results)
}

fn build_pattern(params: &SearchParams) -> Result<Regex, String> {
    let base = if params.use_regex {
        params.query.clone()
    } else {
        regex::escape(&params.query)
    };
    let source = if params.whole_word {
        format!(r"\b(?:{})\b", base)
    } else {
        base
    };
    let full_source = if params.case_sensitive {
        source
    } else {
        format!("(?i){}", source)
    };
    Regex::new(&full_source).map_err(|e| format!("Invalid search pattern: {}", e))
}

fn parse_globs(glob_text: Option<&str>) -> Vec<glob::Pattern> {
    match glob_text {
        Some(raw) => raw
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .filter_map(|item| glob::Pattern::new(item).ok())
            .collect(),
        None => Vec::new(),
    }
}

fn is_binary_fast(path: &Path) -> bool {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return true,
    };

    let mut reader = BufReader::new(file);
    let mut buffer = [0u8; BINARY_SNIFF_BYTES];
    let bytes_read = match reader.read(&mut buffer) {
        Ok(n) => n,
        Err(_) => return true,
    };
    buffer[..bytes_read].iter().any(|&b| b == 0)
}
