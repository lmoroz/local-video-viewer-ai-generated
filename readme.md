# Local Video Viewer

> **🤖 AI-Assisted Development Project**
>
> This project demonstrates a modern approach to software development using
> LLM agents (Large Language Models) as intelligent AI assistants. Development
> follows a **human-in-the-loop** model: I define the architecture, make key
> decisions, and control code quality, while the AI agent serves as a powerful
> tool for accelerating routine tasks and generating boilerplate code.

## 🎯 Development Philosophy

### What I do (Developer)

- 🏗️ **Architectural Decisions**: choosing the technology stack, designing
  modular application structure (Feature-Sliced Design)
- 🎨 **UX/UI Design**: interface concept, user scenarios, visual aesthetics
- 🔍 **Code Review**: reviewing generated code, refactoring, optimization
- 🧪 **Testing**: functionality verification, debugging edge cases
- 📋 **Project Management**: feature planning, task prioritization,
  documentation maintenance

### What the AI Agent does

- ⚡ **Code Generation**: creating components, services, validation schemas
  based on technical specifications
- 🔧 **Refactoring**: automatic linter fixes, import optimization,
  code style unification
- 📝 **Documentation**: generating comments, READMEs, technical descriptions
- 🐛 **Debugging**: error analysis, solution suggestions, type fixing
- 🔄 **Migrations**: dependency updates, adapting code to new library versions

## 🚀 Benefits of the AI-Driven Approach

✅ **Development Speed**: routine tasks are solved 5-10x faster  
✅ **Code Consistency**: uniform style throughout the entire project  
✅ **Current Best Practices**: using modern patterns and approaches  
✅ **Documentation**: automatic synchronization of code and documentation  
✅ **Edge Case Coverage**: AI helps identify potential issues

---

## 📋 Technical Specifications

This application is a YouTube clone for viewing videos stored on a computer.

