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

## Починка дубля

- Было: `assets/clips/photo-image-ref3.mp4` и `assets/clips/inset-window-ref2.mp4` имели одинаковый SHA-256 `dcd557089b7f900dc0cc88043b21fb6cad150cc7c3ea7c807ef42246d06b4447`; конкурентных клипов было 42 пути, но 41 уникальное содержимое.
- Стало: портретный клип оставлен у PHOTO-IMAGE №3; INSET-WINDOW №2 получил `SRC-QOU` `00:16.600–00:20.600` по прежнему пути `assets/clips/inset-window-ref2.mp4`, SHA-256 `870349bf34ab723ed607d216cea331d3590cf8cb52b809bf07ebbbeb41e44ff9`.
- Уникальность: 42/42 наших образца и 42/42 клипа конкурента уникальны по пути и SHA-256; дублей 0.
- Тесты: 2 обязательных скрипта, 48 820 assertions суммарно. `qa-site-v1.js` — PASS 48 735; `qa-browser-v1.js` — PASS 85; HTTP console errors 0, `file://` console errors 0, refresh PASS.
- Тесты падают при повторе пути или байтового содержимого на любой стороне пары.
- Коммит починки: `e4df247c6bffcedcdfc2876479a029f6958ecb3d`.
- `assets/ours/pairs/*.mp4` починкой не изменялись и в коммит не включались.
- Push не выполнялся.
