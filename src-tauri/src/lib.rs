use rodio::{Decoder, OutputStream, Sink};
use rodio::source::Source;
use lofty::{prelude::*, probe::Probe, tag::ItemKey};
use std::fs::File;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::TrayIconBuilder;
use base64::prelude::*;

// Thread-safe command enum sent to the background audio runner thread
use walkdir::WalkDir;

enum AudioCommand {
    Play(String),
    SetPlayback(bool),
    Seek(f32),
    SetVolume(f32),
}

// Struct to store simple atomic player states
struct PlayerStatus {
    is_playing: bool,
    current_position: f32,
    volume: f32,
    current_track: Option<String>,
    // Instant-based position tracking (accurate even after skip_duration seeks):
    // position = seek_position + play_start.elapsed()
    seek_position: f32,
    play_start: Option<std::time::Instant>,
}

// Core AppState managed by Tauri (fully Send + Sync + 'static)
pub struct AppState {
    sender: Mutex<std::sync::mpsc::Sender<AudioCommand>>,
    status: Arc<Mutex<PlayerStatus>>,
    media_controls: Arc<Mutex<Option<souvlaki::MediaControls>>>,
}

// Track metadata representation
#[derive(serde::Serialize)]
struct TrackMetadata {
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    year: Option<u32>,
    duration: f32,
    lyrics: Option<String>,
    cover_art: Option<String>,
}

// Playback details representation
#[derive(serde::Serialize)]
struct PlaybackStatus {
    is_playing: bool,
    current_position: f32,
    volume: f32,
}

// Custom Source wrapper to intercept real-time PCM amplitudes for 3 bands (Bass, Mids, Highs)
struct VisualizerSource<S> {
    inner: S,
    bass_amp: Arc<Mutex<f32>>,
    mids_amp: Arc<Mutex<f32>>,
    highs_amp: Arc<Mutex<f32>>,
    bass_filter: f32,
    mids_filter: f32,
    count: usize,
    sum_sq_bass: f32,
    sum_sq_mids: f32,
    sum_sq_highs: f32,
}

impl<S> VisualizerSource<S> {
    fn new(inner: S, bass_amp: Arc<Mutex<f32>>, mids_amp: Arc<Mutex<f32>>, highs_amp: Arc<Mutex<f32>>) -> Self {
        Self {
            inner,
            bass_amp,
            mids_amp,
            highs_amp,
            bass_filter: 0.0,
            mids_filter: 0.0,
            count: 0,
            sum_sq_bass: 0.0,
            sum_sq_mids: 0.0,
            sum_sq_highs: 0.0,
        }
    }
}

impl<S> Iterator for VisualizerSource<S>
where
    S: Source<Item = f32>,
{
    type Item = f32;

    fn next(&mut self) -> Option<Self::Item> {
        let sample = self.inner.next()?;
        
        // Lowpass filter 200Hz (cutoff fc = 200Hz, fs = 44100Hz, alpha = 0.028)
        let alpha_bass = 0.028f32;
        self.bass_filter = alpha_bass * sample + (1.0 - alpha_bass) * self.bass_filter;
        let bass_sample = self.bass_filter;
        
        // Highpass filter 4000Hz (cutoff fc = 4000Hz, fs = 44100Hz, alpha = 0.57)
        let alpha_highs = 0.57f32;
        self.mids_filter = alpha_highs * sample + (1.0 - alpha_highs) * self.mids_filter;
        let highs_sample = sample - self.mids_filter; // Highpass = original - lowpass
        
        // Mids = original - bass - highs
        let mids_sample = sample - bass_sample - highs_sample;
        
        self.sum_sq_bass += bass_sample * bass_sample;
        self.sum_sq_mids += mids_sample * mids_sample;
        self.sum_sq_highs += highs_sample * highs_sample;
        
        self.count += 1;
        
        // Every 512 samples (about 11.6ms of audio at 44.1kHz), calculate RMS amplitudes
        if self.count >= 512 {
            let rms_bass = (self.sum_sq_bass / self.count as f32).sqrt();
            let rms_mids = (self.sum_sq_mids / self.count as f32).sqrt();
            let rms_highs = (self.sum_sq_highs / self.count as f32).sqrt();
            
            if let Ok(mut b) = self.bass_amp.lock() {
                *b = *b * 0.35 + rms_bass * 0.65;
            }
            if let Ok(mut m) = self.mids_amp.lock() {
                *m = *m * 0.35 + rms_mids * 0.65;
            }
            if let Ok(mut h) = self.highs_amp.lock() {
                *h = *h * 0.35 + rms_highs * 0.65;
            }
            
            self.count = 0;
            self.sum_sq_bass = 0.0;
            self.sum_sq_mids = 0.0;
            self.sum_sq_highs = 0.0;
        }
        
        Some(sample)
    }
}

