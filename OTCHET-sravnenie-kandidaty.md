# Отчёт: кандидаты наших образцов

Дата: 2026-08-13

## Результат

- Семейств проверено: 18/18.
- Готовый локальный образец найден: 17/18.
- Уровень `1:1`: 9.
- Уровень `~67%`: 8.
- Уровень `нет`: 1 (`EMPTY`).
- Рендеры не запускались.
- Видеокадры не декодировались; для видео использованы только имя, `stat` и `ffprobe`.
- Визуально проверены только готовые PNG/JPG/contact sheets.

## Созданные файлы

- `/Users/alphabravo/Downloads/katalog-elementov/sravnenie-kandidaty.md` — 18 строк таблицы, полные пути, размеры, длительности, различия и доработка.
- `/Users/alphabravo/Downloads/katalog-elementov/sravnenie-kandidaty.json` — 18 объектов `{family, our_media, level, notes}`.
- `/Users/alphabravo/Downloads/katalog-elementov/OTCHET-sravnenie-kandidaty.md` — этот отчёт.

## Проверенные корни

- `/Users/alphabravo/Documents/BASE/_TEMPLATE/qa-samples`
- `/Users/alphabravo/Documents/BASE/05-READY`
- `/Users/alphabravo/Documents/BASE/01-NICHES`
- `/Users/alphabravo/Documents/BASE/02-ENGINES`
- `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ`
- `/Users/alphabravo/Downloads/Draw-Studio-src`
- `/Users/alphabravo/Downloads/READY`

## Найденные корпуса

- В `BASE/05-READY`, `BASE/02-ENGINES` и `_TEMPLATE/qa-samples`: 970 медиафайлов `<50 MiB`.
- В `BASE/01-NICHES` внутри qa/sample/preview: 627 медиафайлов `<50 MiB`, из них 52 видео.
- В `Draw-Studio-src` и `READY`: 44 медиафайла `<50 MiB`; пригодных рендеров эффектов не найдено.
- В `BASE/05-READY`: 38 видео `<50 MiB`.
- Отдельный generated QA-набор `tonrohr_first3_graphics`: 18 fixtures и 1 contact sheet.

## Что не вышло

- Пути с буквальными именами `first_video_000_030_real_media_v1` и `q01_motion_v2` на диске не найдены.
- Для `EMPTY` образец не выбран: семейство состоит из пустых/неописанных карточек и не определяет технику.
- Для `PHOTO-IMAGE`, `OPACITY-FADE`, `INSET-WINDOW`, `SCALE-ZOOM`, `TEXT-TYPOGRAPHY`, `SATURATION-COLOR`, `OTHER`, `GEOMETRY-SHAPE` есть только частичное соответствие; причины и точные доработки записаны в таблице и JSON.

## Проверки

- JSON синтаксически валиден.
- В JSON ровно 18 объектов и 18 уникальных `family`.
- Распределение уровней: 9 + 8 + 1 = 18.
- Все 17 ненулевых `our_media` существуют на диске.
