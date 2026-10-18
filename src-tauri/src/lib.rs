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

/// `--format` strings for `log`. `src/lib/git.ts` sends the same ones.
const FILE_LOG_FORMAT: &str = "--format=%x1e%H%x1f%an%x1f%aI%x1f%s";
const GRAPH_LOG_FORMAT: &str = "--format=%H%x1f%P%x1f%an%x1f%aI%x1f%D%x1f%s";

fn digits(s: &str) -> bool {
    !s.is_empty() && s.len() <= 9 && s.bytes().all(|b| b.is_ascii_digit())
}

fn hex(s: &str) -> bool {
    (4..=64).contains(&s.len()) && s.bytes().all(|b| b.is_ascii_hexdigit())
}

/// A path or URL value: not empty, no leading `-` (it would read as a flag), no control characters.
fn plain(s: &str) -> bool {
    !s.is_empty() && !s.starts_with('-') && !s.chars().any(char::is_control)
}

/// The only git invocations the webview may run. Values sit only in fixed positions; anything else, including
/// extra flags such as `--upload-pack=<cmd>` that would run a program, is rejected.
fn allowed(args: &[String]) -> bool {
    let a: Vec<&str> = args.iter().map(String::as_str).collect();
    match a.as_slice() {
        ["status", "--porcelain"]
        | ["rev-parse", "--is-inside-work-tree"]
        | ["add", "-A"]
        | ["commit", "-m", _]
        | ["pull", "--rebase"]
        | ["push"]
        | ["init"]
        | ["remote", "get-url", "origin"]
        | ["push", "-u", "origin", "HEAD"] => true,
        // One file's history, then the whole graph; a page of `count` entries after skipping `skip`.
        ["log", "--follow", "--name-status", FILE_LOG_FORMAT, "-n", count, "--skip", skip, "--", path] => digits(count) && digits(skip) && plain(path),
        ["log", "--all", GRAPH_LOG_FORMAT, "-n", count, "--skip", skip] => digits(count) && digits(skip),
        // A file as of a commit, and the files one commit changed.
        ["show", spec] => spec.split_once(':').is_some_and(|(hash, path)| hex(hash) && plain(path)),
        ["show", "--name-status", "--format=", hash] => hex(hash),
        // `::` would select a transport helper such as `ext::`, which runs a program.
        ["remote", "add", "origin", url] => plain(url) && !url.contains("::"),
        _ => false,
    }
}

/// Opens the Git for Windows download page in the default browser. The URL is fixed: the webview picks nothing.
#[tauri::command]
fn open_git_download() -> Result<(), String> {
    const URL: &str = "https://git-scm.com/download/win";
    let program = if cfg!(windows) { "explorer" } else if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
    Command::new(program).arg(URL).spawn().map(|_| ()).map_err(|e| e.to_string())
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
        .invoke_handler(tauri::generate_handler![allow_vault, git, open_git_download])
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

    const FILE: &str = "--format=%x1e%H%x1f%an%x1f%aI%x1f%s";
    const GRAPH: &str = "--format=%H%x1f%P%x1f%an%x1f%aI%x1f%D%x1f%s";

    #[test]
    fn accepts_the_v3_shapes() {
        assert!(ok(&["log", "--follow", "--name-status", FILE, "-n", "50", "--skip", "0", "--", "a/b c.md"]));
        assert!(ok(&["log", "--all", GRAPH, "-n", "100", "--skip", "200"]));
        assert!(ok(&["show", "abcdef0:notes/a.md"]));
        assert!(ok(&["show", "--name-status", "--format=", "ABCDEF0123"]));
        assert!(ok(&["init"]));
        assert!(ok(&["remote", "add", "origin", "https://github.com/me/notes.git"]));
        assert!(ok(&["remote", "add", "origin", "git@github.com:me/notes.git"]));
        assert!(ok(&["remote", "get-url", "origin"]));
        assert!(ok(&["push", "-u", "origin", "HEAD"]));
    }

    #[test]
    fn rejects_flags_in_value_positions_and_bad_values() {
        assert!(!ok(&["log", "--follow", FILE, "-n", "5", "--skip", "0", "--", "a.md"])); // --name-status is part of the shape
        // other formats, non-numbers, flag-like paths, extra arguments
        assert!(!ok(&["log", "--follow", "--name-status", "--format=%H", "-n", "5", "--skip", "0", "--", "a.md"]));
        assert!(!ok(&["log", "--follow", "--name-status", FILE, "-n", "--output=x", "--skip", "0", "--", "a.md"]));
        assert!(!ok(&["log", "--follow", "--name-status", FILE, "-n", "5", "--skip", "-1", "--", "a.md"]));
        assert!(!ok(&["log", "--follow", "--name-status", FILE, "-n", "5", "--skip", "0", "--", "--all"]));
        assert!(!ok(&["log", "--follow", "--name-status", FILE, "-n", "5", "--skip", "0", "--", "a.md", "b.md"]));
        assert!(!ok(&["log", "--all", GRAPH, "-n", "5", "--skip", "0", "--", "a.md"]));
        assert!(!ok(&["log", "--all", GRAPH, "-n", "5"]));
        assert!(!ok(&["show", "--output=x"]));
        assert!(!ok(&["show", "HEAD:a.md"])); // not hex
        assert!(!ok(&["show", "xyz1234:a.md"]));
        assert!(!ok(&["show", "abcdef0:-x"]));
        assert!(!ok(&["show", "abcdef0"]));
        assert!(!ok(&["show", "abcdef0:a.md", "b"]));
        assert!(!ok(&["show", "--name-status", "--format=", "HEAD"]));
        assert!(!ok(&["show", "--name-status", "--format=", "abcdef0", "-p"]));
        assert!(!ok(&["remote", "add", "origin", "--mirror"]));
        assert!(!ok(&["remote", "add", "origin", "ext::sh -c calc"]));
        assert!(!ok(&["remote", "add", "upstream", "https://x"]));
        assert!(!ok(&["remote", "add", "origin", "https://x", "y"]));
        assert!(!ok(&["remote", "get-url", "--all", "origin"]));
        assert!(!ok(&["remote", "remove", "origin"]));
        assert!(!ok(&["init", "--template=x"]));
        assert!(!ok(&["push", "-u", "origin", "HEAD", "--force"]));
        assert!(!ok(&["push", "-u", "evil", "HEAD"]));
        assert!(!ok(&["push", "--force"]));
    }
}
