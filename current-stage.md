# Текущее состояние проекта

## Project essence
A YouTube clone for viewing local video files. The application consists of a backend server (Express/Electron) for reading the file system and a frontend client (Vue 3) for displaying the interface.

## Technology stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Desktop Wrapper**: Electron
- **Language**: TypeScript
- **Key Libraries**:
    - `fs-extra` (working with the file system)
    - `cors` (CORS configuration)
    - `lru-cache` (In-Memory cache)
    - `p-limit` (concurrency limiter)
    - `chokidar` (filesystem changes handler)
    - `zod` (validation)
    - `pino` (logging)
    - `natural` (text processing)

### Frontend
- **Build Tool**: Vite
- **Framework**: Vue 3 (Script Setup)
- **Routing**: Vue Router 4 (Lazy Loading)
- **UI/Styling**: TailwindCSS v4, Bootstrap Icons
- **Video Player**: Video.js + @videojs/http-streaming
- **Utilities**: axios, @vueuse/core
- **Linting**: Eslint, Prettier

## Current functionality
- View the list of playlists in the selected folder.
- Tabs on the main page: Playlists, Videos, Search.
- **Advanced grouping and sorting**:
    - Sort playlists and videos (by date, author).
    - Grouping videos (by date, author, **playlist**).
    - Sorting/grouping control on the Search tab.
    - Saving view settings between sessions.
- View a general list of all videos in a folder sorted by date (using metadata titles).
- View search results (integrated into the main page).
- View a list of videos in a playlist (with auto-scrolling to the current video and a counter).
- Viewing videos (Video.js).
- Support for chapters.
- ID-based routing.
- Global “Home” button.
- Dark theme with **Glassmorphism effects** in the header.
- Video viewing progress (Local Storage) displayed on video cards.
- **Smart Scroll Restoration**: Instant return to the home page without reloading (KeepAlive).

## Project Structure

### File Tree

```text
.
├── dist/                     # Compiled app
├── backend/                  # Backend app part (Node.js + Electron)
│   ├── cache/                # File cache folder
│   ├── src/                  # Separated backend logic sources
│   │   ├── config/           # config folder
│   │   ├── controllers/      # handlers for api controllers
│   │   ├── electron/         # Electron specific code
│   │   │   ├── main.ts       # Electron entry point (Main Process)
│   │   │   └── preload.ts    # Preload script
│   │   ├── routes/           # api routes
│   │   ├── services/         # index and cache services
│   │   ├── utils/            # Utilities
│   │   └── server.ts         # Express server entry point
│   ├── build-installer.js    # (electron-builder)
│   ├── .env                  # Backend environment settings
│   ├── package.json          # Backend dependencies
│   └── icon.png              # App icon
│
├── frontend/                 # Frontend app part (Vue 3 + Vite)
│   ├── public/               # Static resources
│   ├── src/                  # Sources (FSD Architecture)
│   │   ├── app/              # app initialization
│   │   │   ├── assets/       # global styles and assets
│   │   │   ├── providers/    # providers config (router)
│   │   │   ├── App.vue       # Root component
│   │   │   └── main.js       # Entry point
│   │   ├── pages/            # App pages (Flat hierarchy)
│   │   │   ├── home/         # Select folder, view playlists list, view all videos sorted or groupped, search results (ui/HomePage.vue)
│   │   │   ├── playlist/     # Playlist page (ui/PlaylistPage.vue)
│   │   │   └── video/        # Video view page (ui/VideoPage.vue)
│   │   ├── widgets/          # Standalone UI blocks
│   │   │   ├── chapters-sidebar/ # Chapters sidebar
│   │   │   ├── playlist-sidebar/ # Playlist sidebar
│   │   │   └── video-player/     # Video player
│   │   ├── features/         # Functional modules
│   │   │   ├── filesystem/   # (PathInput)
│   │   │   └── search/       # (SearchInput)
│   │   ├── entities/         # Business-entities
│   │   │   ├── settings/     # Settings model (useSettings)
│   │   │   └── video/        # Video info and description (VideoInfo)
│   │   ├── shared/           # Shared entities
│   │   │   ├── api/          # API-client
│   │   │   └── lib/          # Utils (utils.js, animations.js, clickhandler)
│   │   ├── index.html        # HTML template
│   │   ├── vite.config.js    # Vite config
│   │   └── package.json      # Frontend dependencies
│
├── current-stage.md          # Project state
├── readme.md                 # Technical specifications and launch instructions
└── todo.md                   # Todo list
```

### Purpose of the main modules

#### Backend
- **`server.ts`**: Express application. Responsible for:
    - Scanning directories (`/api/playlists`).
    - Retrieving playlist details (`/api/playlist/:id`).
    - Streaming video files (`/api/video`).
    - Searching for videos (`/api/search`).
    - CORS configuration for development.
- **`electron/main.ts`**: Creates the application window. Runs `server.ts` logic. Manages the lifecycle.

#### Frontend (FSD Architecture)
- **`app`**: Initialization layer. Contains global styles, router, and entry point.
- **`pages`**: Flat page slices. Collect widgets and features to display specific routes (`HomePage`, `VideoPage`, etc).
- **`widgets`**: Large independent blocks.
    - **`VideoPlayer`**: Wrapper over Video.js with custom UI.
    - **`PlaylistSidebar`**: Sidebar with a list of videos.
    - **`WindowTitleBar`**: Custom title bar for Electron (Windows-style controls).
    - **`HomeButton`**: Navigation button to return to the home page.
    - **`StickyHeader`**: Unified sticky header for pages.
- **`features`**: Specific user scenarios.
    - **`PathInput`**: Entering the path to the history folder.
    - **`SearchInput`**: Global search.
- **`entities`**: Business logic and data models.
    - **`useSettings`**: `ref`/`reactive`-based store for storing settings (volume, history).
- **`shared`**: Reusable infrastructure code.
    - **`api`**: Axios client.
    - **`lib`**: Formatting utilities.
