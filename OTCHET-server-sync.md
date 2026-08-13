# Анализ server sync

Дата проверки: 2026-08-13. Только анализ; код, данные, git refs и настройки сайта не менялись.

## Схема потоков данных

GitHub `main` → GitHub Pages раздаёт `index.html`, `data.json`, `ours_tech_full.json`, `owner-baseline-data.js`, `catalog-data.js` и `sravnenie-data.js`; при старте страница сначала читает локальный IndexedDB `local-element-catalog`, затем GET-запросом получает опубликованный `data.json` и делает трёхстороннее слияние «опубликованное + прежний serverBaseline + локальная база», после чего снова записывает результат только в IndexedDB. Поэтому на том же URL и в том же профиле браузера видны локальные черновики, хотя Pages и свежий/инкогнито-профиль показывают только git-версию. `ours_tech_full.json` и `sravnenie-data.js` не участвуют в этом merge: первый загружается напрямую в память, второй подключён как статический JS. WebSocket, SSE, service worker и внешний sync-сервер в текущем live-коде отсутствуют.

## Доказательства

- Live `index.html` побайтно совпадает с `raw.githubusercontent.com/.../main/index.html` и `origin/main:index.html`: SHA-256 `70710e3115da0b9469bee057b7e1df77ec98d9713e5031514b09c02e35c68b8f`.
- Так же совпали ещё 6 проверенных live-файлов: `data.json`, `ours_tech_full.json`, `catalog-data.js`, `owner-baseline-data.js`, `sravnenie-data.js`, `presence.json`.
- GitHub `main` и live соответствуют commit `5ee318cd4b87db767adc6b03ab01d1877e80b6ff`. Локальная `main` на 2 commit впереди (`81c22ba`, `371ae89`), но эти изменения в live-файлы не попали.
- Live `data.json`: 9 проектов, 2 852 элемента, 6 273 513 bytes. Live `ours_tech_full.json`: 216 записей, 96 421 bytes.
- `index.html:771–791` задаёт IndexedDB и URL; `index.html:1325–1461` читает/пишет локальные stores; `index.html:3539–3680` GET-ит и сливает `data.json`; `index.html:3683–3804` считает presence только через `sessionStorage`, `localStorage` и `BroadcastChannel`.

## Текущие endpoints

- `GET https://stampy399-cmyk.github.io/katalog-elementov/data.json?v=<timestamp>` — автоматически при каждом запуске и по кнопке «Обновить с сервера»; `cache: no-store`. Это обычный Pages-файл из git.
- `GET https://stampy399-cmyk.github.io/katalog-elementov/ours_tech_full.json` — 216 статических записей «МЫ УМЕЕМ»; без локального merge и без записи.
- `GET /katalog-elementov/owner-baseline-data.js` — статический baseline для трёхстороннего merge, если в IndexedDB ещё нет `serverBaseline`.
- `GET /katalog-elementov/catalog-data.js` — embedded-копия каталога; для HTTP-сайта не является источником каталога, используется `PUBLISHED_CATALOG` только при `file:`.
- `GET /katalog-elementov/sravnenie-data.js` — статические данные сравнения; не синхронизируются через `data.json`.
- `GET https://raw.githubusercontent.com/stampy399-cmyk/katalog-elementov/main/assets/...` — только fallback опубликованных картинок.
- `GET https://noembed.com/embed?url=...` и `GET https://www.youtube.com/iframe_api` — метаданные/плеер, не каталог.
- `presence.json` сейчас не читается и не пишется. Текущих `api.github.com`, WebSocket, SSE или PUT/PATCH-запросов нет.

## Что именно сохраняется и сливается

- Любые UI-правки проектов и элементов через 240 ms пишутся в IndexedDB stores `projects`, `elements`, `categories`, `settings`. Надпись «Сохранено» означает именно «сохранено локально в этом браузере» (`title` индикатора сообщает это явно), не сервер/git.
- При обновлении локальные изменения полей относительно `serverBaseline` побеждают опубликованные. Для элементов сервер владеет только `id`, `projectId`, `family`, `freq_videos`, `freq_total`, `tier`; прочие локально изменённые поля, локальные добавления и локальные удаления сохраняются. Поэтому кнопка не сбрасывает черновик; параметр `force: true` передаётся, но в функции не используется.
- Локальные preview data URLs идут мимо git в `localStorage` (`katalog-elementov.local-previews`, максимум 14 записей / 3 MiB) и могут визуально подменять ещё не опубликованную картинку.
- `1 онлайн` — минимум текущая вкладка. Другие вкладки того же origin считаются через `BroadcastChannel`/`localStorage`; межмашинного presence сейчас нет. Функция remote-presence осталась, но не вызывается.
- Опциональный «Автобэкап» пишет `katalog-elementov-backup.json` только в вручную выбранную локальную папку через File System Access API. В `data.json` и git он сам ничего не импортирует.
- Скрипты в `scripts/` могут переписывать `data.json` и производные файлы только при ручном запуске. Watcher, cron, hook или автосинк из рабочей копии не найден. Фраза README «Синхронизация выполняется автоматически» устарела.

## Кто раньше писал в git

До commit `8e770a2` страница действительно имела браузерный GitHub writer: `GET/PUT https://api.github.com/repos/stampy399-cmyk/katalog-elementov/contents/data.json` и Git Data API `https://api.github.com/repos/stampy399-cmyk/katalog-elementov/git/...`; token хранился под `katalog-elementov.cloud-token`, правки ставились в outbox и отправлялись пакетно. История подтверждает 105 commit `chore: update catalog data` (2026-08-10 14:30:03 — 2026-08-11 17:12:59) и 358 commit `chore: update presence`. Presence-writer удалён в `67baa0d`, embedded credential — в `0d08e14`, весь GitHub API write path — в `8e770a2`. В текущем live-коде этого writer нет; старая незакрытая вкладка могла продолжать исполнять загруженный старый JS, пока её token оставался действительным.

## Что течёт мимо git

Только состояние конкретного browser profile: IndexedDB-каталог, локальные previews, текущие drafts/presence и выбранный локальный backup. Оно может отображаться владельцу поверх live Pages, но не передаётся другим посетителям и не меняет live-статику. Глобально опубликованных данных «мимо git» не найдено: проверенные live-файлы равны `origin/main`.

## Как заморозить и гейтить

1. Для немедленной серверной заморозки от исторического writer: отозвать старый GitHub PAT, закрыть старые вкладки и защитить `main` от прямых push/API updates.
2. Для стабильного public view: в production-режиме не открывать/не сливать IndexedDB, а всегда рендерить чистый `data.json`; редактор и overlay включать только отдельным `draftMode`.
3. Практический safety-gate: `draftMode` только на `localhost` или по явному `?draft=1`; для настоящего owner-only доступа нужен отдельный editor origin с аутентификацией, потому что query-параметр и секрет в статическом Pages JS не являются защитой.
4. Добавить отдельное действие «Сбросить к опубликованному», которое перед импортом делает export локального snapshot и затем заменяет IndexedDB чистым `data.json`; текущая кнопка «Обновить с сервера» этого не делает.

PASS · источник утечки найден: да — IndexedDB/preview-cache; гейт: public=только data.json, drafts=отдельный authenticated editor.
