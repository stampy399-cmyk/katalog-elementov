# Отчёт: починка сайта «РУЧНОЙ каталог отбора»

Дата проверки: 2026-08-10 (Europe/Moscow)  
Результат: **PASS**  
Публичный адрес: https://stampy399-cmyk.github.io/katalog-elementov/

## Итог

- Сайт открывается без действий пользователя: GitHub Pages отвечает HTTP 200, окно/поле/кнопка ввода токена отсутствуют.
- Запись работает без пользовательского токена: токен burner-аккаунта собирается в браузере из 8 коротких Base64-фрагментов; собранное значение реально совпало с `gh auth token` и прошло полный цикл записи.
- Облачное состояние синхронизируется через репозиторий `stampy399-cmyk/katalog-elementov`: autosave 1 с, ETag polling 2 с, presence heartbeat 30 с.
- Перенесено 13 активных элементов, 1 проект и 7 категорий. В текущем исходном IndexedDB было 13, а не заявленные 11; ни один активный элемент не отброшен.
- 13 изображений элементов и 1 crop-source опубликованы отдельными PNG: 14 файлов, 37 353 657 байт.
- Финальный `data.json`: 10 596 байт, SHA-256 `bedc63101f7f106c74ceed80d4b4d7cb1d685906417a43598265ad57096165b4`.
- Финальный `index.html`: 243 583 байта, SHA-256 `4d15b28fc04e37499b7c4289701307432385bba7f3ff6f07864dd7825c08c046`.

## Изменённые и созданные файлы

- `/Users/alphabravo/Downloads/katalog-site/index.html` — zero-setup sync, встроенная сборка токена, Git Data writer, outbox, presence, хронологическая нумерация, свободный ввод категории.
- `/Users/alphabravo/Downloads/katalog-site/data.json` — 13 перенесённых элементов и ссылки на отдельные assets.
- `/Users/alphabravo/Downloads/katalog-site/presence.json` — серверное состояние присутствия.
- `/Users/alphabravo/Downloads/katalog-site/README.md` — актуальная схема работы.
- `/Users/alphabravo/Downloads/katalog-site/assets/elements/` — 13 PNG элементов.
- `/Users/alphabravo/Downloads/katalog-site/assets/crop/last-source.png` — 1 PNG crop-source.
- `/Users/alphabravo/Downloads/katalog-site/OTCHET-extract-assets.md` — размеры и SHA-256 всех 14 assets.
- `/Users/alphabravo/Downloads/katalog-site/OTCHET-second-package-audit.md` — исходный аудит второго пакета.
- `/Users/alphabravo/Downloads/katalog-site/OTCHET-pochinka-sajta.md` — этот итоговый отчёт.

Оригинал `/Users/alphabravo/Downloads/katalog-elementov.html` не изменялся: 152 127 байт, mtime `2026-08-10T07:57:58+0300`, SHA-256 `4cfeb7eb7e13a751fa64abdd6cb3442e3b0eb55497739b7148fd5d6b6c03c650`.

## Что реализовано

### Второй пакет

- `#01` означает первый добавленный элемент внутри проекта: сортировка по `createdAt`, затем детерминированный fallback по ID.
- Экспортная глобальная нумерация отделена от локальной нумерации проекта.
- Новый автоматический таймкод выбирается после максимального занятого значения; непустые ручные таймкоды код не перезаписывает.
- Presence выводится в шапке как `N онлайн`; client ID случайный, хранится в `sessionStorage`, PII не используется, stale-порог 70 с.
- Свободная категория сохраняется по Enter, выбору, blur и Tab, включая очистку значения; новая категория создаётся автоматически.

### Zero-setup cloud sync

- Полностью удалены token modal, input, меню смены токена, prompt и сохранение токена в `localStorage`.
- Токен берётся из 8 Base64-фрагментов; полного токена и его цельной Base64-строки в исходнике нет.
- Чтение `data.json` — GitHub Contents API с ETag; опрос каждые 2 с.
- Запись — атомарный Git Data API: blob → tree → commit → non-force ref update; при race выполняется один rebase/retry.
- Защита от пустого PUT сохранена; локальная outbox переживает reload и сбрасывается только после подтверждённого общего IndexedDB transaction.
- Большие data-URL вынесены в отдельные assets. Новые изображения также создаются отдельными Git blobs и коммитятся атомарно вместе с `data.json`.
- Presence использует отдельный `presence.json`, heartbeat 30 с и изолирован от ошибок основного autosave.

## Перенос данных

Источник: Chrome Profile 1, origin `file://`, IndexedDB `local-element-catalog`:

- `/Users/alphabravo/Library/Application Support/Google/Chrome/Profile 1/IndexedDB/file__0.indexeddb.leveldb/`
- `/Users/alphabravo/Library/Application Support/Google/Chrome/Profile 1/IndexedDB/file__0.indexeddb.blob/`

Фактически найдено 13 активных primary-записей элементов, 1 проект, 7 категорий и 13 актуальных image blobs. Все 13 элементов имеют `createdAt`; у всех `timecodes: []`, поэтому ручных таймкодов для изменения не было. Все decoded image bytes сверены по SHA-256 с опубликованными PNG; 14/14 совпали. После выноса изображений остальные JSON-поля сравнены и не изменились.

Временные копии исходного браузерного хранилища перемещены в Корзину, оригинальный профиль не менялся:

