# Приёмка каталога семейств и пробелов покрытия

Дата проверки: 2026-08-13

Источники:

- `/Users/alphabravo/Downloads/katalog-elementov/OTCHET-semejstva.md` — 33 135 bytes, 352 строки, mtime 2026-08-13 08:16:20.
- `/Users/alphabravo/Downloads/katalog-elementov/data.json` — 2 215 645 bytes, 17 355 строк, mtime 2026-08-13 08:11:59.
- Только листинг путей и размеров MP4 в `/Users/alphabravo/Downloads` и `/Users/alphabravo/Documents`; видео не открывались.

## 1. Приёмка OTCHET-semejstva.md

### Фактический состав data.json

- Карточки `elements`: **942**.
- Записи `projects`: **9**.
- Уникальные YouTube ID: **8**. Видео `QOUszAHEZAE` заведено двумя project-записями.
- Записи `categories`: **19**, но это дублирующийся реестр из **8** уникальных названий.
- Категории, реально используемые карточками: **7** — БАГ 1, Зум 45, Инфографика 217, Переход 342, Работа с футажем 124, Типографика 196, Частицы 17. Сумма: **942**.
- `Работа с камерой` присутствует в реестре, но имеет 0 карточек и в ночном отчёте отсутствует.

### Покрытие семействами

- Ночной отчёт заявляет **18 семейств**, **0 orphans** и **942 из 942 карточек, 100%** покрытия хотя бы одним семейством.
- Число карточек и суммы по 7 используемым нишам совпадают с `data.json`: **942**.
- Поэтому агрегатное покрытие, которое можно принять по отчёту: **942/942 = 100,00%**.
- Ограничение проверки: в `data.json` нет поля семейства, а в отчёте ID каждого семейства обрезаны после первых 10 значений. Полный union из 942 ID и принадлежность каждой карточки независимо не воспроизводятся. Заявление 100% подтверждено только агрегатами, не покарточным реестром.
- Качество покрытия неоднородно: **32** карточки отнесены к `EMPTY`, **94** — к `OTHER`. В самом `data.json` у **39** карточек пустое `name`, у **32** пустое `technique`.

### Базовый набор против уникальных вставок

Полноценная разметка означает наличие в нише обеих меток — `Базовый` и `Уникальный`.

- **Есть, 6 ниш:** Зум; Инфографика; Переход; Работа с футажем; Типографика; Частицы.
- **Нет/неполная, 2 логические ниши:**
  - БАГ — есть только `Базовый` (`empty`, 1 карточка), `Уникальный` отсутствует.
  - Работа с камерой — зарегистрирована в `categories`, но имеет 0 карточек и полностью отсутствует в отчёте.

Итог для 7 используемых ниш: полное base/unique-разделение есть в **6 из 7 (85,71%)**. Если учитывать все 8 уникальных названий реестра категорий — **6 из 8 (75,00%)**.

### Сверка с реализованным в Draw Studio / BASE

- Сверки с кодом, конструкторами, пресетами или реестрами Draw Studio/BASE в ночном отчёте **нет**.
- Семейств, явно помеченных `реализовано`: **0**.
- Статусы в отчёте: **17 `частично`**, **1 `нет`** (`EMPTY`), но без ссылок на реализации и без доказательной матрицы `семейство → путь/символ/движок`.
- Блокер ночного отчёта неверен: исходник существует в `/Users/alphabravo/Downloads/Draw-Studio-src/src`; BASE существует в `/Users/alphabravo/Documents/BASE`, включая `/Users/alphabravo/Documents/BASE/02-ENGINES` и старые ниши `/Users/alphabravo/Documents/BASE/01-NICHES`.

## 2. Пробелы покрытия проектов и видео

Метрика частичного разбора: карточки на минуту плюс достижение таймкодами конца видео. Порог разреженного каталога для приоритета добора — менее 3 карточек/мин; плотные разобранные видео в этом наборе дают 6,42–23,08 именованных карточек/мин.

### Уже разобраны достаточно плотно — 5 уникальных видео

- `nNgwfV-_ydM` — 169 карточек, 11,38/мин, таймкоды до 14:51 из 14:51; энергоэффективность/радиатор DIY.
- `QOUszAHEZAE` — основная запись 343 именованные карточки, примерно 23,08/мин, таймкоды до 14:51.9 при фактической длине около 15:02; бетонная труба/охлаждение.
- `gMKGyuqZFMs` — 104 карточки, 6,57/мин, таймкоды до 15:47 из 15:49; генеалогия и фамилии.
- `4QRQ90F0Iv8` — 100 карточек, 6,42/мин, таймкоды до 15:34 из 15:34; домашняя топливная ячейка.
- `zcHZn8y2f_s` — 105 карточек, 7,15/мин, таймкоды до 14:34.6 из 14:41.5; хранение солнечной энергии.

### Разобраны частично/разреженно — 3 уникальных видео

