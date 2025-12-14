---
trigger: always_on
---

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
    - **Linting**: Eslint, Prettier

### Frontend
- **Build Tool**: Vite
- **Framework**: Vue 3
- **Routing**: Vue Router 4
- **UI/Styling**: TailwindCSS v4, Bootstrap Icons
- **Video Player**: Video.js + @videojs/http-streaming
- **Utilities**: axios, @vueuse/core
- **Linting**: Eslint, Prettier