Stack: vite + vue.js 3 + vue-router 4 + eslint + prettier +
[videojs](https://videojs.org/) + tailwindcss + express.js

---

A detailed description of the current state of the project and architecture
(FSD) is available in the [current-stage.md](current-stage.md) file.

---

## Contents

- [Initial data](#source-data)
- [Application features](#application-features)
  - [Home page](#home-page)
    - [Home page preview](#home-page-preview)
  - [Playlist page](#playlist-page)
    - [Example of a playlist page](#example-of-a-playlist-page)
- [Video viewing page](#video-viewing-page)
  - [Example of the video viewing page](#example-of-the-video-viewing-page)
- [Final result](#final-result)
- [Launch and Build](#launch-and-build)
  - [Prerequisites](#prerequisites)
  - [Development Mode](#development-mode)
  - [Running in Electron (Dev) mode](#running-in-electron-dev-mode)
  - [Building the Application (Production Build)](#building-the-application-production-build)
- [To create an installation file in two steps (exe/installer)](#to-create-an-installation-file-in-two-steps-exe-and-installer)
- [To create the installer file in one step](#to-create-the-installer-file-in-one-step)

---

## Source data

- Sample folder with playlists and videos — @folder-sample.
  It is assumed that playlists are downloaded to the folder using **yt-dlp**
  with the following settings:

```bash
--js-runtimes node
--remote-components ejs:npm
--cookies "cookies.txt"
--embed-thumbnail
--write-thumbnail
--write-description
--add-metadata
--replace-in-metadata "playlist_title" "#" "hashtag_"
--replace-in-metadata "title" "#" "hashtag_"
-o "%(playlist_title)s/%(playlist_index)03d - %(title)s [%(id)s].%(ext)s"
--write-info-json
--write-playlist-metafiles
 --download-archive archive.txt
 --no-overwrites
 --mtime
```

- Each playlist folder contains a set of video files, covers, and technical
  data for each video in json format
- A template for implementing the application has already been created in the
  @frontend and @backend folders
- The @backend folder contains server.ts — a third-party sample of a local
  server for processing requests from the frontend to parse folders on the
  computer. It needs to be converted to express.js-server and supplemented
  with the necessary functionality

## Application features

1. Allows you to view a list of playlists in a selected folder on your
   computer with the ability to sort either by name or by update date.
2. Allows you to view a list of videos in a selected playlist with the ability
   to sort either by name or by video date.
3. Allows you to watch videos as on YouTube, with an optional chapters list.

### Home page

1. At the top, there is a field for entering the path to the playlist folder
   on the computer. The input field should store the path history as a
   clickable list that should be displayed in a popup window below the field
   when the focus is on the input field.
2. **Interface tabs**:
   - **Playlists**: List of playlists (folders).
   - **Videos**: List of all video files in the selected directory (including
     subfolders), sorted by date (newest at the top). Videos are displayed as
     cards with a viewing progress bar.
   - **Search**: Search results (activated automatically when you enter a
     query).
3. For each playlist, the following information is displayed: name, cover art,
   number of videos, total duration of all videos in the playlist
4. Clicking on the cover art activates the transition to the playlist page
5. **Global navigation**: A floating "Home" button (upper left corner) is
   available on all internal pages (Playlist, Video) for quick return to the
   list.

#### Home page preview

![Home page preview](20251202101956.png)

### Playlist page

1. At the top, there is a button to return to the main page with the selected
   playlist folder.
2. Next is a block divided into two parts: on the left is the playlist cover,
   on the right is a list of videos in the playlist (numbered in the order in
   which they come from the backend API), where there is a video cover,
   duration, title, author, and date
3. Clicking on an item in the list takes you to the video viewing page.
4. Above the list of videos, there should be a dropdown button with a choice
   of sorting method. The initial sorting is as it comes from the backend API,
   but it is also possible to sort by video date in ascending or descending
   order, or by video title in ascending or descending order.

#### Example of a playlist page

![Example of a playlist page](20251202102758.png)

### Video viewing page

1. At the top, there is a button to return to the playlist page (with the
   playlist name).
2. Video player with the option to open the list of chapters for this video
   on the right
3. Video title
4. Author
5. If the user changes the video volume, this should be remembered and all
   subsequent videos should start at this volume

#### Example of the video viewing page

![Example of the video viewing page](20251202103441.png)

**References:**

- [Video.js Guides](https://videojs.org/guides)
- [Video.js Chapters Button](https://docs.videojs.com/chaptersbutton)

## Final result

![img_5.png](img_5.png)

## Launch and Build

### Prerequisites

- Node.js (lts version recommended)
- Installed dependencies in folders `local-video-viewer-ai-generated/backend`
  and `local-video-viewer-ai-generated/frontend`

```bash
# Installing dependencies
cd frontend
npm install

cd ../backend
npm install
```

### Development mode

For development, it is recommended to run the backend and frontend separately
for Hot Module Replacement (HMR) to work.

1. **Running the Backend (API Server)**

   ```bash
   cd backend
   npm start
   # The server will be launched at http://localhost:3000
   ```

2. **Launching Frontend (Vite Dev Server)**

   ```bash
   cd frontend
   npm run dev
   # The application will be available via the link in the terminal
   # (usually http://localhost:5173)
   ```

### Running in Electron (Dev) mode

If you need to check the operation inside the Electron window:

1. Build the frontend (since electron-main.js loads static files or
   <http://localhost:3000>, which distributes static files in the current
   configuration):

   ```bash
   cd frontend
   npm run build
   ```

2. Run Electron from the backend folder:

   ```bash
   cd backend
   npm run electron:dev
   ```

### Building the application (Production Build)

#### To create an installation file in two steps (exe and installer)

1. **Frontend build**

   ```bash
   cd frontend
   npm run build
   ```

   This will create a `dist` folder inside `frontend`.

2. **Building the Backend and Installer**

   ```bash
   cd backend
   npm run dist
   ```

   The application installer file will appear in the `dist` folder.

#### To create the installer file in one step

```bash
cd backend
npm run bundle
```

The application installer file will appear in the `dist` folder.
