<div align="center">
  <h1>🎵 NoblePlayer</h1>
  <p><b>A modern, lightning-fast local audio player for macOS.</b></p>
  <p><i>Un reproductor de audio local ultrarrápido y elegante para macOS.</i></p>
  <p><b>v1.1.5</b></p>
</div>

<div style="display: flex; gap: 10px; align-items: center;">
  <img src="https://github.com/user-attachments/assets/d6d7ab5f-c91d-4366-921b-e4109d95ef8d" alt="Captura 1" width="24%" />
  <img src="https://github.com/user-attachments/assets/1e4eddec-96e3-4b94-9a85-9481f8bc444f" alt="Captura 2" width="24%" />
  <img src="https://github.com/user-attachments/assets/2d2a457c-111b-4933-9d66-94c9639e3e87" alt="Captura 3" width="24%" />
  <img src="https://github.com/user-attachments/assets/c4f8dee8-dcf0-430a-80f0-a32a5396851f" alt="Captura 4" width="24%" />
</div>

---

## 🎨 Vibecoding

### English
This project was built entirely from scratch through AI-human collaboration using **Antigravity 2.0**. I am not a developer and have zero coding knowledge—I simply had a vision of something I wanted to create, and I was able to fully realize and ship it thanks to this tool.

### Español
Este proyecto fue creado completamente desde cero mediante colaboración humano-IA utilizando **Antigravity 2.0**. No soy desarrollador y no tengo conocimientos de código; simplemente tenía la visión de algo que quería crear, y pude lograrlo y ponerlo en marcha gracias a esta herramienta.

---

## ✨ Features / Características

### English
- **Virtual Playlist Engine** — Buttery-smooth scrolling through 10,000+ songs at up to 120 FPS (ProMotion support).
- **Drag & Drop** — Load files, folders, or reorder your queue dynamically by dragging.
- **Bidirectional Sort** — Sort your playlist A→Z or Z→A with one click.
- **Real-Time Audio Visualizer** — Dynamic 24-bar waveform driven by live PCM amplitude data.
- **Premium Glassmorphic Themes** — Elegant Velvet Obsidian & Gold dark theme, and pristine, high-contrast Pearl Platinum light theme.
- **Dynamic Backdrop Visuals** — Smooth, adaptive radial gradients and premium glassmorphism shadows that transition beautifully to keep the player looking alive and premium.
- **Mac-First UX & Gestures** — Rigid native app shell that blocks default web behaviors (pinch-to-zoom, system shortcuts). Supports macOS media keys and double-click window snapping.
- **Native macOS Integration** — System Control Center, media keys, and system tray menu support.
- **Bilingual** — Full English and Spanish interface options.
- **Zero Bloat** — Single self-contained native app, extremely lightweight with no runtime dependencies.

### Español
- **Motor de Lista Virtual** — Desplazamiento ultrafluido a través de más de 10,000 canciones a hasta 120 FPS (soporte ProMotion).
- **Arrastrar y Soltar** — Carga archivos, carpetas o reordena tu cola de reproducción fácilmente.
- **Ordenación Bidireccional** — Ordena tu lista A→Z o Z→A con un solo clic.
- **Visualizador en Tiempo Real** — Ecualizador dinámico de 24 barras alimentado por amplitudes PCM en vivo.
- **Temas Premium de Alta Gama** — Elegante modo oscuro *Velvet Obsidian & Gold*, y un pulcro modo claro *Pearl Platinum* de alto contraste.
- **Fondo Dinámico Adaptativo** — Gradientes radiales suaves y sombras de superposición con efecto *glassmorphism* que transicionan fluidamente para dar una experiencia visual orgánica y de alta gama.
- **UX y Gestos Optimizados para Mac** — Chasis rígido que bloquea comportamientos web (como zoom de pellizco en trackpad o atajos del navegador). Soporte nativo para teclas de reproducción multimedia y doble clic para maximizar/restaurar.
- **Integración Nativa con macOS** — Soporte completo para Centro de Control, teclas de reproducción del sistema y menú en la barra de herramientas.
- **Bilingüe** — Soporte completo de interfaz en inglés y español.
- **Sin Relleno** — Aplicación nativa auto-contenida, ultraligera y sin dependencias externas de ejecución.

---

## 🚀 Installation / Instalación

### English
1. Open **NoblePlayer_1.1.5_universal.dmg** and drag **NoblePlayer.app** to your **Applications** folder.
2. Right-click the app → **Open** → click **Open** on the Gatekeeper dialog (first time only).
*(Or run `xattr -cr /Applications/NoblePlayer.app` in Terminal to clear the quarantine flag if needed)*

### Español
1. Abre **NoblePlayer_1.1.5_universal.dmg** y arrastra **NoblePlayer.app** a tu carpeta de **Aplicaciones**.
2. Haz clic derecho en la aplicación → **Abrir** → haz clic en **Abrir** en el diálogo de Gatekeeper (solo la primera vez).
*(O ejecuta `xattr -cr /Applications/NoblePlayer.app` en la Terminal para eliminar el flag de cuarentena si es necesario)*

---

## 🛠 Tech Stack / Tecnología

| Layer / Capa | Technology / Tecnología |
|---|---|
| **Backend** | [Rust](https://www.rust-lang.org/) — `rodio` (audio processing), `lofty` (metadata) |
| **Framework** | [Tauri v2](https://tauri.app/) — lightweight native bridge / puente nativo ligero |
| **Frontend** | Vanilla JS, HTML5, CSS3 — zero framework overhead / sin sobrecarga de frameworks |

---

## 💻 Requirements / Requisitos

- **OS:** macOS 10.15 (Catalina) or newer / o más reciente
- **Arch:** Universal Binary (Apple Silicon + Intel)
