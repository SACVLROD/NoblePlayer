// Core Javascript Controller for NoblePlayer
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

// ── i18n (Internationalization) ───────────────
const translations = {
  ES: {
    titleDefault: "Carga tu música",
    artistDefault: "Arrastra archivos aquí o abre la playlist",
    playlistTitle: "Lista de reproducción",
    searchPlaceholder: "Buscar artista, canción...",
    btnSongs: "Canciones",
    btnFolder: "Carpeta",
    btnClear: "Limpiar",
    emptyQueue: "Arrastra tus archivos de música o pulsa \"Canciones\" o \"Carpeta\" para comenzar.",
    tooltipLang: "Cambiar idioma",
    tooltipTheme: "Cambiar tema",
    tooltipPlaylist: "Lista de reproducción",
    tooltipShuffle: "Aleatorio",
    tooltipPrev: "Anterior",
    tooltipPlay: "Reproducir",
    tooltipNext: "Siguiente",
    tooltipRepeat: "Repetir",
    tooltipMute: "Silenciar",
    tooltipPause: "Pausar",
    repeatOff: "Repetir: Apagado",
    repeatAll: "Repetir: Todo",
    repeatOne: "Repetir: Una canción",
    tooltipSortAZ: "Ordenar A-Z",
    tooltipSortZA: "Ordenar Z-A",
    tooltipClose: "Cerrar",
    tooltipAddFiles: "Añadir canciones",
    tooltipAddFolder: "Añadir carpeta",
    tooltipRemove: "Eliminar de la lista",
    tooltipClear: "Limpiar lista"
  },
  EN: {
    titleDefault: "Load your music",
    artistDefault: "Drag files here or open the playlist",
    playlistTitle: "Playlist",
    searchPlaceholder: "Search artist, song...",
    btnSongs: "Songs",
    btnFolder: "Folder",
    btnClear: "Clear",
    emptyQueue: "Drag your music files or click \"Songs\" or \"Folder\" to start.",
    tooltipLang: "Switch language",
    tooltipTheme: "Toggle theme",
    tooltipPlaylist: "Playlist",
    tooltipShuffle: "Shuffle",
    tooltipPrev: "Previous",
    tooltipPlay: "Play",
    tooltipNext: "Next",
    tooltipRepeat: "Repeat",
    tooltipMute: "Mute",
    tooltipPause: "Pause",
    repeatOff: "Repeat: Off",
    repeatAll: "Repeat: All",
    repeatOne: "Repeat: One song",
    tooltipSortAZ: "Sort A-Z",
    tooltipSortZA: "Sort Z-A",
    tooltipClose: "Close",
    tooltipAddFiles: "Add songs",
    tooltipAddFolder: "Add folder",
    tooltipRemove: "Remove from list",
    tooltipClear: "Clear list"
  }
};
let currentLang = "ES";

function setLanguage(lang) {
  currentLang = lang;
  document.getElementById("toggle-lang").textContent = lang;
  
  const dict = translations[lang];
  
  // Update inner text
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      if (key.startsWith("tooltip")) {
        el.title = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // Update placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.placeholder = dict[key];
  });
  
  // Update default text if no track is playing
  if (currentIndex === -1) {
    document.getElementById("song-title").textContent = dict.titleDefault;
    document.getElementById("song-artist").textContent = dict.artistDefault;
  }

  // Update dynamic tooltips based on state
  updatePlayStateUI();
  updateRepeatUI();

  // Tell Rust to update the tray menu
  invoke("set_language", { lang: lang }).catch(console.error);
}

// ─────────────────────────────────────────────
// Application State
// ─────────────────────────────────────────────
let playlist = [];
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let shuffleQueue = [];
let shuffleIndex = -1;
let repeatMode = 0; // 0 = off, 1 = repeat all, 2 = repeat one
let volume = 1.0;
let previousVolume = 1.0;
let isDraggingVolume = false;
let currentPosition = 0;
let userDraggingTimeline = false;
let currentAmplitude = [0, 0, 0];
let themeMode = "dark"; // "dark" | "light"

// Virtual List & Drag State
const ITEM_HEIGHT = 52;
let filteredPlaylist = [];
let sortDirection = null; // null | "asc" | "desc"
let dragStartIndex = -1;
let dragCurrentIndex = -1;
let isDraggingQueueItem = false;
let dragElement = null;
let dragStartY = 0;
let dragStartScroll = 0;

// ─────────────────────────────────────────────
// DOM Element References
// ─────────────────────────────────────────────
let albumArtEl, artPlaceholderEl, artContainerEl;
let songTitleEl, songArtistEl, songAlbumYearEl;
let timeCurrentEl, timeTotalEl;
let seekWrapperEl, seekProgressEl, seekThumbEl;
let btnShuffleEl, btnPrevEl, btnPlayPauseEl, playIconEl, pauseIconEl;
let btnNextEl, btnRepeatEl, repeatBadgeEl;
let btnVolumeToggleEl, volumeHighIconEl, volumeMutedIconEl;
let volumeWrapperEl, volumeProgressEl, volumeThumbEl;
let playlistPanelEl, queueListEl, queueEmptyStateEl, playlistSearchEl;
let visualizerEl;
let btnThemeEl, iconMoonEl, iconSunEl;

