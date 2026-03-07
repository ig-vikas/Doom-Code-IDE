use chrono::Local;

pub fn format_timestamp() -> String {
    Local::now().format("%d.%m.%Y %H.%M.%S").to_string()
}

pub fn is_excluded(name: &str) -> bool {
    matches!(
        name,
        ".git" | "node_modules" | "target" | "__pycache__" | ".svn" | ".hg" | ".DS_Store"
    ) || name.ends_with(".exe")
        || name.ends_with(".o")
        || name.ends_with(".obj")
}
