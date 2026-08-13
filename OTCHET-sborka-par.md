# Сборка каталога: 42 попарных сравнения

- Ветка: `main`.
- Редизайн: `redesign-comparison` / `c7a6d47`, fast-forward без конфликтов.
- Реализация: `c6eb8069c585a491a8f1162cd5ed2c47e3deccc7`.
- Push: не выполнялся.

## Пары по семействам

- KEYFRAMES-MOTION — 3
- PHOTO-IMAGE — 3
- HARD-CUT — 3
- OPACITY-FADE — 1
- INSET-WINDOW — 3
- SCALE-ZOOM — 3
- TEXT-TYPOGRAPHY — 2
- POSITION-SLIDE — 2
- GRID-LINES — 2
- LIGHT-GLOW — 3
- SATURATION-COLOR — 3
- CROSSFADE — 3
- BLEND-MODE — 3
- GEOMETRY-SHAPE — 3
- CAMERA-MOTION — 2
- BLUR-EFFECT — 3
- Итого — 42 пары в 16 семействах; 42 уникальных наших MP4 и 42 уникальных клипа конкурента.

## Проверка

- Обязательных QA-скриптов: 2.
- `node scripts/qa-site-v1.js` — PASS, 48 733 assertions.
- `node scripts/qa-browser-v1.js http://127.0.0.1:8877/index.html` — PASS, 82 browser assertions.
- Всего в двух обязательных запусках — 48 815 assertions.
- Headless Chrome: HTTP PASS, `file://` PASS, IndexedDB refresh PASS.
- Console errors: 0 HTTP + 0 `file://` = 0.
- Focused comparison Chrome: PASS, 38 assertions, console errors 0.
- Pair MP4 probe: 42 файла, 42 H.264 1920×1080 по 2.000 s, ошибок 0.
- DOM comparison: плейсхолдеры 0, служебные/debug-строки 0, статичные JPG/PNG/WebP 0, старые `assets/ours/*.mp4` 0.

## Что не вышло

- Ничего. Все критерии выполнены.
