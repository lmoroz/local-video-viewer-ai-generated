# Текущее состояние проекта

## Суть проекта
Youtube-clone для просмотра локальных видеофайлов. Приложение состоит из backend-сервера (Express/Electron) для чтения файловой системы и frontend-клиента (Vue 3) для отображения интерфейса.

## Технологический стек

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Desktop Wrapper**: Electron
- **Key Libraries**:
  - `fs-extra` (работа с файловой системой)
  - `cors` (настройка CORS)

### Frontend
- **Build Tool**: Vite
- **Framework**: Vue 3 (Script Setup)
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **UI/Styling**: TailwindCSS v4, Bootstrap Icons
- **Video Player**: Video.js + @videojs/http-streaming
- **Utilities**: axios, @vueuse/core
- **Linting**: Eslint, Prettier

## Текущий функционал
- Просмотр списка плейлистов в выбранной папке.
- Просмотр списка видео в плейлисте.
- Просмотр видеороликов (Video.js).
- Поддержка глав (Chapters).
- ID-based роутинг.
- Темная тема.
