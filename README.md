<div align="center">
  <h1>🎵 NoblePlayer</h1>
  <p><b>A modern, lightning-fast, and elegantly designed local audio player for macOS.</b></p>
  <p><i>Un reproductor de audio local para macOS moderno, ultrarrápido y con un diseño elegante.</i></p>
  <p><b>Version 1.1.1 (Universal Release)</b></p>
</div>

<p align="center">
  <img src="https://github.com/user-attachments/assets/bfb85676-51f4-4013-8837-2842a3b1b682" width="22%" alt="Información Personal" />
  <img src="https://github.com/user-attachments/assets/559d8162-dfe9-4581-a135-70504d0af7fb" width="22%" alt="Mis Turnos" />
  <img src="https://github.com/user-attachments/assets/e217d3f3-96cc-4cfc-adc8-ad9cc7583f7e" width="22%" alt="Detalles del Turno" />
  <img src="https://github.com/user-attachments/assets/d15a9d0c-2fe8-446b-9264-4add5a769858" width="22%" alt="Crear Nuevo Turno" />
</p>

---

## 🇺🇸 English

### What is NoblePlayer?
NoblePlayer is a beautifully crafted local music player designed specifically for macOS. Built with a focus on high-performance and a premium aesthetic, it offers a seamless experience for users who want to enjoy their offline music collection without the bloat of modern streaming apps.

### 🎨 The Story Behind NoblePlayer (Vibecoding)
This project is a true testament to the power of **Vibecoding** and AI-human collaboration. I am not a professional developer—just a person with a creative vision, a set of design goals, and a dream of a premium music player. 

The entire codebase, architecture, and technical implementation were built from scratch by **Antigravity** (designed by Google DeepMind), translating my visual ideas and functional guidance into a high-performance, native application. It proves that today, with a clear design direction and a powerful AI partner, anyone can bring their software dreams to life!

### ✨ Features
*   **Virtual Playlist Engine:** Capable of loading and scrolling through 10,000+ songs at a buttery-smooth 60FPS without consuming excess memory.
*   **Bi-directional Alphabetical Sort [New]:** Sort your playlist ascending (A-Z) and descending (Z-A) dynamically with an elegant glassmorphic toggle button that updates arrow directions in real-time. It seamlessly tracks active playback to avoid skips or timeline resets and regenerates shuffle queues automatically.
*   **Rigid Native Shell (Anti-Web Leakage) [New]:** Engineered with absolute protection against web view leaking to deliver a 100% native feel:
    *   **Context Menu Blocker:** Global right-click/two-finger click intercept blocking default browser options, preserving native clipboard actions exclusively inside inputs.
    *   **Drag Blocker:** Disables HTML5 drag overlays on art, titles, and text, preventing ugly transparent "ghost image" web behaviors.
    *   **Pinch-to-Zoom Prevention:** Full blockage of trackpad multi-touch pinch gestures and Apple-proprietary Safari gesture events.
    *   **Caret & Selection Protection:** Disables mouse selections and I-beam cursors globally on non-interactive elements, using a transparent selection fallback.
    *   **Browser Hotkeys Block:** Intercepts and blocks web hotkeys (`Cmd+R` reload, `Cmd+F` search, `Cmd+P` print) to secure an immutable window shell.
    *   **Focus Ring Reset:** Disables WebKit's default blue focus rings and tapped highlights on all buttons and interactive SVGs.
*   **Smart Selection Highlights [New]:** Exclusively enables premium, theme-matching **amber-colored selection highlights** inside search inputs to maintain usability.
*   **Dynamic Champagne Fallback [New]:** Integrates an automated color inversion filter for default cover art placeholders (`placeholder.png`) in light mode, transforming dark elements into a gorgeous champagne silver outline to match the premium theme.
*   **100% Native macOS Control:** Fully integrated with the macOS Control Center and your keyboard's native media keys. To maintain clean keyboard focus, standard text navigation keys (Spacebar and Arrow keys) are left untouched so they never conflict with your OS-level behaviors.
*   **Drag & Drop Ordering:** Reorder your songs dynamically by dragging them exactly where you want them.
*   **Mini-Player Mode:** A compact, distraction-free floating window with a glassmorphism overlay.
*   **Dynamic Theming:** Beautiful Dark, Light, and Smart Glass modes, complemented by a gorgeous backdrop gradient matching the album cover art.
*   **Bilingual:** Fully supports English and Spanish dynamically.
*   **Zero Bloat & Autocontained:** Compiles into a single self-contained native app (~15 MB) with absolutely no external dependencies (no Node, no Python required to run).