impl<S> Source for VisualizerSource<S>
where
    S: Source<Item = f32>,
{
    fn current_frame_len(&self) -> Option<usize> {
        self.inner.current_frame_len()
    }

    fn channels(&self) -> u16 {
        self.inner.channels()
    }

    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    fn total_duration(&self) -> Option<std::time::Duration> {
        self.inner.total_duration()
    }

    fn try_seek(&mut self, pos: std::time::Duration) -> Result<(), rodio::source::SeekError> {
        self.inner.try_seek(pos)
    }
}

// Helper to probe an audio file and extract all tags / cover art
fn extract_metadata(path: &str) -> TrackMetadata {
    let fallback_title = std::path::Path::new(path)
        .file_name()
        .and_then(|s| s.to_str())
        .map(|s| {
            if let Some(idx) = s.rfind('.') {
                s[..idx].to_string()
            } else {
                s.to_string()
            }
        })
        .unwrap_or_else(|| "Unknown Track".to_string());

    let mut metadata = TrackMetadata {
        path: path.to_string(),
        title: Some(fallback_title),
        artist: Some("Unknown Artist".to_string()),
        album: Some("Unknown Album".to_string()),
        year: None,
        duration: 0.0,
        lyrics: None,
        cover_art: None,
    };

    if let Ok(probe) = Probe::open(path) {
        if let Ok(tagged_file) = probe.read() {
            metadata.duration = tagged_file.properties().duration().as_secs_f32();

            if let Some(tag) = tagged_file.primary_tag() {
                if let Some(title) = tag.title() {
                    let title_str = title.trim();
                    if !title_str.is_empty() {
                        metadata.title = Some(title_str.to_string());
                    }
                }
                if let Some(artist) = tag.artist() {
                    let artist_str = artist.trim();
                    if !artist_str.is_empty() {
                        metadata.artist = Some(artist_str.to_string());
                    }
                }
                if let Some(album) = tag.album() {
                    let album_str = album.trim();
                    if !album_str.is_empty() {
                        metadata.album = Some(album_str.to_string());
                    }
                }
                
                metadata.year = tag.year();

                // Get embedded lyrics if present
                metadata.lyrics = tag.get_string(&ItemKey::Lyrics)
                    .map(|s| s.to_string());

                // Get album cover art (APIC/PIC tags)
                for picture in tag.pictures() {
                    let mime_type = picture.mime_type().map(|m| m.as_str()).unwrap_or("image/jpeg");
                    let data = BASE64_STANDARD.encode(picture.data());
                    metadata.cover_art = Some(format!("data:{};base64,{}", mime_type, data));
                    break;
                }
            }
        }
    }

    metadata
}

fn is_audio_file(path: &std::path::Path) -> bool {
    if let Some(ext) = path.extension() {
        if let Some(ext_str) = ext.to_str() {
            let ext_lower = ext_str.to_lowercase();
            return ["mp3", "flac", "wav", "m4a", "aac", "ogg", "alac", "aiff"].contains(&ext_lower.as_str());
        }
    }
    false
}

