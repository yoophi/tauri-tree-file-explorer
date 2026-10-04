use serde::Serialize;

/// The app's IPC shape, independent of the filesystem implementation.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_ms: Option<u64>,
}

pub trait HomeDirectoryPort {
    fn home_dir(&self) -> Result<String, String>;
}

pub trait DirectoryListingPort {
    fn list_dir(&self, path: &str, show_hidden: bool) -> Result<Vec<FileEntry>, String>;
    fn list_dir_stream(
        &self,
        path: &str,
        show_hidden: bool,
        cancelled: &dyn Fn() -> bool,
        on_entry: &mut dyn FnMut(FileEntry) -> Result<(), String>,
    ) -> Result<(), String>;
}

pub fn home_dir(source: &impl HomeDirectoryPort) -> Result<String, String> {
    source.home_dir()
}

pub fn list_dir(
    source: &impl DirectoryListingPort,
    path: &str,
    show_hidden: bool,
) -> Result<Vec<FileEntry>, String> {
    source.list_dir(path, show_hidden)
}

pub fn list_dir_stream(
    source: &impl DirectoryListingPort,
    path: &str,
    show_hidden: bool,
    cancelled: &dyn Fn() -> bool,
    on_entry: &mut dyn FnMut(FileEntry) -> Result<(), String>,
) -> Result<(), String> {
    source.list_dir_stream(path, show_hidden, cancelled, on_entry)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;
    use std::sync::Mutex;

    struct FakeHome(Result<String, String>);

    impl HomeDirectoryPort for FakeHome {
        fn home_dir(&self) -> Result<String, String> {
            self.0.clone()
        }
    }

    struct FakeListing {
        calls: Mutex<Vec<(String, bool)>>,
        result: Result<Vec<FileEntry>, String>,
    }

    impl DirectoryListingPort for FakeListing {
        fn list_dir(&self, path: &str, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
            self.calls.lock().unwrap().push((path.into(), show_hidden));
            self.result.clone()
        }

        fn list_dir_stream(
            &self,
            path: &str,
            show_hidden: bool,
            cancelled: &dyn Fn() -> bool,
            on_entry: &mut dyn FnMut(FileEntry) -> Result<(), String>,
        ) -> Result<(), String> {
            self.calls.lock().unwrap().push((path.into(), show_hidden));
            for entry in self.result.clone()? {
                if cancelled() {
                    return Err("cancelled".into());
                }
                on_entry(entry)?;
            }
            Ok(())
        }
    }

    #[test]
    fn home_directory_returns_port_value_and_error() {
        assert_eq!(
            home_dir(&FakeHome(Ok("/home/user".into()))),
            Ok("/home/user".into())
        );
        assert_eq!(
            home_dir(&FakeHome(Err("unavailable".into()))),
            Err("unavailable".into())
        );
    }

    #[test]
    fn listing_forwards_path_and_hidden_choice() {
        let entry = FileEntry {
            name: ".private".into(),
            path: "/home/user/.private".into(),
            is_dir: true,
            size: 0,
            modified_ms: None,
        };
        let fake = FakeListing {
            calls: Mutex::new(Vec::new()),
            result: Ok(vec![entry.clone()]),
        };
        assert_eq!(list_dir(&fake, "/home/user", true), Ok(vec![entry]));
        assert_eq!(
            *fake.calls.lock().unwrap(),
            vec![("/home/user".into(), true)]
        );
    }

    #[test]
    fn listing_preserves_port_error_and_false_hidden_choice() {
        let fake = FakeListing {
            calls: Mutex::new(Vec::new()),
            result: Err("permission denied".into()),
        };
        assert_eq!(
            list_dir(&fake, "/blocked", false),
            Err("permission denied".into())
        );
        assert_eq!(
            *fake.calls.lock().unwrap(),
            vec![("/blocked".into(), false)]
        );
    }

    #[test]
    fn file_entry_keeps_the_existing_camel_case_ipc_fields() {
        let entry = FileEntry {
            name: "photo.jpg".into(),
            path: "/home/user/photo.jpg".into(),
            is_dir: false,
            size: 42,
            modified_ms: Some(1234),
        };
        assert_eq!(
            serde_json::to_value(entry).unwrap(),
            serde_json::json!({
                "name": "photo.jpg",
                "path": "/home/user/photo.jpg",
                "isDir": false,
                "size": 42,
                "modifiedMs": 1234
            })
        );
    }

    #[test]
    fn streaming_forwards_hidden_and_stops_on_cancellation_or_sink_error() {
        let entry = FileEntry {
            name: "a".into(),
            path: "/a".into(),
            is_dir: true,
            size: 0,
            modified_ms: None,
        };
        let fake = FakeListing {
            calls: Mutex::new(Vec::new()),
            result: Ok(vec![entry.clone(), entry]),
        };
        let seen = Cell::new(0);
        let result = list_dir_stream(&fake, "/", true, &|| seen.get() > 0, &mut |_| {
            seen.set(seen.get() + 1);
            Ok(())
        });
        assert_eq!(result, Err("cancelled".into()));
        assert_eq!(seen.get(), 1);
        assert_eq!(*fake.calls.lock().unwrap(), vec![("/".into(), true)]);

        let result = list_dir_stream(&fake, "/", false, &|| false, &mut |_| {
            Err("emit failed".into())
        });
        assert_eq!(result, Err("emit failed".into()));
        assert_eq!(
            fake.calls.lock().unwrap().last(),
            Some(&("/".into(), false))
        );
    }
}