### 🚀 Installation & macOS Gatekeeper
Because NoblePlayer is compiled locally and is not digitally signed with an Apple Developer Certificate, macOS Gatekeeper might show a warning when opening it for the first time. 
To run the application:
1.  Open the **NoblePlayer_1.1.1_universal.dmg** and drag **NoblePlayer.app** to your **Applications** folder.
2.  Go to your Applications folder, **Right-click (or Control-click)** the `NoblePlayer` app, and select **Open**.
3.  Click **Open** on the macOS confirmation dialog. (You will only need to do this once).
*Alternatively, you can run `xattr -cr /Applications/NoblePlayer.app` in your Terminal to clear the quarantine flag.*

### 🛠 Technology Stack
NoblePlayer is built using cutting-edge technologies to ensure a lightweight footprint:
*   **Core / Backend:** [Rust](https://www.rust-lang.org/) (Using `rodio` for high-fidelity audio playback and `lofty` for metadata parsing).
*   **Framework:** [Tauri v2](https://tauri.app/) (providing a secure and incredibly lightweight native bridge).
*   **Frontend:** Pure Vanilla JavaScript, HTML5, and CSS3 (No heavy UI frameworks, resulting in zero bloat).

### 💻 Minimum Requirements
*   **OS:** macOS 10.15 (Catalina) or newer.
*   **Architecture:** Universal Binary (Natively supports both Apple Silicon M-series and Intel Macs).

---

## 🇪🇸 Español

### ¿Qué es NoblePlayer?
NoblePlayer es un reproductor de música local cuidadosamente diseñado para macOS. Construido con un enfoque en el alto rendimiento y una estética premium, ofrece una experiencia fluida para los usuarios que desean disfrutar de su colección de música sin conexión sin la pesadez de las aplicaciones de streaming modernas.

### 🎨 La Historia Detrás de NoblePlayer (Vibecoding)
Este proyecto es un testimonio real del poder del **Vibecoding** y la colaboración humano-IA. No soy un programador profesional; simplemente una persona con una visión creativa, objetivos de diseño claros y el sueño de crear un reproductor de música premium.

Todo el desarrollo del código, la arquitectura y la implementación técnica fueron realizados desde cero por **Antigravity** (diseñado por Google DeepMind), traduciendo mis ideas visuales y dirección funcional en una aplicación nativa de alto rendimiento. ¡Demuestra que hoy en día, con un diseño claro y un compañero de IA potente, cualquiera puede hacer realidad sus sueños de software!

### ✨ Características
*   **Motor de Lista Virtual:** Capaz de cargar y hacer scroll a más de 10.000 canciones a 60FPS constantes sin consumir memoria en exceso.
*   **Ordenación Alfabética Bidireccional [Nuevo]:** Ordena tu lista de reproducción de forma ascendente (A-Z) y descendente (Z-A) mediante un elegante botón interactivo tipo *glassmorphic*. La lógica actualiza el estado de reproducción activo (evitando saltos de canción o reinicios del timeline) y regenera de manera automática la cola de reproducción aleatoria.
*   **Cascarón Nativo Rígido (Anti-Filtración Web) [Nuevo]:** Diseñado con protecciones absolutas contra el comportamiento de navegadores web para brindar una experiencia nativa al 100%:
    *   **Bloqueo de Menú Contextual:** Captura los clics derechos o toques con dos dedos bloqueando los menús del navegador, manteniendo la barra de búsqueda activa para copiar y pegar.
    *   **Bloqueo de Arrastre (Drag):** Deshabilita los arrastres por defecto en portadas y textos, eliminando las molestas "imágenes fantasma" semitransparentes típicas de la web.
    *   **Prevención de Zoom:** Bloquea de forma absoluta los gestos trackpad *pinch-to-zoom* y los eventos de escalado WebKit propios de Apple Safari.
    *   **Protección de Cursores y Selección:** Deshabilita la selección de texto en todo el reproductor fuera del campo de búsqueda mediante fondos de selección transparentes, eliminando cursores tipo I-beam accidentales.
    *   **Bloqueo de Atajos del Navegador:** Intercepta e ignora atajos web (`Cmd+R` para recargar, `Cmd+F` para buscar texto, `Cmd+P` para imprimir) para asegurar un cascarón inmutable.
    *   **Eliminación de Focus Rings:** Deshabilita el contorno azul WebKit por defecto al hacer clic en botones y SVGs.
*   **Filtros de Selección Premium [Nuevo]:** Mantiene de forma limpia y exclusiva una **selección de texto color ámbar** en el buscador, a juego con la paleta de colores del reproductor.
*   **Placeholder de Portada Adaptativo [Nuevo]:** Integra un filtro dinámico para la portada por defecto (`placeholder.png`) en modo claro, convirtiendo el fondo oscuro del marcador en una elegante portada plateada champagne a juego con la estética clara de la app.
*   **Control Nativo macOS al 100%:** Totalmente integrado con el Centro de Control de macOS y las teclas multimedia de tu teclado. Para evitar conflictos, la app no interfiere con las teclas de navegación estándar (barra espaciadora y flechas), permitiéndote controlar el sistema y otros textos de forma limpia.
*   **Reordenamiento (Drag & Drop):** Reordena tus canciones dinámicamente arrastrándolas exactamente a donde quieras.
*   **Modo Mini-Reproductor:** Una ventana flotante compacta y libre de distracciones con un diseño *"glassmorphism"*.
*   **Temas Dinámicos:** Hermosos modos Claro, Oscuro y Smart Glass, complementados con gradientes dinámicos basados en la portada del álbum cargado.
*   **Bilingüe:** Soporte total para Inglés y Español de forma dinámica.
*   **Sin Sobrecarga y Autocontenido:** Se compila en una sola aplicación nativa autocontenida (~15 MB) sin dependencias externas (no requiere tener instalado Node ni Python para ejecutarla).

### 🚀 Instalación y macOS Gatekeeper
Dado que NoblePlayer se compila localmente y no está firmado digitalmente con un Certificado de Desarrollador de Apple, el sistema Gatekeeper de macOS podría mostrar una advertencia al abrirla por primera vez.
Para ejecutar la aplicación:
1.  Abre el archivo **NoblePlayer_1.1.1_universal.dmg** y arrastra **NoblePlayer.app** a tu carpeta de **Aplicaciones**.
2.  Ve a tu carpeta de Aplicaciones, haz **clic derecho (o Control-clic)** sobre `NoblePlayer` y selecciona **Abrir**.
3.  Haz clic en **Abrir** en el diálogo de confirmación de macOS. (Solo necesitarás hacer esto la primera vez).
*Como alternativa, puedes ejecutar `xattr -cr /Applications/NoblePlayer.app` en la Terminal para limpiar la bandera de cuarentena.*

### 🛠 Tecnologías Utilizadas
NoblePlayer está construido utilizando tecnologías de vanguardia para asegurar un consumo mínimo de recursos:
*   **Núcleo / Backend:** [Utilizando Rust](https://www.rust-lang.org/) (`rodio` para un motor de audio de alta fidelidad y `lofty` para la lectura de metadatos).
*   **Framework:** [Tauri v2](https://tauri.app/) (proporcionando un puente nativo seguro e increíblemente ligero).
*   **Frontend:** JavaScript Vanilla puro, HTML5 y CSS3 (Sin frameworks pesados de UI, resultando en cero sobrecarga).

### 💻 Requisitos Mínimos
*   **Sistema Operativo:** macOS 10.15 (Catalina) o superior.
*   **Arquitectura:** Binario Universal (Soporte nativo tanto para procesadores Apple Silicon M-series como para Intel).
