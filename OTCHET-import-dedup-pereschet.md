# Импорт 4yavUTCeCp0, дедуп QOUszAHEZAE, пересчёт

Дата: 2026-08-13

## Итог

- Видео/project-записей: 9; уникальных YouTube ID: 9.
- Карточек: 1566 = 942 сохранённых + 624 импортированных; потерь: 0.
- Семейств: 18; `base`: 1483; `unique`: 83; порог: `BASE_VIDEO_THRESHOLD = 0.5`.
- Карточек с `freq_videos == 1`: 32; из них `unique`: 32, исключений: 0.
- Все 1566 карточек имеют `family`, `freq_videos`, `freq_total`, `tier`.

## Импорт

- Источник: `/Users/alphabravo/Downloads/autorazmetka-new/4yavUTCeCp0/elements-4yavUTCeCp0-v2.json`.
- Добавлен проект `1ac4d4bf-c19f-47df-99fa-cdc90c76931f`, YouTube `4yavUTCeCp0`, длительность `2132.601` с.
- Импортировано 624/624 уникальных ID; покрытие таймкодов `0:00.0–35:30.3`.
- Основные семейства новых карточек: `HARD-CUT` 375, `TEXT-TYPOGRAPHY` 75, `PHOTO-IMAGE` 59, `POSITION-SLIDE` 24, `BLUR-EFFECT` 18.

## Дедуп QOUszAHEZAE

- Основной проект сохранён: `199a5705-1235-480d-8f3b-c76f02d40c58`.
- Повреждённая project-запись удалена: `c7b3604b-d801-49ca-b17e-4ba549e1e1d9`.
- Все 39 её карточек перенесены в основной проект; карточек QOUszAHEZAE после объединения: 382.
- URL очищен от стартового таймкода; длительность исправлена с `1:05` на `15:02`.

## Файлы

- Изменены: `data.json`, `index.html`, `scripts/enrich-families.js`.
- Созданы: `data.backup-20260813-2.json`, `scripts/import-4yav-dedup.js`, `OTCHET-import-dedup-pereschet.md`.
- `index.html`: в семейной сводке добавлены KPI `base / unique / семейства / видео`; значения берутся из текущего `data.json`.
- `scripts/enrich-families.js`: пересчёт сохраняет существующие `our_media`, `level`, `notes` в `sravnenie.json`.
- Commit/push не выполнялись.

## Проверка и rollback

- Бэкап создан до изменения данных и совпадает с исходным `data.json`: `data.backup-20260813-2.json`.
- JSON parse, уникальность 1566 ID, project-ссылки, 18 семейств, частоты и tier: PASS.
- Старые карточки: 942/942 ID сохранены; новые: 624/624 ID присутствуют.
- `QOUszAHEZAE`: 1 project-запись, 382 карточки, старых projectId не осталось.
- Повторный запуск import + enrich не меняет `data.json` и `sravnenie.json`.
- Inline JS `index.html` и `sravnenie.html`: синтаксис PASS через Node `vm.Script`; `git diff --check`: PASS.
- Rollback: заменить `data.json` файлом `data.backup-20260813-2.json`.

## Не вышло

- Новые превью не добавлены: во входном JSON у всех 624 карточек поле `image` пустое. Каталог корректно показывает штатную заглушку.
