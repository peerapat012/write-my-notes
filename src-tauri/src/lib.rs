use std::{path::PathBuf, process::Command, sync::Mutex};
use tauri::State;
use tauri_plugin_fs::FsExt;

/// The notes folder the user picked (or reopened on start). Git always runs here.
#[derive(Default)]
struct Vault(Mutex<Option<PathBuf>>);

/// Lets the webview read and write inside the notes folder, and points git at it.
/// No other path is ever in the fs scope.
#[tauri::command]
fn allow_vault(app: tauri::AppHandle, vault: State<Vault>, path: String) -> Result<(), String> {
    app.fs_scope().allow_directory(&path, true).map_err(|e| e.to_string())?;
    *vault.0.lock().unwrap() = Some(PathBuf::from(path));
    Ok(())
}

#[derive(serde::Serialize)]
struct GitOutput {
    code: i32,
    stdout: String,
    stderr: String,
}

/// The only git invocations the webview may run. Anything else, including extra flags such as
/// `--upload-pack=<cmd>` that would run a program, is rejected.
fn allowed(args: &[String]) -> bool {
    let a: Vec<&str> = args.iter().map(String::as_str).collect();
    matches!(
        a.as_slice(),
        ["status", "--porcelain"]
            | ["rev-parse", "--is-inside-work-tree"]
            | ["add", "-A"]
            | ["commit", "-m", _]
            | ["pull", "--rebase"]
            | ["push"]
    )
}

/// Runs the system `git` in the notes folder and returns its exit code, stdout and stderr.
#[tauri::command]
async fn git(vault: State<'_, Vault>, args: Vec<String>) -> Result<GitOutput, String> {
    if !allowed(&args) {
        return Err(format!("git {} is not allowed", args.first().map(String::as_str).unwrap_or("")));
    }
    let dir = vault.0.lock().unwrap().clone().ok_or("No notes folder is open")?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new("git");
        // No prompt on a missing credential: fail with git's message instead of hanging.
        cmd.args(&args).current_dir(dir).env("GIT_TERMINAL_PROMPT", "0");
        #[cfg(windows)]
        std::os::windows::process::CommandExt::creation_flags(&mut cmd, 0x0800_0000); // CREATE_NO_WINDOW
        match cmd.output() {
            Ok(o) => Ok(GitOutput {
                code: o.status.code().unwrap_or(-1),
                stdout: String::from_utf8_lossy(&o.stdout).into_owned(),
                stderr: String::from_utf8_lossy(&o.stderr).into_owned(),
            }),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Err("git not found".into()),
            Err(e) => Err(e.to_string()),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Vault::default())
        .invoke_handler(tauri::generate_handler![allow_vault, git])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::allowed;

    fn ok(args: &[&str]) -> bool {
        allowed(&args.iter().map(|s| s.to_string()).collect::<Vec<_>>())
    }

    #[test]
    fn allows_only_the_known_invocations() {
        assert!(ok(&["status", "--porcelain"]));
        assert!(ok(&["commit", "-m", "--amend"])); // a message, not a flag
        assert!(ok(&["pull", "--rebase"]));
        assert!(!ok(&["log"]));
        assert!(!ok(&["pull", "--upload-pack=calc"]));
        assert!(!ok(&["-c", "core.sshCommand=calc", "push"]));
        assert!(!ok(&["commit", "-m", "a", "--amend"]));
        assert!(!ok(&[]));
    }
}