#[tauri::command]
fn parse_paths(paths: Vec<String>) -> Vec<TrackMetadata> {
    let mut result = Vec::new();
    for path_str in paths {
        let path = std::path::Path::new(&path_str);
        if path.is_file() {
            if is_audio_file(path) {
                result.push(extract_metadata(&path_str));
            }
        } else if path.is_dir() {
            for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() && is_audio_file(entry.path()) {
                    if let Some(p_str) = entry.path().to_str() {
                        result.push(extract_metadata(p_str));
                    }
                }
            }
        }
    }
    result
}

// IPC command: Opens native file dialog for secure local file selection
#[tauri::command]
fn select_audio_files() -> Vec<TrackMetadata> {
    let files = rfd::FileDialog::new()
        .add_filter("Audio Files", &["mp3", "flac", "wav", "m4a", "aac", "ogg", "alac", "aiff"])
        .pick_files();

    let mut paths = Vec::new();
    if let Some(files) = files {
        for file in files {
            if let Some(path_str) = file.to_str() {
                paths.push(path_str.to_string());
            }
        }
    }
    parse_paths(paths)
}

#[tauri::command]
fn select_audio_folders() -> Vec<TrackMetadata> {
    let folders = rfd::FileDialog::new().pick_folders();
    let mut paths = Vec::new();
    if let Some(folders) = folders {
        for folder in folders {
            if let Some(path_str) = folder.to_str() {
                paths.push(path_str.to_string());
            }
        }
    }
    parse_paths(paths)
}

// IPC command: Extract tags for a single file path (used on drag & drop)
#[tauri::command]
fn load_track_metadata(path: String) -> TrackMetadata {
    extract_metadata(&path)
}

// IPC command: Play a specific local file path
#[tauri::command]
fn play_track(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let sender = state.sender.lock().unwrap();
    sender.send(AudioCommand::Play(path))
        .map_err(|e| format!("Failed to send play command: {}", e))?;
    Ok(())
}

// IPC command: Pause / Play toggle
#[tauri::command]
fn set_playback_state(state: State<'_, AppState>, play: bool) -> Result<(), String> {
    let sender = state.sender.lock().unwrap();
    sender.send(AudioCommand::SetPlayback(play))
        .map_err(|e| format!("Failed to send playback command: {}", e))?;
    Ok(())
}

// IPC command: Seek to a position (in seconds)
#[tauri::command]
fn seek_track(state: State<'_, AppState>, seconds: f32) -> Result<(), String> {
    let sender = state.sender.lock().unwrap();
    sender.send(AudioCommand::Seek(seconds))
        .map_err(|e| format!("Failed to send seek command: {}", e))?;
    Ok(())
}

// IPC command: Set player volume (0.0 to 1.0)
#[tauri::command]
fn set_volume(state: State<'_, AppState>, volume: f32) -> Result<(), String> {
    let sender = state.sender.lock().unwrap();
    sender.send(AudioCommand::SetVolume(volume))
        .map_err(|e| format!("Failed to send volume command: {}", e))?;
    Ok(())
}

// IPC command: Fetch the current playback status
#[tauri::command]
fn get_playback_status(state: State<'_, AppState>) -> Result<PlaybackStatus, String> {
    let status = state.status.lock().unwrap();
    Ok(PlaybackStatus {
        is_playing: status.is_playing,
        current_position: status.current_position,
        volume: status.volume,
    })
}

