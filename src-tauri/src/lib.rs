use std::fs;
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified_ms: Option<u64>,
}

/// Absolute path of the user's home directory, used as the explorer root.
#[tauri::command]
fn home_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .home_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())
}

/// Non-recursive listing of a directory, directories first, name-sorted.
#[tauri::command]
fn list_dir(path: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let mut entries: Vec<FileEntry> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if !show_hidden && name.starts_with('.') {
                return None;
            }
            // Symlink-aware: a symlink to a directory is browsable as one.
            let metadata = entry.metadata().ok()?;
            let resolved = if metadata.is_symlink() {
                fs::metadata(entry.path()).ok()?
            } else {
                metadata
            };
            Some(FileEntry {
                path: entry.path().to_string_lossy().into_owned(),
                is_dir: resolved.is_dir(),
                size: if resolved.is_dir() { 0 } else { resolved.len() },
                modified_ms: resolved
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64),
                name,
            })
        })
        .collect();

    entries.sort_by_cached_key(|e| (!e.is_dir, e.name.to_lowercase()));
    Ok(entries)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![home_dir, list_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
