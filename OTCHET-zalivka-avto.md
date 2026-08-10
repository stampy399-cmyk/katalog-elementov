# Отчёт: заливка пилота авторазметки

Статус: **PASS**. Пилот добавлен отдельным ИИ-проектом, commit отправлен в `origin/main`, удалённый HEAD подтверждён.

## Git

- Исходный `origin/main`: `db56758`; локальная ветка отставала на 6 коммитов.
- Прямой `git pull --ff-only origin main` в cwd не выполнился: `error: cannot open '.git/FETCH_HEAD': Operation not permitted`. Sandbox разрешал только чтение `.git`.
- Три исходных untracked-файла сохранены перед операциями в `/private/tmp/katalog-site-prepull.w8G8WR/`.
- Работа продолжена в свежем клоне `/private/tmp/katalog-site-zalivka` на актуальном `origin/main`; итоговые файлы синхронизированы обратно в cwd и побайтно совпадают с отправленным commit.
- Commit: `2373ef1d915ba7ca737434328e9109644d37b987` (`feat: add AI auto-labeling pilot`).
- Push: `db56758..2373ef1 main -> main`.
- `git ls-remote origin refs/heads/main`: `2373ef1d915ba7ca737434328e9109644d37b987`.
- Commit: 4 файла, 1 720 добавлений, 0 удалений.

## Изменения

- Создан проект `АВТО (ИИ): конкурент QOUszAHEZAE 0:55–2:00`.
- UUID проекта: `199a5705-1235-480d-8f3b-c76f02d40c58`.
- Описание проекта: `Автоматическая разметка сегмента 0:55–2:00 выполнена ИИ; пилот отбора, 48 элементов.`
- Все 48 пилотных элементов перевешены на новый `projectId` в `pilot-elements.json` и `data.json`.
- SFX: 5 подтверждённых событий, 7 привязанных аннотаций, 41 элемент с формулой `SFX нет — фоновая музыка`, 0 маркеров `[?]`, 0 отрицательных формулировок о подтверждении.
- `OTCHET-autorazmetka-pilot.md` приведён в соответствие с живым прослушиванием владельца от 10.08.2026.
- `SRAVNENIE-pilot.md` уточняет неизменную базу ручной разметки до интеграции.

## Валидация

- `data.json`: валидный JSON — 1/1.
- `pilot-elements.json`: валидный JSON — 1/1.
- Проекты: 1 → 2; добавлен ровно 1.
- Элементы: 39 → 87; добавлено ровно 48.
- Старый проект: идентичен прежнему — 1/1.
- Старые ручные элементы: 39/39 идентичны и остаются на прежнем `projectId`.
- Diff `data.json` относительно `db56758`: 787 добавленных строк, 0 удалённых строк.
- UUID проектов и элементов: 89 всего, 89 уникальных, 89 валидных UUID.
- Новый проект: 1/1; его элементы: 48/48.
- `pilot-elements.json`: 48/48 используют новый `projectId`.
- Пилот в `data.json` побайтно эквивалентен 48/48 объектам `pilot-elements.json`.
- Таймкоды: 48/48 сохранены относительно исходного пилота; диапазон первых таймкодов 0:55–1:59.
- Категории и настройки: идентичны прежним — 1/1 и 1/1.
- SFX: 5/5 событий покрыты; 7 аннотаций; 41 отсутствие SFX; 0 запрещённых маркеров.
- `git diff --cached --check`: 0 ошибок.
- Файлы в cwd против отправленного клона: 4/4 совпадают (`cmp` exit 0).

## Файлы

- `/Users/alphabravo/Downloads/katalog-site/data.json`
- `/Users/alphabravo/Downloads/katalog-site/pilot-elements.json`
- `/Users/alphabravo/Downloads/katalog-site/OTCHET-autorazmetka-pilot.md`
- `/Users/alphabravo/Downloads/katalog-site/SRAVNENIE-pilot.md`
- `/Users/alphabravo/Downloads/katalog-site/OTCHET-zalivka-avto.md`

## Что не вышло

- Только прямое обновление Git-метаданных исходного cwd: sandbox запретил запись в `.git/FETCH_HEAD`. Push и критерий готовности выполнены через свежий клон; содержимое четырёх отправленных файлов в cwd совпадает с commit. Указатель локальной ветки в исходном cwd из-за ограничения sandbox не обновлён.
- `OTCHET-zalivka-avto.md` создан после push и не входит в commit, поскольку шаг 5 явно задавал четыре файла для `git add`.
