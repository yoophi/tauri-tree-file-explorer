use tauri::Manager;

use crate::application::{DirectoryListingPort, FileEntry, HomeDirectoryPort};

pub struct PlatformHomeDirectory<'a> {
    app: &'a tauri::AppHandle,
}

impl<'a> PlatformHomeDirectory<'a> {
    pub fn new(app: &'a tauri::AppHandle) -> Self {
        Self { app }
    }
}

impl HomeDirectoryPort for PlatformHomeDirectory<'_> {
    fn home_dir(&self) -> Result<String, String> {
        self.app
            .path()
            .home_dir()
            .map(|path| path.to_string_lossy().into_owned())
            .map_err(|error| error.to_string())
    }
}

pub struct FsCoreDirectoryListing;

impl DirectoryListingPort for FsCoreDirectoryListing {
    fn list_dir(&self, path: &str, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
        explorer_fs_core::list_dir(path.to_owned(), show_hidden).map(|entries| {
            entries
                .into_iter()
                .map(|entry| FileEntry {
                    name: entry.name,
                    path: entry.path,
                    is_dir: entry.is_dir,
                    size: entry.size,
                    modified_ms: entry.modified_ms,
                })
                .collect()
        })
    }

    fn list_dir_stream(
        &self,
        path: &str,
        show_hidden: bool,
        cancelled: &dyn Fn() -> bool,
        on_entry: &mut dyn FnMut(FileEntry) -> Result<(), String>,
    ) -> Result<(), String> {
        explorer_fs_core::list_dir_stream(path.to_owned(), show_hidden, cancelled, &mut |entry| {
            on_entry(FileEntry {
                name: entry.name,
                path: entry.path,
                is_dir: entry.is_dir,
                size: entry.size,
                modified_ms: entry.modified_ms,
            })
        })
    }
}
