# Comparison: честное video-vs-video

Дата: 2026-08-13.

## Результат

- Коммиты: `81c22bad11ad016ac5970715f72427100f2af357` (`feat(comparison): add video-vs-video`) и `371ae89fdd8c994444f12269967a345e6f98ba9b` (`feat(comparison): complete video-vs-video`).
- Push не выполнялся; локальная `main` опережает `origin/main` на 2 коммита.
- Вкладка содержит 16 семейств; у 16/16 есть наш видео/фото-образец и competitor-видео. Подключены 42/42 MP4 конкурента из `assets/clips/`.
- Основной вид показывает competitor-видео `muted`, `loop`, `playsinline`; клик открывает играющий клип в лайтбоксе. Статичные JPG/PNG не рендерятся как competitor-карточки.
- «Сравнить бок о бок» показывает наш образец против competitor-видео; оба видео запускаются `autoplay`, `muted`, `loop`, стрелки переключают competitor-клипы и счётчик.
- Добавлены подписи спорных вариантов: punch/slow push, film-burn/световая сборка/холодная вспышка, particles/wash/tint/burn, virtual Ken Burns/source-camera/drone, основной и варианты INSET-WINDOW.
- GRID-LINES использует `assets/ours/grid-lines.mp4`; SATURATION-COLOR использует `assets/ours/saturation-color-v2.mp4`. Старые файлы сохранены.
- Подключены 15 клипов для KEYFRAMES-MOTION, PHOTO-IMAGE, OPACITY-FADE, TEXT-TYPOGRAPHY, GEOMETRY-SHAPE и BLUR-EFFECT; старые неверные JPG этих семейств удалены из comparison-данных, файлы сохранены.
- `OTHER` и `EMPTY` удалены из comparison-данных и фильтра; `assets/ours/other.mp4` не рендерится во вкладке. Каталог сохраняет исходные 18 классификаций, comparison показывает 16 семейств и 167 относящихся к ним умений.
- 6 референсов `OTHER`/`EMPTY` перенесены в KEYFRAMES-MOTION, TEXT-TYPOGRAPHY, SATURATION-COLOR и INSET-WINDOW как кнопки «Кадры-варианты» с просмотром в лайтбоксе.

## Файлы

- UI: `index.html`.
- Данные: `sravnenie.json`, `sravnenie-data.js`.
- QA: `scripts/qa-site-v1.js`, `scripts/qa-browser-v1.js`.
- Медиа: 42 MP4 в `assets/clips/`, 2 MP4 и 2 новых постера в `assets/ours/`.

## Проверки

- `node scripts/qa-site-v1.js`: PASS, 48 756 assertions.
- Headless Chrome на `http://127.0.0.1:8765/index.html`: PASS, 84 browser assertions; HTTP console errors 0; file console errors 0; refresh PASS.
- Всего: 48 840 assertions; console errors 0.
- `git diff --cached --check`: PASS до коммита.

## Не вышло

- Нет невыполненных пунктов задачи.