// IPC command: Update macOS control center (souvlaki)
#[tauri::command]
fn update_os_media_state(
    state: State<'_, AppState>,
    title: String,
    artist: String,
    album: String,
    playing: bool,
) -> Result<(), String> {
    use souvlaki::{MediaMetadata, MediaPlayback};
    if let Ok(mut lock) = state.media_controls.lock() {
        if let Some(controls) = lock.as_mut() {
            let _ = controls.set_metadata(MediaMetadata {
                title: Some(&title),
                artist: Some(&artist),
                album: Some(&album),
                ..Default::default()
            });
            let _ = controls.set_playback(if playing { MediaPlayback::Playing { progress: None } } else { MediaPlayback::Paused { progress: None } });
        }
    }
    Ok(())
}

fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let play_i = MenuItemBuilder::with_id("play", "Play / Pausa").build(app)?;
    let next_i = MenuItemBuilder::with_id("next", "Siguiente").build(app)?;
    let prev_i = MenuItemBuilder::with_id("prev", "Anterior").build(app)?;
    let shuffle_i = MenuItemBuilder::with_id("shuffle", "Modo Aleatorio").build(app)?;
    let show_i = MenuItemBuilder::with_id("show", "Mostrar NoblePlayer").build(app)?;
    let quit_i = MenuItemBuilder::with_id("quit", "Salir").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&play_i)
        .item(&next_i)
        .item(&prev_i)
        .separator()
        .item(&shuffle_i)
        .separator()
        .item(&show_i)
        .item(&quit_i)
        .build()?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "play" => { let _ = app.emit("tray-play-pause", ()); }
                "next" => { let _ = app.emit("tray-next", ()); }
                "prev" => { let _ = app.emit("tray-prev", ()); }
                "shuffle" => { let _ = app.emit("tray-shuffle", ()); }
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => { app.exit(0); }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

fn setup_media_controls(app_handle: AppHandle) -> Option<souvlaki::MediaControls> {
    use souvlaki::{MediaControlEvent, MediaControls, PlatformConfig};
    
    #[cfg(target_os = "windows")]
    let hwnd = {
        // Souvlaki needs HWND on Windows, we could extract it from main window if needed.
        // For simplicity, we just use None or skip if not supported.
        None
    };

    let config = PlatformConfig {
        dbus_name: "nobleplayer",
        display_name: "NoblePlayer",
        #[cfg(target_os = "windows")]
        hwnd,
        #[cfg(not(target_os = "windows"))]
        hwnd: None,
    };

    if let Ok(mut controls) = MediaControls::new(config) {
        let ah = app_handle.clone();
        let _ = controls.attach(move |event: MediaControlEvent| {
            match event {
                MediaControlEvent::Play | MediaControlEvent::Pause | MediaControlEvent::Toggle => {
                    let _ = ah.emit("tray-play-pause", ());
                }
                MediaControlEvent::Next => {
                    let _ = ah.emit("tray-next", ());
                }
                MediaControlEvent::Previous => {
                    let _ = ah.emit("tray-prev", ());
                }
                _ => {}
            }
        });
        Some(controls)
    } else {
        None
    }
}