// ─────────────────────────────────────────────
// Default Palettes aligned with Concept F Brand
// ─────────────────────────────────────────────
const defaultDarkTheme  = { bg1: "#16151a", bg2: "#0b0a0d", accent: "#ffb300", glow: "rgba(255, 179, 0, 0.25)" };
const defaultLightTheme = { bg1: "#fcfcfd", bg2: "#f3f4f6", accent: "#d97706", glow: "rgba(217, 119, 6, 0.16)" };




// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  cacheDOM();
  setupEventListeners();
  setupTauriListeners();
  applyTheme(defaultDarkTheme.bg1, defaultDarkTheme.bg2, defaultDarkTheme.accent, defaultDarkTheme.glow);
  syncVolumeUI();
  setLanguage("ES");
  startVisualizerLoop();
  setupGlobalShortcuts();
});

// ─────────────────────────────────────────────
// Cache DOM
// ─────────────────────────────────────────────
function cacheDOM() {
  albumArtEl       = document.getElementById("album-art");
  artPlaceholderEl = document.getElementById("art-placeholder");
  artContainerEl   = document.getElementById("art-container");
  songTitleEl      = document.getElementById("song-title");
  songArtistEl     = document.getElementById("song-artist");
  songAlbumYearEl  = document.getElementById("song-album-year");

  timeCurrentEl  = document.getElementById("time-current");
  timeTotalEl    = document.getElementById("time-total");
  seekWrapperEl  = document.getElementById("seek-bar-container");
  seekProgressEl = document.getElementById("seek-progress");
  seekThumbEl    = document.getElementById("seek-thumb");

  btnShuffleEl    = document.getElementById("btn-shuffle");
  btnPrevEl       = document.getElementById("btn-prev");
  btnPlayPauseEl  = document.getElementById("btn-play-pause");
  playIconEl      = document.getElementById("play-icon");
  pauseIconEl     = document.getElementById("pause-icon");
  btnNextEl       = document.getElementById("btn-next");
  btnRepeatEl     = document.getElementById("btn-repeat");
  repeatBadgeEl   = document.getElementById("repeat-badge");

  btnVolumeToggleEl = document.getElementById("btn-volume-toggle");
  volumeHighIconEl  = document.getElementById("volume-high");
  volumeMutedIconEl = document.getElementById("volume-muted");
  volumeWrapperEl   = document.getElementById("volume-bar-container");
  volumeProgressEl  = document.getElementById("volume-progress");
  volumeThumbEl     = document.getElementById("volume-thumb");

  playlistPanelEl   = document.getElementById("playlist-panel");
  queueListEl       = document.getElementById("queue-list");
  queueEmptyStateEl = document.getElementById("queue-empty-state");
  playlistSearchEl  = document.getElementById("playlist-search");
  visualizerEl      = document.getElementById("visualizer");

  btnThemeEl = document.getElementById("toggle-theme");
  iconMoonEl = document.getElementById("icon-moon");
  iconSunEl  = document.getElementById("icon-sun");

}
// ─────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────
function setupEventListeners() {
  // Disable default browser context menu globally to make it feel 100% like a native app
  document.addEventListener("contextmenu", (e) => {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  });

  // Block text selection initiation globally (except on inputs and textareas)
  document.addEventListener("selectstart", (e) => {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  });

  // Block default HTML5 drag events globally (e.g. dragging images/links showing ghost icons)
  document.addEventListener("dragstart", (e) => {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  });

  // Prevent trackpad pinch-to-zoom (WebKit translates pinch gesture to wheel event + Ctrl key)
  document.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent proprietary WebKit pinch-to-zoom gestures
  document.addEventListener("gesturestart", (e) => {
    e.preventDefault();
  });
  document.addEventListener("gesturechange", (e) => {
    e.preventDefault();
  });

  // Block browser-specific web shortcuts (Cmd/Ctrl + R/F/P) to preserve rigid native app shell
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    if (modifier) {
      const key = e.key.toLowerCase();
      if (key === 'r' || key === 'f' || key === 'p') {
        e.preventDefault();
      }
    }
  });

  // ── Theme toggle ──────────────────────────────
  btnThemeEl.addEventListener("click", toggleTheme);

  document.getElementById("toggle-lang").addEventListener("click", () => {
    const newLang = currentLang === "ES" ? "EN" : "ES";
    setLanguage(newLang);
  });

  // ── Intelligent window snapping & restore handling ────────────────────────
  let resizeTimeout;
  window.addEventListener("resize", async () => {
    try {
      const appWindow = window.__TAURI__.window.getCurrentWindow();
      
      let isFull = false;
      try {
        isFull = await appWindow.isFullscreen();
      } catch (err) {
        console.warn("Could not check if window is fullscreen:", err);
      }
      
      if (isFull) {
        // In fullscreen, remove minSize constraints so it can expand to fill the screen
        try {
          const minSize = window.__TAURI__?.dpi?.LogicalSize
            ? new window.__TAURI__.dpi.LogicalSize(100, 100)
            : { type: 'Logical', data: { width: 100, height: 100 } };
          await appWindow.setMinSize(minSize);
        } catch (err) {
          console.warn("Could not set minimum window size in fullscreen:", err);
        }
      } else {
        // When exiting fullscreen, re-enforce the 420x740 minSize
        const size = window.__TAURI__?.dpi?.LogicalSize
          ? new window.__TAURI__.dpi.LogicalSize(420, 740)
          : { type: 'Logical', data: { width: 420, height: 740 } };
        
        try {
          await appWindow.setMinSize(size);
        } catch (err) {
          console.warn("Could not set minimum window size in windowed mode:", err);
        }
        
        // Defer size check to wait for native window manager animations/tiling transitions to finish
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
          try {
            let isFullNow = false;
            try {
              isFullNow = await appWindow.isFullscreen();
            } catch (err) {
              console.warn("Could not check isFullscreen inside deferred callback:", err);
            }
            if (isFullNow) return;

            let scaleFactor = 1.0;
            try {
              scaleFactor = await appWindow.scaleFactor() || 1.0;
            } catch (err) {
              console.warn("Could not check scaleFactor:", err);
            }

            let physicalSize = { width: 0, height: 0 };
            try {
              physicalSize = await appWindow.innerSize();
            } catch (err) {
              console.warn("Could not check innerSize:", err);
            }

            const logicalWidth = Math.round(physicalSize.width / scaleFactor);
            const logicalHeight = Math.round(physicalSize.height / scaleFactor);
            
            if (logicalWidth !== 420 || logicalHeight !== 740) {
              let isMax = false;
              try {
                isMax = await appWindow.isMaximized();
              } catch (err) {
                console.warn("Could not check if window is maximized:", err);
              }

              if (isMax) {
                try {
                  await appWindow.unmaximize();
                } catch (err) {
                  console.warn("Could not unmaximize window:", err);
                }
              }

              try {
                await appWindow.setSize(size);
              } catch (err) {
                console.warn("Could not set window size back to 420x740:", err);
              }
            }
          } catch (err) {
            console.warn("Deferred resize snapping failed:", err);
          }
        }, 150);
      }
    } catch (err) {
      console.warn("Resize handling error:", err);
    }

    // Always re-render the virtual queue list whenever the window size changes so the scroll bounds adapt.
    renderQueue();
  });

  // ── Playlist panel toggle ─────────────────────────────
  document.getElementById("toggle-playlist").addEventListener("click", () => {
    const isOpen = playlistPanelEl.classList.contains("open");
    if (!isOpen) {
      playlistPanelEl.classList.add("open");
      renderQueue();
    } else {
      playlistPanelEl.classList.remove("open");
    }
  });

  document.getElementById("close-playlist").addEventListener("click", () => {
    playlistPanelEl.classList.remove("open");
  });

  // ── File Import ───────────────────────────────
  document.getElementById("btn-add-files").addEventListener("click", triggerFileSelection);
  document.getElementById("btn-add-folder").addEventListener("click", async () => {
    try {
      const tracks = await invoke("select_audio_folders");
      if (tracks && tracks.length > 0) {
        addTracks(tracks);
      }
    } catch (err) {
      console.error("Failed to add folder:", err);
    }
  });
  document.getElementById("btn-clear-queue").addEventListener("click", clearQueue);

  // ── Search & Sort ─────────────────────────────
  playlistSearchEl.addEventListener("input", renderQueue);
  document.getElementById("btn-sort-playlist").addEventListener("click", toggleSortPlaylist);

  const playlistItemsWrapper = document.querySelector(".playlist-items-wrapper");
  if (playlistItemsWrapper) {
    playlistItemsWrapper.addEventListener("scroll", updateVirtualList);
  }

  // ── Playback Controls ─────────────────────────
  btnPlayPauseEl.addEventListener("click", togglePlayPause);
  btnNextEl.addEventListener("click", () => nextTrack(true));
  btnPrevEl.addEventListener("click", prevTrack);
  btnShuffleEl.addEventListener("click", toggleShuffle);
  btnRepeatEl.addEventListener("click", toggleRepeat);

  // ── SEEK TIMELINE  ────────────────────────────
  // Strategy:
  //   mousedown → immediately seek + begin drag
  //   mousemove → update UI preview while dragging
  //   mouseup   → final seek position confirmed
  //
  // We call invoke("seek_track") on BOTH mousedown and mouseup
  // so a plain click (no drag) still triggers the seek.

  function getSeekPercent(clientX) {
    const rect = seekWrapperEl.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function applySeekUI(percent) {
    const duration = currentIndex >= 0 ? playlist[currentIndex].duration : 0;
    if (duration > 0) {
      const secs = percent * duration;
      seekProgressEl.style.width = `${percent * 100}%`;
      if (seekThumbEl) seekThumbEl.style.left = `${percent * 100}%`;
      timeCurrentEl.textContent = formatTime(secs);
      return secs;
    }
    return 0;
  }

  seekWrapperEl.addEventListener("mousedown", async (e) => {
    e.preventDefault();
    userDraggingTimeline = true;

    const percent = getSeekPercent(e.clientX);
    const secs = applySeekUI(percent);

    // Immediate seek on click down — this is the fix for plain clicks
    if (secs > 0 || percent === 0) {
      try { await invoke("seek_track", { seconds: secs }); }
      catch (err) { console.error("Seek failed:", err); }
    }

    const onMouseMove = (moveEvt) => {
      const p = getSeekPercent(moveEvt.clientX);
      applySeekUI(p);
    };

    const onMouseUp = async (upEvt) => {
      userDraggingTimeline = false;
      const p = getSeekPercent(upEvt.clientX);
      const finalSecs = applySeekUI(p);
      try { await invoke("seek_track", { seconds: finalSecs }); }
      catch (err) { console.error("Seek failed:", err); }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // ── VOLUME SLIDER ─────────────────────────────
  function getVolumePercent(clientX) {
    const rect = volumeWrapperEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  }

  volumeWrapperEl.addEventListener("mousedown", (e) => {
    isDraggingVolume = true;
    volume = getVolumePercent(e.clientX);
    if (volume > 0) previousVolume = volume;
    syncVolumeUI();
    invoke("set_volume", { volume });
  });

  document.addEventListener("mousemove", (moveEvt) => {
    if (isDraggingVolume) {
      volume = getVolumePercent(moveEvt.clientX);
      if (volume > 0) previousVolume = volume;
      syncVolumeUI();
      invoke("set_volume", { volume });
    }
  });

  document.addEventListener("mouseup", () => {
    isDraggingVolume = false;
  });

  btnVolumeToggleEl.addEventListener("click", () => {
    if (volume > 0) {
      previousVolume = volume;
      volume = 0;
    } else {
      volume = previousVolume > 0 ? previousVolume : 1.0;
    }
    syncVolumeUI();
    invoke("set_volume", { volume });
  });

  // ── Keyboard Shortcuts ───────
  document.addEventListener("keydown", (e) => {
    // Ignore events originating from inputs (e.g. search bar)
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    // We only care about these specific keys
    if (["MediaPlayPause", "MediaNextTrack", "MediaPrevTrack"].includes(e.key)) {
      e.preventDefault(); // Prevent page scroll or default OS actions when focused
    } else {
      return;
    }

    if (e.key === "MediaPlayPause") {
      togglePlayPause();
    } else if (e.key === "MediaNextTrack") {
      nextTrack(true);
    } else if (e.key === "MediaPrevTrack") {
      prevTrack();
    }
  });

  // ── Window drag / double-click maximize ───────
  const playerMainEl = document.querySelector(".player-main");
  if (playerMainEl) {
    playerMainEl.addEventListener("mousedown", (e) => {
      // Ignore drags originating from buttons, sliders, interactive containers, or playlist items
      if (
        e.target.closest(".icon-btn") ||
        e.target.closest("button") ||
        e.target.closest(".slider-wrapper") ||
        e.target.closest(".slider-thumb") ||
        e.target.closest(".track-item")
      ) return;

      const isClickInDragBar = e.target.closest(".drag-bar");
      
      // Only dragging starting in the header drag-bar is allowed.
      if (isClickInDragBar) {
        if (e.buttons === 1) {
          try {
            const appWindow = window.__TAURI__.window.getCurrentWindow();
            if (e.detail === 2) {
              appWindow.toggleMaximize();
            } else {
              appWindow.startDragging();
            }
          } catch (err) {
            console.error("Window drag/maximize failed:", err);
          }
        }
      }
    });
  }
}

// ─────────────────────────────────────────────
// Theme Toggle
// ─────────────────────────────────────────────
function toggleTheme() {
  // Cycle theme modes: dark -> light -> dark
  if (themeMode === "dark") {
    themeMode = "light";
  } else {
    themeMode = "dark";
  }

  // Update body classes
  document.body.classList.remove("light-mode");
  if (themeMode === "light") {
    document.body.classList.add("light-mode");
  }

  // Update icons visibility
  iconMoonEl.classList.add("hidden");
  iconSunEl.classList.add("hidden");

  if (themeMode === "dark") {
    iconMoonEl.classList.remove("hidden");
    btnThemeEl.classList.remove("theme-active");
  } else if (themeMode === "light") {
    iconSunEl.classList.remove("hidden");
    btnThemeEl.classList.add("theme-active");
  }
  let theme = defaultDarkTheme;
  if (themeMode === "light") {
    theme = defaultLightTheme;
  }
  applyTheme(theme.bg1, theme.bg2, theme.accent, theme.glow);
}



// ─────────────────────────────────────────────
// Tauri Event Listeners
// ─────────────────────────────────────────────
function setupTauriListeners() {

  // Track position (4 FPS from Rust)
  listen("track-position", (event) => {
    if (!userDraggingTimeline && isPlaying) {
      currentPosition = event.payload;
      const duration = currentIndex >= 0 ? playlist[currentIndex].duration : 0;
      updateTimelineUI(currentPosition, duration);
    }
  });

  // Amplitude (16 FPS from Rust)
  listen("track-amplitude", (event) => {
    if (isPlaying) {
      currentAmplitude = event.payload;
    }
  });

  // Natural track end
  listen("track-ended", () => { nextTrack(false); });

  // Tray menu events
  listen("tray-play-pause", togglePlayPause);
  listen("tray-next", () => nextTrack(true));
  listen("tray-prev", prevTrack);
  listen("tray-shuffle", toggleShuffle);

  // Drag-and-drop files or folders
  listen("tauri://drag-drop", async (event) => {
    const paths = event.payload.paths;
    if (!paths || paths.length === 0) return;

    try {
      // Let Rust parse both files and folders recursively
      const loaded = await invoke("parse_paths", { paths: paths });
      if (loaded && loaded.length > 0) {
        addTracks(loaded);
      }
    } catch (err) {
      console.error("Error reading dropped paths:", err);
    }
  });
}

// ─────────────────────────────────────────────
// File Selection
// ─────────────────────────────────────────────
async function triggerFileSelection() {
  try {
    const tracks = await invoke("select_audio_files");
    if (tracks && tracks.length > 0) addTracks(tracks);
  } catch (err) {
    console.error("File selection failed:", err);
  }
}

// ─────────────────────────────────────────────
// Playlist Management
// ─────────────────────────────────────────────
function addTracks(tracks) {
  const startPlaying = playlist.length === 0;
  playlist = [...playlist, ...tracks];
  renderQueue();
  if (startPlaying) playTrackAtIndex(0);
  if (isShuffle) generateShuffleQueue();
}

async function togglePlayPause() {
  if (playlist.length === 0) { triggerFileSelection(); return; }
  if (currentIndex === -1) { playTrackAtIndex(0); return; }

  isPlaying = !isPlaying;
  try {
    await invoke("set_playback_state", { play: isPlaying });
    updatePlayStateUI();
  } catch (err) {
    console.error("Failed to alter play state:", err);
    isPlaying = !isPlaying;
  }
}

async function playTrackAtIndex(index) {
  if (index < 0 || index >= playlist.length) return;
  try {
    await invoke("play_track", { path: playlist[index].path });
    currentIndex = index;
    isPlaying = true;
    currentPosition = 0;

    if (isShuffle) shuffleIndex = shuffleQueue.indexOf(index);

    updateMetadataUI(playlist[index]);
    updatePlayStateUI();
    renderQueue();

    setTimeout(() => {
      // Only scroll to the active item if the playlist panel is already visible.
      // Calling scrollIntoView on a hidden drawer element causes WebKit to try
      // to reveal it, which unintentionally triggers the slide-in CSS transition.
      if (playlistPanelEl && playlistPanelEl.classList.contains("open")) {
        const activeEl = document.querySelector(".queue-item.active");
        if (activeEl) activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 150);
  } catch (err) {
    console.error("Playback failed:", err);
    nextTrack(false);
  }
}

function nextTrack(triggeredByUser = false) {
  if (playlist.length === 0) return;
  if (repeatMode === 2 && !triggeredByUser) { playTrackAtIndex(currentIndex); return; }

  if (isShuffle && shuffleQueue.length > 0) {
    shuffleIndex++;
    if (shuffleIndex >= shuffleQueue.length) {
      generateShuffleQueue(); 
      shuffleIndex = 0; 
      playTrackAtIndex(shuffleQueue[0]);
    } else {
      playTrackAtIndex(shuffleQueue[shuffleIndex]);
    }
  } else {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= playlist.length) {
      playTrackAtIndex(0);
    } else {
      playTrackAtIndex(nextIdx);
    }
  }
}

function prevTrack() {
  if (playlist.length === 0 || currentIndex === -1) return;

  if (currentPosition > 3.0) {
    invoke("seek_track", { seconds: 0.0 });
    currentPosition = 0;
    updateTimelineUI(0, playlist[currentIndex].duration);
    return;
  }

  if (isShuffle && shuffleQueue.length > 0) {
    shuffleIndex = Math.max(0, shuffleIndex - 1);
    playTrackAtIndex(shuffleQueue[shuffleIndex]);
  } else {
    const prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      playTrackAtIndex(playlist.length - 1);
    } else {
      playTrackAtIndex(prevIdx);
    }
  }
}

function stopPlayback() {
  isPlaying = false;
  currentIndex = -1;
  shuffleIndex = -1;
  currentPosition = 0;
  updatePlayStateUI();
  resetMetadataUI();
  updateTimelineUI(0, 0);
  let theme = defaultDarkTheme;
  if (themeMode === "light") {
    theme = defaultLightTheme;
  }
  applyTheme(theme.bg1, theme.bg2, theme.accent, theme.glow);
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  btnShuffleEl.classList.toggle("active", isShuffle);
  if (isShuffle && playlist.length > 0) generateShuffleQueue();
}

function generateShuffleQueue() {
  let indices = Array.from({ length: playlist.length }, (_, i) => i);
  if (currentIndex >= 0) indices = indices.filter(i => i !== currentIndex);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  shuffleQueue = currentIndex >= 0 ? [currentIndex, ...indices] : indices;
  shuffleIndex = currentIndex >= 0 ? 0 : -1;
}

function updateRepeatUI() {
  const dict = translations[currentLang];
  if (repeatMode === 0) {
    btnRepeatEl.classList.remove("active");
    repeatBadgeEl.classList.add("hidden");
    btnRepeatEl.title = dict.repeatOff;
  } else if (repeatMode === 1) {
    btnRepeatEl.classList.add("active");
    repeatBadgeEl.classList.add("hidden");
    btnRepeatEl.title = dict.repeatAll;
  } else {
    btnRepeatEl.classList.add("active");
    repeatBadgeEl.classList.remove("hidden");
    btnRepeatEl.title = dict.repeatOne;
  }
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  updateRepeatUI();
}

async function clearQueue() {
  playlist = [];
  sortDirection = null;
  const arrowEl = document.getElementById("sort-arrow");
  if (arrowEl) arrowEl.setAttribute("points", "15 15 19 19 23 15");
  const btnSort = document.getElementById("btn-sort-playlist");
  if (btnSort) {
    btnSort.setAttribute("data-i18n", "tooltipSortAZ");
    btnSort.title = translations[currentLang].tooltipSortAZ;
  }
  stopPlayback();
  renderQueue();
  try { await invoke("set_playback_state", { play: false }); } catch(e) {}
}

function removeTrack(e, index) {
  e.stopPropagation();
  const wasPlaying = currentIndex === index;
  playlist.splice(index, 1);

  if (playlist.length === 0) { clearQueue(); return; }

  if (wasPlaying) {
    playTrackAtIndex(index >= playlist.length ? playlist.length - 1 : index);
  } else if (currentIndex > index) {
    currentIndex--;
  }

  if (isShuffle) generateShuffleQueue();
  renderQueue();
}

function toggleSortPlaylist() {
  if (playlist.length <= 1) return;

  const btnSort = document.getElementById("btn-sort-playlist");
  const arrowEl = document.getElementById("sort-arrow");

  // Toggle sort direction
  if (sortDirection === "asc") {
    sortDirection = "desc";
    btnSort.setAttribute("data-i18n", "tooltipSortZA");
    btnSort.title = translations[currentLang].tooltipSortZA;
    // Set arrow pointing UP: points="15 9 19 5 23 9"
    if (arrowEl) arrowEl.setAttribute("points", "15 9 19 5 23 9");
  } else {
    sortDirection = "asc";
    btnSort.setAttribute("data-i18n", "tooltipSortAZ");
    btnSort.title = translations[currentLang].tooltipSortAZ;
    // Set arrow pointing DOWN: points="15 15 19 19 23 15"
    if (arrowEl) arrowEl.setAttribute("points", "15 15 19 19 23 15");
  }

  // Perform sorting on the master playlist
  const currentTrack = playlist[currentIndex];
  
  playlist.sort((a, b) => {
    const titleA = (a.title || "").trim().toLowerCase();
    const titleB = (b.title || "").trim().toLowerCase();
    
    if (sortDirection === "asc") {
      return titleA.localeCompare(titleB, undefined, { sensitivity: 'base', numeric: true });
    } else {
      return titleB.localeCompare(titleA, undefined, { sensitivity: 'base', numeric: true });
    }
  });

  // Keep track of the currently playing index
  if (currentTrack) {
    currentIndex = playlist.indexOf(currentTrack);
  }

  // Re-generate shuffle queue if active
  if (isShuffle) generateShuffleQueue();

  // Re-render the queue
  renderQueue();
}

// ─────────────────────────────────────────────
// Queue Render (Virtualized & Drag-enabled)
// ─────────────────────────────────────────────
function renderQueue() {
  const query = playlistSearchEl.value.trim().toLowerCase();
  
  if (playlist.length === 0) {
    queueEmptyStateEl.classList.remove("hidden");
    queueListEl.innerHTML = "";
    queueListEl.style.height = "0px";
    filteredPlaylist = [];
    return;
  }
  queueEmptyStateEl.classList.add("hidden");

  // Rebuild filtered playlist containing index and track
  filteredPlaylist = [];
  playlist.forEach((track, originalIndex) => {
    const matchesTitle  = track.title  && track.title.toLowerCase().includes(query);
    const matchesArtist = track.artist && track.artist.toLowerCase().includes(query);
    const matchesAlbum  = track.album  && track.album.toLowerCase().includes(query);

    if (!query || matchesTitle || matchesArtist || matchesAlbum) {
      filteredPlaylist.push({ track, originalIndex });
    }
  });

  // Set total container height for scrolling
  queueListEl.style.height = `${filteredPlaylist.length * ITEM_HEIGHT}px`;
  
  // Render the visible portion
  updateVirtualList();
}

function updateVirtualList() {
  if (isDraggingQueueItem) return; // Let drag logic handle positioning

  const wrapper = document.querySelector(".playlist-items-wrapper");
  if (!wrapper) return;

  const scrollTop = wrapper.scrollTop;
  const viewportHeight = wrapper.clientHeight;
  
  // Calculate which items should be visible (add buffer)
  const buffer = 4;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - buffer);
  const endIndex = Math.min(filteredPlaylist.length - 1, Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + buffer);

  queueListEl.innerHTML = "";
  
  for (let i = startIndex; i <= endIndex; i++) {
    const { track, originalIndex } = filteredPlaylist[i];
    const li = createQueueItem(track, originalIndex, i);
    
    // Position absolutely
    li.style.top = `${i * ITEM_HEIGHT}px`;
    
    queueListEl.appendChild(li);
  }
}

function createQueueItem(track, originalIndex, visualIndex) {
  const li = document.createElement("li");
  li.className = `queue-item ${originalIndex === currentIndex ? "active" : ""}`;
  li.dataset.originalIndex = originalIndex;
  li.dataset.visualIndex = visualIndex;

  let imgHTML = `<img src="placeholder.png" alt="Miniatura" />`;
  if (track.cover_art) imgHTML = `<img src="${track.cover_art}" alt="Miniatura" />`;

  const safeTitle = escapeHTML(track.title || "Unknown Title");
  const safeArtist = escapeHTML(track.artist || "Unknown Artist");

  li.innerHTML = `
    <div class="queue-item-left">
      <div class="queue-thumb">${imgHTML}</div>
      <div class="queue-item-info">
        <span class="queue-title">${safeTitle}</span>
        <span class="queue-artist">${safeArtist}</span>
      </div>
    </div>
    <div class="queue-item-right">
      <span class="queue-duration">${formatTime(track.duration)}</span>
      <button class="btn-remove-track" title="${translations[currentLang].tooltipRemove}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  // Prevent drag initiation if clicking the remove button
  const btnRemove = li.querySelector(".btn-remove-track");
  btnRemove.addEventListener("mousedown", e => e.stopPropagation());
  btnRemove.addEventListener("click", e => removeTrack(e, originalIndex));

  // Drag and play handlers
  li.addEventListener("mousedown", handleDragStart);
  
  return li;
}

function handleDragStart(e) {
  // If user is searching, disable drag & drop to prevent confusing state
  if (playlistSearchEl.value.trim() !== "") {
    playTrackAtIndex(parseInt(e.currentTarget.dataset.originalIndex));
    return;
  }

  // Left click only
  if (e.button !== 0) return;

  isDraggingQueueItem = true;
  dragElement = e.currentTarget;
  dragElement.classList.add("dragging");
  
  dragStartIndex = parseInt(dragElement.dataset.visualIndex);
  dragCurrentIndex = dragStartIndex;
  dragStartY = e.clientY;
  
  const wrapper = document.querySelector(".playlist-items-wrapper");
  dragStartScroll = wrapper.scrollTop;

  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
}

function handleDragMove(e) {
  if (!isDraggingQueueItem) return;
  e.preventDefault();

  const wrapper = document.querySelector(".playlist-items-wrapper");
  const currentScroll = wrapper.scrollTop;
  const scrollDiff = currentScroll - dragStartScroll;
  
  const yDiff = e.clientY - dragStartY + scrollDiff;
  const newTop = (dragStartIndex * ITEM_HEIGHT) + yDiff;
  
  // Boundary constraints
  const maxTop = (filteredPlaylist.length - 1) * ITEM_HEIGHT;
  const boundedTop = Math.max(0, Math.min(newTop, maxTop));
  
  dragElement.style.top = `${boundedTop}px`;

  // Calculate new index
  const newVisualIndex = Math.round(boundedTop / ITEM_HEIGHT);
  
  if (newVisualIndex !== dragCurrentIndex && newVisualIndex >= 0 && newVisualIndex < filteredPlaylist.length) {
    dragCurrentIndex = newVisualIndex;
    
    // Visually shift other items to make room
    const items = queueListEl.children;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === dragElement) continue;
      
      const idx = parseInt(item.dataset.visualIndex);
      let shiftedTop = idx * ITEM_HEIGHT;
      
      if (dragStartIndex < dragCurrentIndex && idx > dragStartIndex && idx <= dragCurrentIndex) {
        shiftedTop -= ITEM_HEIGHT;
      } else if (dragStartIndex > dragCurrentIndex && idx < dragStartIndex && idx >= dragCurrentIndex) {
        shiftedTop += ITEM_HEIGHT;
      }
      
      item.style.top = `${shiftedTop}px`;
    }
  }
}

function handleDragEnd(e) {
  if (!isDraggingQueueItem) return;
  isDraggingQueueItem = false;
  
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
  
  dragElement.classList.remove("dragging");

  // If didn't move much, treat as a click to play
  if (dragStartIndex === dragCurrentIndex) {
    playTrackAtIndex(parseInt(dragElement.dataset.originalIndex));
    renderQueue();
    return;
  }

  // Update underlying array
  const trackToMove = playlist.splice(dragStartIndex, 1)[0];
  playlist.splice(dragCurrentIndex, 0, trackToMove);

  // Update currentIndex if affected
  if (currentIndex === dragStartIndex) {
    currentIndex = dragCurrentIndex;
  } else if (currentIndex > dragStartIndex && currentIndex <= dragCurrentIndex) {
    currentIndex--;
  } else if (currentIndex < dragStartIndex && currentIndex >= dragCurrentIndex) {
    currentIndex++;
  }

  // Re-generate shuffle queue if active
  if (isShuffle) generateShuffleQueue();

  renderQueue();
}

// ─────────────────────────────────────────────
// UI State Updaters
// ─────────────────────────────────────────────
function syncOsMediaState() {
  if (currentIndex === -1 || playlist.length === 0) return;
  const track = playlist[currentIndex];
  const title = track.title || track.name || track.path.split('/').pop() || "Desconocido";
  const artist = track.artist || "Desconocido";
  const album = track.album || "";
  
  // Send state to Rust backend
  try {
    invoke("update_os_media_state", {
      title,
      artist,
      album,
      playing: isPlaying
    });
  } catch (err) {
    console.warn("Failed to sync OS media state:", err);
  }
}

function updatePlayStateUI() {
  const dict = translations[currentLang];
  if (isPlaying) {
    playIconEl.classList.add("hidden");
    pauseIconEl.classList.remove("hidden");
    artContainerEl.querySelector(".album-art-wrapper").classList.add("playing");
    btnPlayPauseEl.title = dict.tooltipPause;
  } else {
    playIconEl.classList.remove("hidden");
    pauseIconEl.classList.add("hidden");
    artContainerEl.querySelector(".album-art-wrapper").classList.remove("playing");
    currentAmplitude = [0, 0, 0];
    btnPlayPauseEl.title = dict.tooltipPlay;
  }
  syncOsMediaState();
}

function updateMetadataUI(track) {
  songTitleEl.textContent = track.title || "Unknown Title";
  songArtistEl.textContent = track.artist || "Unknown Artist";

  let details = track.album || "";
  if (track.year) details += details ? ` • ${track.year}` : `${track.year}`;
  songAlbumYearEl.textContent = details;

  if (track.cover_art) {
    albumArtEl.src = track.cover_art;
    albumArtEl.classList.remove("hidden");
    artPlaceholderEl.classList.add("hidden");
  } else {
    albumArtEl.src = "placeholder.png";
    albumArtEl.classList.remove("hidden");
    artPlaceholderEl.classList.add("hidden");
  }

  // Always keep fixed app colors aligned with dark/light mode
  let theme = defaultDarkTheme;
  if (themeMode === "light") {
    theme = defaultLightTheme;
  }
  applyTheme(theme.bg1, theme.bg2, theme.accent, theme.glow);

  checkTitleMarquee();
}

function resetMetadataUI() {
  songTitleEl.textContent = translations[currentLang].titleDefault;
  songArtistEl.textContent = translations[currentLang].artistDefault;
  songAlbumYearEl.textContent = "";

  albumArtEl.src = "placeholder.png";
  albumArtEl.classList.remove("hidden");
  artPlaceholderEl.classList.add("hidden");

  document.querySelector(".title-scroller").classList.remove("overflow");
  if (visualizerEl) visualizerEl.classList.remove("playing");
}

function updateTimelineUI(elapsed, duration) {
  timeCurrentEl.textContent = formatTime(elapsed);
  timeTotalEl.textContent   = formatTime(duration);
  const percent = duration > 0 ? (elapsed / duration) * 100 : 0;
  seekProgressEl.style.width = `${percent}%`;
  if (seekThumbEl) seekThumbEl.style.left = `${percent}%`;
}

function syncVolumeUI() {
  volumeProgressEl.style.width = `${volume * 100}%`;
  if (volumeThumbEl) volumeThumbEl.style.left = `${volume * 100}%`;
  volumeHighIconEl.classList.toggle("hidden", volume === 0);
  volumeMutedIconEl.classList.toggle("hidden", volume > 0);
}

function checkTitleMarquee() {
  const container = document.querySelector(".title-scroller");
  const h1 = document.querySelector("#song-title");
  container.classList.remove("overflow");
  h1.style.animation = "none";
  if (h1.scrollWidth > container.clientWidth) {
    container.classList.add("overflow");
    h1.style.animation = "";
  }
}

window.addEventListener("resize", checkTitleMarquee);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatTime(secs) {
  if (isNaN(secs) || secs === null || secs < 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function applyTheme(bg1, bg2, accent, glow) {
  const root = document.documentElement.style;
  root.setProperty("--bg-color-1",   bg1);
  root.setProperty("--bg-color-2",   bg2);
  root.setProperty("--drawer-bg",    bg2);
  root.setProperty("--accent-color", accent);
  root.setProperty("--accent-glow",  glow);
}



// ─────────────────────────────────────────────
// Audio Wave Visualizer (real-time RMS bars)
// ─────────────────────────────────────────────
let visualizerAnimationId = null;
const barCurrentHeights = Array(24).fill(6);

function startVisualizerLoop() {
  if (visualizerAnimationId) return;

  function renderFrame() {
    const bars = document.querySelectorAll("#visualizer .bar");
    if (bars.length === 0) {
      visualizerAnimationId = requestAnimationFrame(renderFrame);
      return;
    }

    // Safely extract [bass, mids, highs]
    let bass = 0, mids = 0, highs = 0;
    if (Array.isArray(currentAmplitude)) {
      bass = Math.min(1.0, (currentAmplitude[0] || 0) * 3.4);
      mids = Math.min(1.0, (currentAmplitude[1] || 0) * 3.2);
      highs = Math.min(1.0, (currentAmplitude[2] || 0) * 2.8);
    } else {
      const val = Math.min(1.0, (currentAmplitude || 0) * 2.8);
      bass = val; mids = val; highs = val;
    }

    bars.forEach((bar, index) => {
      const mid = (bars.length - 1) / 2;
      const distFromCenter = Math.abs(index - mid);
      const bellFactor = Math.max(0.2, 1.0 - (distFromCenter / mid) * 0.8);
      
      // Dynamic time-based ripple propagation for an organic feel
      const timeFactor = Date.now() * 0.0035;
      const ripple = 0.85 + 0.15 * Math.sin(index * 0.7 + timeFactor);
      
      // Determine frequency band based on index
      let amp = mids;
      if (index < 8) {
        amp = bass; // Left 8 bars are Bass
      } else if (index >= 16) {
        amp = highs; // Right 8 bars are Highs
      }

      let targetHeight = 6.0;
      if (isPlaying && amp > 0.01) {
        targetHeight = 6.0 + amp * 32.0 * bellFactor * ripple;
        // Subtly inject dynamic frequency jitter
        targetHeight += (Math.sin(Date.now() * 0.01 + index) * 1.5);
      }

      // Smooth liquid interpolation
      let currentHeight = barCurrentHeights[index] || 6;
      currentHeight = currentHeight * 0.76 + targetHeight * 0.24;
      barCurrentHeights[index] = currentHeight;

      bar.style.height = `${Math.max(6, Math.min(38, currentHeight))}px`;
    });

    visualizerAnimationId = requestAnimationFrame(renderFrame);
  }

  visualizerAnimationId = requestAnimationFrame(renderFrame);
}

async function setupGlobalShortcuts() {
  try {
    const gs = window.__TAURI__.globalShortcut;
    if (!gs) return;
    
    // Clean up and unregister any previously active custom global hotkeys
    try { await gs.unregister('CommandOrControl+Alt+Space'); } catch(e) {}
    try { await gs.unregister('CommandOrControl+Alt+Right'); } catch(e) {}
    try { await gs.unregister('CommandOrControl+Alt+Left'); } catch(e) {}
    
    console.log("Global shortcuts cleaned up successfully.");
  } catch (err) {
    console.warn("Could not clean up global hotkeys:", err);
  }
}

