# Доработка каталога: база/уникальное и сравнение

Дата: 2026-08-13

## Результат

- `projects`: 9; карточек до/после: 942/942; семейств: 18.
- Порог `BASE_VIDEO_THRESHOLD = 0.5`: база — 877 карточек, уникальное — 65.
- Каждая карточка получила `family`, `freq_videos`, `freq_total`, `tier`; пропусков и неверных tier: 0.
- `family` — одно основное семейство из классификации `OTCHET-semejstva.md`; исходный отчёт использовал перекрывающиеся семейства. Частоты пересчитаны по основному семейству: `freq_videos` — число project-записей, `freq_total` — число карточек.
- `index.html`: переключатель «База / Уникальные / Все», семейные секции, частота на карточках, семейная сводка в панели статистики, ссылка на сравнение.
- `sravnenie.html`: 18 двухколоночных строк; слева локальное фото/видео или «Образца пока нет», справа локальное превью и техническая подпись конкурента.

## Частоты

- `KEYFRAMES-MOTION`: 21, 4/9, unique; `PHOTO-IMAGE`: 161, 9/9, base.
- `HARD-CUT`: 107, 7/9, base; `OPACITY-FADE`: 30, 6/9, base.
- `INSET-WINDOW`: 11, 5/9, base; `SCALE-ZOOM`: 56, 8/9, base.
- `TEXT-TYPOGRAPHY`: 243, 7/9, base; `POSITION-SLIDE`: 30, 7/9, base.
- `GRID-LINES`: 48, 7/9, base; `LIGHT-GLOW`: 101, 9/9, base.
- `SATURATION-COLOR`: 33, 5/9, base; `OTHER`: 18, 5/9, base.
- `CROSSFADE`: 16, 5/9, base; `BLEND-MODE`: 3, 3/9, unique.
- `GEOMETRY-SHAPE`: 12, 6/9, base; `EMPTY`: 32, 1/9, unique.
- `CAMERA-MOTION`: 11, 6/9, base; `BLUR-EFFECT`: 9, 3/9, unique.

## Файлы

- Изменены: `data.json`, `index.html`.
- Созданы: `data.backup-20260813.json`, `sravnenie.json`, `sravnenie.html`, `scripts/enrich-families.js`, `OTCHET-dorabotka-kataloga.md`.
- `sravnenie.json`: `version: 1`, 18 записей `{family, our_media: null, level: "нет", notes: ""}`.
- Commit/push не выполнялись.

## Проверка

- JSON parse: PASS; число карточек: 942; уникальных ID: 942; битых `projectId`: 0.
- Исходные поля и значения после удаления четырёх новых полей совпадают с бэкапом; бэкап совпадает с исходным `HEAD:data.json`.
- Частоты и правило tier: 0 расхождений; повторный запуск обогащения не меняет файлы.
- Inline JS `index.html` и `sravnenie.html`: синтаксис PASS через Node `vm.Script`.
- Функциональный Node-рендер `sravnenie.html`: 18 строк, 18 null-заглушек, 18 существующих превью конкурента.
- HTTP GET локального сервера: `index.html`, `sravnenie.html`, `data.json`, `sravnenie.json` — PASS.
- Внешних URL/CDN в `sravnenie.html` и `sravnenie.json`: 0.

## Не вышло

- Headless/визуальный браузерный прогон не выполнен: встроенный Browser вернул 0 доступных браузеров. Применена предусмотренная заданием Node-проверка.
- В исходном каталоге уже отсутствуют 26 из 942 файлов превью; доработка их не добавила и не удалила. Все 18 превью, выбранные для страницы сравнения, существуют.
