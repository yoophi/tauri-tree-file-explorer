mod application;
mod outbound;

use explorer_scan_job::{ScanRegistry, TerminalState};
use serde::Serialize;
use tauri::Emitter;

const DIRECTORY_SCAN_EVENT: &str = "directory-scan";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryScanEvent {
    scan_id: String,
    #[serde(flatten)]
    result: DirectoryScanResult,
}

#[derive(Clone, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
enum DirectoryScanResult {
    Item { item: application::FileEntry },
    Completed,
    Cancelled,
    Failed { error: String },
}

/// Absolute path of the user's home directory, used as the explorer root.
#[tauri::command]
fn home_dir(app: tauri::AppHandle) -> Result<String, String> {
    application::home_dir(&outbound::PlatformHomeDirectory::new(&app))
}

/// Non-recursive listing of a directory, directories first, name-sorted.
#[tauri::command]
async fn list_dir(path: String, show_hidden: bool) -> Result<Vec<application::FileEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        application::list_dir(&outbound::FsCoreDirectoryListing, &path, show_hidden)
    })
    .await
    .map_err(|error| format!("Directory listing task failed: {error}"))?
}

#[tauri::command]
fn cancel_list_dir_stream(scan_id: String, scans: tauri::State<'_, ScanRegistry>) {
    scans.cancel(&scan_id);
}

/// Acknowledge registration immediately; the blocking worker emits items and
/// one terminal event after traversal, cancellation, emission failure, or panic.
#[tauri::command]
fn list_dir_stream(
    app: tauri::AppHandle,
    scans: tauri::State<'_, ScanRegistry>,
    path: String,
    show_hidden: bool,
    scan_id: String,
) -> Result<(), String> {
    let guard = scans
        .register(scan_id.clone())
        .map_err(|_| "Directory scan already running".to_string())?;
    let cancelled = guard.token();
    tauri::async_runtime::spawn(async move {
        let worker_app = app.clone();
        let worker_id = scan_id.clone();
        let result = tauri::async_runtime::spawn_blocking(move || {
            application::list_dir_stream(
                &outbound::FsCoreDirectoryListing,
                &path,
                show_hidden,
                &|| cancelled.is_cancelled(),
                &mut |item| {
                    worker_app
                        .emit(
                            DIRECTORY_SCAN_EVENT,
                            DirectoryScanEvent {
                                scan_id: worker_id.clone(),
                                result: DirectoryScanResult::Item { item },
                            },
                        )
                        .map_err(|error| format!("Directory entry event failed: {error}"))
                },
            )
        })
        .await
        .map_err(|error| format!("Directory listing task failed: {error}"))
        .and_then(|result| result);

        let terminal = match guard.finish(&result) {
            TerminalState::Completed => DirectoryScanResult::Completed,
            TerminalState::Cancelled => DirectoryScanResult::Cancelled,
            TerminalState::Failed => DirectoryScanResult::Failed {
                error: result
                    .err()
                    .unwrap_or_else(|| "Directory listing failed".into()),
            },
        };
        if let Err(error) = app.emit(
            DIRECTORY_SCAN_EVENT,
            DirectoryScanEvent {
                scan_id,
                result: terminal,
            },
        ) {
            eprintln!("Directory terminal event failed: {error}");
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ScanRegistry::default())
        .invoke_handler(tauri::generate_handler![
            home_dir,
            list_dir,
            list_dir_stream,
            cancel_list_dir_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn directory_events_keep_scan_client_shape() {
        let item = DirectoryScanEvent {
            scan_id: "scan-1".into(),
            result: DirectoryScanResult::Item {
                item: application::FileEntry {
                    name: "a".into(),
                    path: "/a".into(),
                    is_dir: true,
                    size: 0,
                    modified_ms: None,
                },
            },
        };
        assert_eq!(
            serde_json::to_value(item).unwrap(),
            serde_json::json!({
                "scanId": "scan-1", "status": "item",
                "item": { "name": "a", "path": "/a", "isDir": true,
                          "size": 0, "modifiedMs": null }
            })
        );
        let failed = DirectoryScanEvent {
            scan_id: "scan-1".into(),
            result: DirectoryScanResult::Failed {
                error: "denied".into(),
            },
        };
        assert_eq!(
            serde_json::to_value(failed).unwrap(),
            serde_json::json!({"scanId": "scan-1", "status": "failed", "error": "denied"})
        );
    }
}
