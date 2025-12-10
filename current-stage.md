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
- Прогресс просмотра видео (Local Storage).

## Структура проекта

### Файловая структура (Tree)

```text
.
├── dist/                     # Скомпилированные файлы инсталлера
├── backend/                  # Серверная часть (Node.js + Electron)
│   ├── build-installer.js    # Скрипт сборки инсталлера (electron-builder)
│   ├── electron-main.js      # Точка входа Electron (Main Process)
│   ├── server.js             # Express сервер (API для работы с файлами)
│   ├── package.json          # Зависимости бэкенда
│   └── icon.png              # Иконка приложения
│
├── frontend/                 # Клиентская часть (Vue 3 + Vite)
│   ├── public/               # Статические ресурсы (иконки, фавикон)
│   ├── src/                  # Исходный код фронтенда
│   │   ├── assets/           # Стили (index.css) и изображения
│   │   ├── components/       # Переиспользуемые Vue компоненты
│   │   │   ├── video/        # Компоненты плеера и видео
│   │   │   │   ├── ChaptersSidebar.vue # Сайдбар с главами
│   │   │   │   ├── PlaylistSidebar.vue # Сайдбар с плейлистом
│   │   │   │   ├── VideoInfo.vue       # Информация о видео
│   │   │   │   └── VideoPlayer.vue     # Обертка над Video.js
│   │   │   ├── PathInput.vue    # Компонент ввода пути к папке
│   │   │   └── SearchInput.vue  # Компонент поиска
│   │   ├── router/           # Конфигурация маршрутизации
│   │   │   └── index.js
│   │   ├── views/            # Страницы приложения
│   │   │   ├── HomePage.vue      # Главная (выбор папки/плейлиста)
│   │   │   ├── PlaylistPage.vue  # Страница списка видео
│   │   │   ├── SearchPage.vue    # Страница результатов поиска
│   │   │   └── VideoPage.vue     # Страница просмотра видео
│   │   ├── api.js            # Axios клиент для общения с бэкендом
│   │   ├── utils.js          # Утилитарные функции (форматирование времени и др.)
│   │   ├── App.vue           # Корневой компонент
│   │   └── main.js           # Точка входа Vue приложения
│   ├── index.html            # HTML шаблон
│   ├── vite.config.js        # Конфигурация сборщика Vite
│   └── package.json          # Зависимости фронтенда
│
├── current-stage.md          # Описание текущего состояния проекта
├── readme.md                 # Техническое задание и инструкция по запуску
└── todo.md                   # Список задач
```

### Назначение основных модулей

#### Backend
- **`server.js`**: Express приложение. Отвечает за:
  - Сканирование директорий (`/api/playlists`).
  - Получение деталей плейлиста (`/api/playlist/:id`).
  - Стриминг видео файлов (`/api/video`).
  - Поиск видео (`/api/search`).
  - CORS конфигурацию для разработке.
- **`electron-main.js`**: Создает окно приложения. Запускает `server.js` в продакшн режиме или подключается к нему. Управляет жизненным циклом (закрытие, сворачивание).

#### Frontend
- **`views/HomePage.vue`**: Стартовая страница. Позволяет пользователю ввести путь к папке. Отображает найденные плейлисты (папки с `playlist.json` или медиафайлами).
- **`views/PlaylistPage.vue`**: Отображает сетку видеороликов в выбранном плейлисте. Поддерживает сортировку и фильтрацию. Показывает прогресс просмотра на превью.
- **`views/VideoPage.vue`**: Основная страница плеера. Объединяет `VideoPlayer`, `VideoInfo` и сайдбары (`ChaptersSidebar`, `PlaylistSidebar`). Управляет навигацией между видео.
- **`components/video/VideoPlayer.vue`**: Интеграция Video.js. Реализует кастомный UI, управление скоростью, сохранение прогресса и громкости в `localStorage`.
- **`api.js`**: Единая точка доступа к API. Преобразует относительные пути в полные URL для сервера.
