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
│   ├── public/               # Статические ресурсы
│   ├── src/                  # Исходный код (FSD Architecture)
│   │   ├── app/              # Инициализация приложения
│   │   │   ├── assets/       # Глобальные стили и ассеты
│   │   │   ├── providers/    # Конфигурация провайдеров (router)
│   │   │   ├── App.vue       # Корневой компонент
│   │   │   └── main.js       # Точка входа
│   │   ├── pages/            # Страницы приложения (Flat hierarchy)
│   │   │   ├── home/         # Выбор папки (ui/HomePage.vue)
│   │   │   ├── playlist/     # Список видео (ui/PlaylistPage.vue)
│   │   │   ├── search/       # Результаты поиска (ui/SearchPage.vue)
│   │   │   └── video/        # Просмотр видео (ui/VideoPage.vue)
│   │   ├── widgets/          # Самостоятельные UI блоки
│   │   │   ├── chapters-sidebar/ # Сайдбар глав
│   │   │   ├── playlist-sidebar/ # Сайдбар плейлиста
│   │   │   └── video-player/     # Видеоплеер
│   │   ├── features/         # Функциональные модули
│   │   │   ├── filesystem/   # (PathInput)
│   │   │   └── search/       # (SearchInput)
│   │   ├── entities/         # Бизнес-сущности
│   │   │   ├── settings/     # Модель настроек (useSettings)
│   │   │   └── video/        # Отображение информации о видео (VideoInfo)
│   │   ├── shared/           # Общий код
│   │   │   ├── api/          # API клиент
│   │   │   └── lib/          # Утилиты (utils.js, animations.js)
│   │   ├── index.html        # HTML шаблон
│   │   ├── vite.config.js    # Конфигурация сборщика Vite
│   │   └── package.json      # Зависимости фронтенда
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
- **`electron-main.js`**: Создает окно приложения. Запускает `server.js` в продакшн режиме или подключается к нему. Управляет жизненным циклом.

#### Frontend (FSD Architecture)
- **`app`**: Слой инициализации. Содержит глобальные стили, роутер и точку входа.
- **`pages`**: Плоские слайсы страниц. Собирают виджеты и фичи для отображения конкретных маршрутов (`HomePage`, `VideoPage`, etc).
- **`widgets`**: Крупные самостоятельные блоки.
  - **`VideoPlayer`**: Обертка над Video.js с кастомным UI.
  - **`PlaylistSidebar`**: Сайдбар со списком видео.
- **`features`**: Конкретные пользовательские сценарии.
  - **`PathInput`**: Ввод пути к папке с историей.
  - **`SearchInput`**: Глобальный поиск.
- **`entities`**: Бизнес-логика и модели данных.
  - **`useSettings`**: Store на базе `ref`/`reactive` для хранения настроек (громкость, история).
- **`shared`**: Переиспользуемый инфраструктурный код.
  - **`api`**: Axios клиент.
  - **`lib`**: Утилиты форматирования.
