# Отчёт: исправление обновления каталога

## Было

- Каталог сначала загружался из IndexedDB (`projects`, `elements`, `categories`, `settings`, `cloudSync`).
- Семь упоминаний `localStorage` относятся к служебным ключам: presence, preview/cache-маркеры, cloud outbox и backup; основной каталог хранится не там.
- Первый remote pull шёл через GitHub Contents API. При локальном cloud outbox `canApplyRemote()` запрещал применить снимок и оставлял его в `pendingSnapshot`, поэтому после F5 интерфейс продолжал показывать старую IndexedDB-копию.
- Исходный `data.json`: `version=5`, `exportedAt=2026-08-11T10:33:21Z`, 331 элемент, 5 проектов.

## Изменено

- `index.html` при каждой загрузке до первой отрисовки делает same-origin `fetch("data.json?v=<timestamp>", { cache: "no-store" })`.
- Серверный снимок сравнивается с последним применённым по `version`, затем по `exportedAt`; более свежий применяется.
- Несохранённый outbox трёхсторонне сливается (`base + server + local`) существующим field-level merge. Успешно смёрженные локальные правки остаются в очереди отправки.
- При конфликте показан честный confirm: оставить локальный экран либо показать сервер; во втором случае локальный outbox сначала сохраняется в IndexedDB как `guardedOutbox` и не теряется.
- Добавлена видимая кнопка «Обновить с сервера» с принудительным cache-busted fetch.
- Редактируемый draft защищён: ручное обновление блокируется во время ввода/короткой typing-паузы.

## Проверено

- Node: JavaScript синтаксически валиден; 4 сценария сравнения `version/exportedAt`; успешный merge независимых server/local полей; конфликт одного поля; наличие cache-buster и кнопки — PASS.
- `jq empty data.json` — PASS.
- `git diff --exit-code -- data.json assets` — PASS, файлы не изменены.
- `git diff --check` — PASS.
- Исходный commit свежего клона: `a340cd7` (`origin/main`).

Изменён код фронтенда: `/private/tmp/katalog-front-fix-1108/index.html`.
