# Course Processing Scripts Usage

## Использование

### Базовый запуск

Обработка курсов в указанной папке:

```bash
# Из папки backend
npm run process-courses -- /path/to/courses

# Windows (полный путь)
npm run process-courses -- "E:\Downloads\Courses"

# Linux/Mac (полный путь)
npm run process-courses -- "/home/user/courses"

# Относительный путь
npm run process-courses -- ../sample
npm run process-courses -- "./my-courses"
```

### Dry-run режим (тестирование без изменений)

```bash
npm run process-courses -- /path/to/courses --dry-run --verbose
```

### Verbose режим (подробный вывод)

```bash
npm run process-courses -- /path/to/courses --verbose
```

### Комбинированные флаги

```bash
# Dry-run + verbose
npm run process-courses -- /path/to/courses --dry-run --verbose
```

## Примеры

```bash
# Обработать sample папку
npm run process-courses -- ../sample

# Проверить что будет сделано (без изменений)
npm run process-courses -- "E:\Downloads\JavaScript Courses" --dry-run --verbose

# Обработать с подробным выводом
npm run process-courses -- "/mnt/data/courses" --verbose
```

## Что делает скрипт

1. Сканирует папку с курсами
2. Для каждого курса:
   - Создаёт .info.json для плейлиста
   - Объединяет видео из вложенных папок в .mkv с chapters
   - Создаёт .info.json для каждого видео
   - Извлекает обложки (webp)
   - Удаляет нумерацию из названий
   - Удаляет пустые вложенные папки
3. Пропускает уже обработанные курсы (идемпотентность)

## Флаги

- `--dry-run` - режим симуляции (не вносит изменения)
- `--verbose` - подробный вывод всех операций

## Требования

- ffmpeg и ffprobe должны быть установлены и доступны в PATH
- Node.js v14+