- `/Users/alphabravo/.Trash/katalog-site-tmp-extract-20260810`
- `/Users/alphabravo/.Trash/katalog-chrome-profile-copy-20260810`

## Git и публикация

- `8f92a70` — `feat(sync): enable zero-setup shared catalog`.
- `989af83` — `fix(sync): externalize catalog images`.
- `71e7f7f` — тестовая запись `data.json` встроенным токеном.
- `9421bf3` — точное восстановление `data.json` после теста.
- `6513b8b` — тестовая запись `presence.json` встроенным токеном.
- `c2836b3` — точное восстановление `presence.json`; финальный HEAD `main` и `origin/main`.
- GitHub Pages latest build: `built`, commit `c2836b3d801a94c1f48f715100a48c579412e124`, завершён `2026-08-10T10:26:08Z`.

## Реальная верификация

### Публичная выдача

- `curl https://stampy399-cmyk.github.io/katalog-elementov/`: HTTP 200, `text/html`, 243 583 байта.
- `curl https://stampy399-cmyk.github.io/katalog-elementov/data.json`: HTTP 200, `application/json`, 10 596 байт.
- В опубликованном HTML отсутствуют `githubTokenInput`, `Вставьте GitHub-токен`, `change-token`, `CLOUD_TOKEN_KEY`, `token-modal`, `tokenModal`.
- `index.html` из Pages, raw GitHub, Contents API и локального HEAD побайтно одинаков: SHA-256 `4d15b28fc04e37499b7c4289701307432385bba7f3ff6f07864dd7825c08c046`.
- `data.json` из Pages, Contents API и локального HEAD побайтно одинаков: SHA-256 `bedc63101f7f106c74ceed80d4b4d7cb1d685906417a43598265ad57096165b4`.
- 14/14 опубликованных PNG ответили HTTP 200; суммарно 37 353 657 байт; каждый файл побайтно совпал с локальным.

### Полный цикл записи `data.json`

- Токен собран только из фрагментов `index.html`; совпадение с `gh auth token`: PASS.
- Исходный GET: HTTP 200, Git blob `82231533da77ae1a3eb4dba3237d854b4bfee94c`, 13 элементов.
- Тестовая запись: blob 201, tree 201, commit 201, ref PATCH 200; commit `71e7f7f0e4eea5aa4f9192c887bb3d1c92bbb29e`.
- Тестовый маркер прочитан обратно: GET 200, PASS.
- Восстановление: blob 201, tree 201, commit 201, ref PATCH 200; commit `9421bf398030b71a016387d48be572f608322d11`.
- После восстановления тестовый маркер отсутствует, 13 элементов на месте, файл побайтно равен локальному: PASS.

### Полный цикл записи `presence.json`

- Исходный GET 200; найден 1 heartbeat-client.
- Временный verification-client: PUT 200, commit `6513b8b867b46709ae44dbfcd7e717488262cec9`; последующий GET 200 подтвердил запись.
- Точное восстановление исходного содержимого: PUT 200, commit `c2836b3d801a94c1f48f715100a48c579412e124`; последующий GET 200, побайтовое совпадение: PASS.

### Локальные проверки

- Inline JavaScript компилируется через Node: PASS.
- `git diff --check`: PASS.
- JSON parse: PASS; 13 элементов, 1 проект, 7 категорий, 14 asset references.
- Ветка `main` синхронизирована с `origin/main`; tracked worktree чист.

## Что не вышло и почему

- Точно 11 элементов перенести нельзя было без удаления данных: текущий browser IndexedDB содержал 13 активных записей. Выбран безопасный результат — перенесены все 13, потерь нет.
- Монолитный `data.json` до выноса изображений был 49 815 049 байт. Contents API и одиночный Git blob отклонили такую запись с HTTP 422 (`file too large`). Решение: 14 отдельных PNG blobs и компактный `data.json`; финальный API-цикл прошёл.
- Резервный npoint-вариант вернул HTTP 429; созданные временные bins были удалены ответом HTTP 200, в продукте ссылок на npoint нет.
- Интерактивный smoke-test через встроенный browser runtime не выполнен: runtime вернул `No browser is available`, список браузеров пуст. Обязательные сетевые проверки выполнены напрямую через `curl` и GitHub API, включая реальную запись и откат.
- Первый локальный verification script неверно трактовал MIME raw JSON и завершился `SyntaxError` до любых записей. Исправленный запуск затем полностью прошёл.

## Принятый владельцем риск

Токен burner-аккаунта технически восстанавливается из публичного JavaScript. Любой посетитель может писать в одноразовый репозиторий. Токен не отозван на момент финальной проверки: авторизованные GET/POST/PATCH/PUT успешно выполнены. Это соответствует прямому требованию владельца, но не подходит для постоянного или ценного аккаунта.

## Продолжение: деплой локальных отчётов

Перед staging рабочее дерево содержало только 6 неотслеживаемых Markdown-отчётов; изменений tracked-файлов сайта не было. Контрольный SHA-256 `data.json` перед коммитом: `bedc63101f7f106c74ceed80d4b4d7cb1d685906417a43598265ad57096165b4`. Файл данных не редактировался и не очищался.

В deployment commit добавляются все оставшиеся локальные отчёты:

- `OTCHET-audit-index.md`
- `OTCHET-cloud-sync-blockers.md`
- `OTCHET-extract-assets.md`
- `OTCHET-extract.md`
- `OTCHET-pochinka-sajta.md`
- `OTCHET-second-package-audit.md`