- `4wpboHGX6M4`, **30 Dinge, die jede deutsche Mutter in den 1960ern im Haus hatte** — 13 карточек на 34:34.9, **0,38/мин**; затронуты 12 минут, последний таймкод 28:52.8. Явный крупный пробел.
- `L0nNAFKmHPw`, **7 Dörfer in Deutschland, wo deine Rente doppelt so weit reicht** — 27 карточек на 19:16, **1,40/мин**; есть только категории Переход 26 и Частицы 1, отсутствуют карточки инфографики, типографики, карт и работы с футажем.
- `tReHGB6q4o0`, **If Your Surname Is on This List, This Is The Tribe You Come From** — 42 карточки на 22:16, **1,89/мин**; таймкоды доходят до 21:57.8, но плотность в 3,4–6 раз ниже других полноразмерных разборов.

### Повреждённая/лишняя project-запись

- `c7b3604b-d801-49ca-b17e-4ba549e1e1d9` — 39 карточек, progress 6%, `completed=false`, все 39 без имени, 32 без `technique`, таймкоды только 0:00–0:57.
- Это не отдельное видео, а дубликат `QOUszAHEZAE`, уже покрытого основной записью `199a5705-1235-480d-8f3b-c76f02d40c58` с 343 именованными карточками. Нужна дедупликация, а не новый разбор видео.

### Полностью не разобранные среди projects

- Записей проекта с 0 карточек: **0**.
- Уникальных видео из `data.json` без карточек: **0**.
- Утверждение ночного отчёта «9 видео из 9 разобраны» некорректно: это 9 project-записей, но 8 уникальных видео; 3 уникальных видео разрежены, одна project-запись — незавершённый дубликат.

### Готовый разбор вне data.json

- На диске найден `4yavUTCeCp0`, **30 Dinge, die 1970 in Deutschland völlig normal waren – heute aber undenkbar sind**, которого нет в `data.json`.
- В `/Users/alphabravo/Downloads/autorazmetka-new/4yavUTCeCp0/elements-4yavUTCeCp0-v2.json` уже готовы **624 карточки**, 17,6/мин, полный отсмотр 0:00–35:33 без дыр.
- Это главный каталоговый пробел: сначала импортировать готовый проект и 624 карточки, а не повторно разбирать видео.

### Ранжированный список следующих видео

В `data.json` только 8 уникальных видео, поэтому честный top-10 только из него невозможен. Позиции 1–8 ранжированы по `data.json`; позиции 9–10 — дополнительные локальные кандидаты вне `data.json`, явно отделённые.

1. **`4wpboHGX6M4`** — история быта Германии 1960-х; 0,38 карточки/мин. Ожидаемые новые/недобранные семейства: номерная карточка предмета, предметный архивный inset, журнальная типографика, тёплая засветка/film-burn, рамка TV/фото, listicle chapter card.
2. **`L0nNAFKmHPw`** — пенсия и доступная жизнь в Германии; 1,40 карточки/мин и только переходы/частицы. Ожидаются: карта/геометка, ranking card, price/cost comparison, нижняя плашка локации, карточка деревни, B-roll frame, числовая инфографика.
3. **`tReHGB6q4o0`** — племена, фамилии и генеалогия; 1,89 карточки/мин. Ожидаются: tribal map, genealogy/lineage tree, этимологическая типографика, manuscript spotlight, countdown/numbering, map morph и RGB/glitch bridge.
4. **`4QRQ90F0Iv8`** — топливная ячейка; 6,42/мин, низший показатель среди плотной группы. Проверить добор: technical cutaway, energy-flow diagram, efficiency comparison, cost table, technology timeline.
5. **`gMKGyuqZFMs`** — география фамилий; 6,57/мин. Проверить добор: map labels, document highlight, archival gallery, surname/location lower-third, CTA badge.
6. **`zcHZn8y2f_s`** — хранение солнечной энергии; 7,15/мин. Проверить добор: storage schematic, process flow, capacity/cost comparison, film-burn/glitch bridge, technical callout.
7. **`nNgwfV-_ydM`** — радиатор и охлаждение; 11,38/мин. Низкий приоритет: heat-flow diagram, calculation card, numbered split-screen, DIY step card, semantic desaturation.
8. **`QOUszAHEZAE`** — бетонная труба и охлаждение; примерно 23,08/мин. Новый разбор не нужен; только дедупликация project-записей и проверка malformed `duration="1:05"`. Семейства: thermal view, grid/inset, heat-transfer schematic, construction sequence.
9. **`5ljbdnLOUGU` — вне data.json**, локально скачана только 150-секундная голова. Ниша: экономическая история США, income tax. Ожидаются: vintage newspaper/photo card, gold-serif subtitle, date/stat card, editorial title, archive pan/zoom.
10. **`oDJdGRyimio` — вне data.json**, локально скачана только 150-секундная голова. Ниша: экономическая история США, minimum wage. Ожидаются те же базовые семейства плюс wage timeline, number comparison и factory/archive inserts.

## 3. MP4 на диске