#[tauri::command]
fn set_language(app: tauri::AppHandle, lang: String) {
    let (play, next, prev, shuffle, show, quit) = if lang == "EN" {
        ("Play / Pause", "Next", "Previous", "Shuffle Mode", "Show NoblePlayer", "Quit")
    } else {
        ("Play / Pausa", "Siguiente", "Anterior", "Modo Aleatorio", "Mostrar NoblePlayer", "Salir")
    };

    let play_i = MenuItemBuilder::with_id("play", play).build(&app).unwrap();
    let next_i = MenuItemBuilder::with_id("next", next).build(&app).unwrap();
    let prev_i = MenuItemBuilder::with_id("prev", prev).build(&app).unwrap();
    let shuffle_i = MenuItemBuilder::with_id("shuffle", shuffle).build(&app).unwrap();
    let show_i = MenuItemBuilder::with_id("show", show).build(&app).unwrap();
    let quit_i = MenuItemBuilder::with_id("quit", quit).build(&app).unwrap();

    let menu = MenuBuilder::new(&app)
        .item(&play_i)
        .item(&next_i)
        .item(&prev_i)
        .separator()
        .item(&shuffle_i)
        .separator()
        .item(&show_i)
        .item(&quit_i)
        .build().unwrap();

    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_menu(Some(menu));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Setup message passing channels
    let (tx, rx) = std::sync::mpsc::channel::<AudioCommand>();
    
    // Shared thread-safe status monitor
    let status = Arc::new(Mutex::new(PlayerStatus {
        is_playing: false,
        current_position: 0.0,
        volume: 0.8,
        current_track: None,
        seek_position: 0.0,
        play_start: None,
    }));

    // Share 3-band amplitude values securely across iterator and event thread
    let bass_amp = Arc::new(Mutex::new(0.0f32));
    let mids_amp = Arc::new(Mutex::new(0.0f32));
    let highs_amp = Arc::new(Mutex::new(0.0f32));
    
    let status_clone = status.clone();
    let bass_amp_clone = bass_amp.clone();
    let mids_amp_clone = mids_amp.clone();
    let highs_amp_clone = highs_amp.clone();

    tauri::Builder::default()
        .setup(move |app| {
            setup_tray(app).expect("Failed to setup tray");


            let app_handle = app.handle().clone();
            
            // Setup macOS/Windows native media controls
            let controls = setup_media_controls(app_handle.clone());
            
            // Inject controls into AppState after creation (requires mutability)
            let state = app.state::<AppState>();
            if let Ok(mut lock) = state.media_controls.lock() {
                *lock = controls;
            }
            
            let status_thread = status_clone.clone();
            let bass_amp_thread = bass_amp_clone.clone();
            let mids_amp_thread = mids_amp_clone.clone();
            let highs_amp_thread = highs_amp_clone.clone();
            
            // Spawn dedicated background player worker thread
            std::thread::spawn(move || {
                // Keep non-Send objects strictly scoped inside this thread
                let Ok((_stream, handle)) = OutputStream::try_default() else {
                    eprintln!("Failed to open output stream");
                    return;
                };
                let Ok(sink) = Sink::try_new(&handle) else {
                    eprintln!("Failed to create audio sink");
                    return;
                };
                
                sink.set_volume(1.0);
                
                let mut position_tick = 0;
                loop {
                    // Loop periodically or block on incoming commands (60ms timeout for smooth visuals)
                    match rx.recv_timeout(std::time::Duration::from_millis(60)) {
                        Ok(AudioCommand::Play(path)) => {
                            sink.clear();
                            match File::open(&path) {
                                Ok(file) => {
                                    match Decoder::new(BufReader::new(file)) {
                                        Ok(source) => {
                                            let float_source = source.convert_samples::<f32>();
                                            let viz_source = VisualizerSource::new(
                                                float_source,
                                                bass_amp_thread.clone(),
                                                mids_amp_thread.clone(),
                                                highs_amp_thread.clone(),
                                            );
                                            sink.append(viz_source);
                                            sink.play();
                                            let mut stat = status_thread.lock().unwrap();
                                            stat.is_playing = true;
                                            stat.current_track = Some(path);
                                            stat.current_position = 0.0;
                                            stat.seek_position = 0.0;
                                            stat.play_start = Some(std::time::Instant::now());
                                        }
                                        Err(e) => eprintln!("Failed to decode file: {}", e),
                                    }
                                }
                                Err(e) => eprintln!("Failed to open file: {}", e),
                            }
                        }
                        Ok(AudioCommand::SetPlayback(play)) => {
                            if play {
                                sink.play();
                                let mut stat = status_thread.lock().unwrap();
                                // Resume: start a fresh Instant from the frozen position
                                stat.seek_position = stat.current_position;
                                stat.play_start = Some(std::time::Instant::now());
                                stat.is_playing = true;
                            } else {
                                sink.pause();
                                let mut stat = status_thread.lock().unwrap();
                                // Pause: freeze current_position, clear the timer
                                stat.play_start = None;
                                stat.is_playing = false;
                            }
                        }
                        Ok(AudioCommand::Seek(seconds)) => {
                            // Clear sink, reopen file from disk, use skip_duration to advance
                            // the source to the target position before appending. This is
                            // reliable on all formats (unlike try_seek through custom wrappers).
                            let track_path = {
                                let stat = status_thread.lock().unwrap();
                                stat.current_track.clone()
                            };
                            if let Some(ref path) = track_path {
                                let current_vol = {
                                    let stat = status_thread.lock().unwrap();
                                    stat.volume
                                };
                                sink.clear();
                                if let Ok(file) = File::open(path) {
                                    if let Ok(source) = Decoder::new(BufReader::new(file)) {
                                        let float_source = source.convert_samples::<f32>();
                                        let skip_dur = std::time::Duration::from_secs_f32(seconds.max(0.0));
                                        let seeked = float_source.skip_duration(skip_dur);
                                        let viz_source = VisualizerSource::new(
                                            seeked,
                                            bass_amp_thread.clone(),
                                            mids_amp_thread.clone(),
                                            highs_amp_thread.clone(),
                                        );
                                        sink.append(viz_source);
                                        sink.play();
                                        sink.set_volume(current_vol);
                                    }
                                }
                                // Reset the Instant-based tracker from the new seek point
                                let mut stat = status_thread.lock().unwrap();
                                stat.seek_position = seconds;
                                stat.current_position = seconds;
                                stat.play_start = Some(std::time::Instant::now());
                            }
                        }
                        Ok(AudioCommand::SetVolume(vol)) => {
                            sink.set_volume(vol);
                            let mut stat = status_thread.lock().unwrap();
                            stat.volume = vol;
                        }
                        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                            let mut stat = status_thread.lock().unwrap();
                            if stat.is_playing {
                                if sink.empty() {
                                    // Natural end of track
                                    stat.is_playing = false;
                                    stat.current_track = None;
                                    stat.play_start = None;
                                    let _ = app_handle.emit("track-ended", ());
                                    if let Ok(mut b) = bass_amp_thread.lock() { *b = 0.0; }
                                    if let Ok(mut m) = mids_amp_thread.lock() { *m = 0.0; }
                                    if let Ok(mut h) = highs_amp_thread.lock() { *h = 0.0; }
                                } else {
                                    // Update position using Instant-based tracking.
                                    // This is always accurate after seeks (unlike sink.get_pos
                                    // which resets to 0 when skip_duration is used).
                                    if let Some(start) = stat.play_start {
                                        stat.current_position =
                                            stat.seek_position + start.elapsed().as_secs_f32();
                                    }

                                    // Emit amplitude ~16 Hz (every 60ms tick) containing [bass, mids, highs]
                                    let current_bass = bass_amp_thread.lock().map(|a| *a).unwrap_or(0.0);
                                    let current_mids = mids_amp_thread.lock().map(|a| *a).unwrap_or(0.0);
                                    let current_highs = highs_amp_thread.lock().map(|a| *a).unwrap_or(0.0);
                                    let _ = app_handle.emit("track-amplitude", vec![current_bass, current_mids, current_highs]);

                                    // Emit position ~4 Hz (every 4 ticks = 240ms)
                                    position_tick += 1;
                                    if position_tick >= 4 {
                                        let _ = app_handle.emit("track-position", stat.current_position);
                                        position_tick = 0;
                                    }
                                }
                            }
                        }
                        Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                            break;
                        }
                    }
                }
            });
            Ok(())
        })
        .manage(AppState {
            sender: Mutex::new(tx),
            status: status.clone(),
            media_controls: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            select_audio_files,
            load_track_metadata,
            play_track,
            set_playback_state,
            seek_track,
            set_volume,
            get_playback_status,
            select_audio_folders,
            parse_paths,
            set_language,
            update_os_media_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
