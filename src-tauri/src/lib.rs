mod commands;
mod state;
mod utils;

use state::AppState;
use tauri::{LogicalSize, Manager, Size};

const DEFAULT_WINDOW_WIDTH: f64 = 1200.0;
const DEFAULT_WINDOW_HEIGHT: f64 = 750.0;
const WINDOW_MARGIN: f64 = 48.0;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .manage(AppState::new())
        .setup(|app| {
            // Set the window icon for taskbar/alt-tab on Windows
            if let Some(window) = app.get_webview_window("main") {
                fit_window_to_monitor(&window)?;
                let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
                    .expect("Failed to load app icon");
                let _ = window.set_icon(icon);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File operations
            commands::file_ops::read_file,
            commands::file_ops::write_file,
            commands::file_ops::rename_path,
            commands::file_ops::delete_path,
            commands::file_ops::create_file,
            commands::file_ops::file_exists,
            commands::file_ops::get_file_info,
            // Folder operations
            commands::folder_ops::read_directory,
            commands::folder_ops::create_directory,
            commands::folder_ops::get_directory_snapshot,
            // Build
            commands::build::compile_cpp,
            commands::build::run_executable,
            // Config
            commands::config::load_config,
            commands::config::save_config,
            // Search
            commands::search::search_in_files,
            // Process
            commands::process::kill_running_process,
            // System
            commands::system::get_app_data_dir,
            commands::system::check_compiler,
            commands::system::open_in_file_explorer,
            commands::system::get_current_timestamp,
            commands::system::run_shell_command,
            // AI
            commands::ai::store_api_key,
            commands::ai::get_api_key,
            commands::ai::clear_api_key,
            commands::ai::has_api_key,
            commands::ai::test_ai_connection,
            commands::ai::ai_complete,
            commands::ai::ai_stream_complete,
            commands::ai::cancel_ai_request,
            commands::ai::list_ollama_models,
            commands::ai::save_ai_config,
            commands::ai::load_ai_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Doom Code");
}

fn fit_window_to_monitor(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    if let Some(monitor) = window.current_monitor()? {
        let logical_size = monitor.size().to_logical::<f64>(monitor.scale_factor());
        let width = DEFAULT_WINDOW_WIDTH.min((logical_size.width - WINDOW_MARGIN).max(640.0));
        let height = DEFAULT_WINDOW_HEIGHT.min((logical_size.height - WINDOW_MARGIN).max(480.0));

        window.set_size(Size::Logical(LogicalSize::new(width, height)))?;
    }

    window.center()?;
    Ok(())
}