Просканировано **637 MP4** в двух корнях. Большинство — внутренние рендеры BASE, тесты и production assets. По очевидным путям корпуса разбора и reference/competitor найдено **28 вероятных файлов материалов конкурентов/эталонов**: 23 файла в `autorazmetka-new`, 3 307 849 494 bytes (**3,08 GiB**), и 5 явных reference/competitor MP4 в Documents, 1 057 608 136 bytes (**0,98 GiB**). Итого **4 365 457 630 bytes, 4,07 GiB**. Видео не открывались.

### Подтверждённый рабочий корпус autorazmetka-new — 23 MP4

- `/Users/alphabravo/Downloads/autorazmetka-new/4QRQ90F0Iv8/proxy-h264.mp4` — 168 981 370 bytes (161,15 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/4QRQ90F0Iv8/source.mp4` — 85 915 019 bytes (81,93 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/4wpboHGX6M4/proxy-h264.mp4` — 339 936 423 bytes (324,19 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/4wpboHGX6M4/source.mp4` — 199 273 868 bytes (190,04 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/4yavUTCeCp0/_review_4yav/proxy/video.mp4` — 120 456 781 bytes (114,88 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/4yavUTCeCp0/frames_segment_840_891/segment.mp4` — 2 953 146 bytes (2,82 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/4yavUTCeCp0/proxy-h264.mp4` — 335 800 648 bytes (320,24 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/4yavUTCeCp0/source.mp4` — 204 257 884 bytes (194,80 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/L0nNAFKmHPw/proxy-h264.mp4` — 203 836 490 bytes (194,39 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/L0nNAFKmHPw/sonnet-v4/chunk-03/proxy_720_960.mp4` — 786 480 bytes (0,75 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/L0nNAFKmHPw/source.mp4` — 125 270 595 bytes (119,47 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/QOUszAHEZAE/proxy-h264.mp4` — 189 728 897 bytes (180,94 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/QOUszAHEZAE/source.mp4` — 103 439 894 bytes (98,65 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/gMKGyuqZFMs/proxy-h264.mp4` — 181 601 676 bytes (173,19 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/gMKGyuqZFMs/review/proxy-480p.mp4` — 35 218 813 bytes (33,59 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/gMKGyuqZFMs/source.mp4` — 126 976 985 bytes (121,09 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/nNgwfV-_ydM/proxy-h264.mp4` — 129 189 318 bytes (123,20 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/nNgwfV-_ydM/source.mp4` — 88 602 992 bytes (84,50 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/tReHGB6q4o0/.otsmotr-v2/analysis-proxy.mp4` — 79 676 944 bytes (75,99 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/tReHGB6q4o0/proxy-h264.mp4` — 238 537 181 bytes (227,49 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/tReHGB6q4o0/source.mp4` — 154 159 866 bytes (147,02 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/zcHZn8y2f_s/proxy-h264.mp4` — 107 468 796 bytes (102,49 MiB)
- `/Users/alphabravo/Downloads/autorazmetka-new/zcHZn8y2f_s/source.mp4` — 85 779 428 bytes (81,81 MiB)

### Явные reference/competitor MP4 в Documents — 5 файлов

- `/Users/alphabravo/Documents/BASE/01-NICHES/ФАРАОН ЕГИПЕТ ФРАНЦИЯ/reference/etalon/etalon-full.mp4` — 259 256 958 bytes (247,25 MiB)
- `/Users/alphabravo/Documents/BASE/01-NICHES/ФАРАОН ЕГИПЕТ ФРАНЦИЯ/reference/nemec/nemec_sugM4cQuRtg.mp4` — 731 898 677 bytes (697,99 MiB)
- `/Users/alphabravo/Documents/BASE/04-RESEARCH/competitor-recon/5ljbdnLOUGU_head.mp4` — 8 998 314 bytes (8,58 MiB)
- `/Users/alphabravo/Documents/BASE/04-RESEARCH/competitor-recon/oDJdGRyimio_head.mp4` — 7 314 197 bytes (6,98 MiB)
- `/Users/alphabravo/Documents/BASE/04-RESEARCH/es-skyscrapers/etalon/q6-NoymUdmY.mp4` — 50 139 990 bytes (47,82 MiB)

## ВЕРДИКТ

1. **FAIL — полный каталог не собран.** В `data.json` 8 уникальных видео, 3 разрежены; есть повреждённый дубликат; готовый полный разбор `4yavUTCeCp0` на 624 карточки не импортирован.
2. **FAIL — семейства и base/unique не готовы к строгой приёмке.** Агрегат 942/942 (100%) есть, но нет полного покарточного family mapping; 32 `EMPTY`, 94 `OTHER`; полное base/unique-разделение только в 6 из 7 используемых ниш.
3. **FAIL — сверки с реализованным нет.** Явно реализованных эффектов: 0; 17 неподтверждённых `частично`; доступные Draw Studio и BASE не проверены.

**Общий вердикт: FAIL.** Следующее действие: импортировать готовые 624 карточки `4yavUTCeCp0`, дедуплицировать `QOUszAHEZAE`, затем плотно добрать `4wpboHGX6M4`, `L0nNAFKmHPw`, `tReHGB6q4o0`; после этого построить доказательную матрицу `семейство → Draw Studio/BASE implementation`.
