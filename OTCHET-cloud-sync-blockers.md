# Отчёт: блокеры облачной синхронизации

## Сделано

1. `index.html`: добавлен совместимый IndexedDB upgrade `DB_VERSION 5 → 6` и отдельный additive store `cloudSync`; существующие stores и пользовательская схема не очищаются.
2. Полные `outbox`, `baseSnapshot`, cache, backup и known remote IDs перенесены в IndexedDB. В `localStorage` остаются токен и компактные маркеры; legacy outbox/cache удаляются только после успешной миграции.
3. Outbox восстанавливается до первого render, накладывается на модель и IndexedDB; подтверждённые локальные удаления из outbox применяются по base IDs, неизвестные локальные записи сохраняются. После preflight при сохранённом токене ставится автосохранение через 1 секунду; успешный poll также возобновляет отправку offline outbox.
4. Реализован deterministic three-way merge `base → fresh remote ← local outbox`: identity maps по ID, per-field merge, добавления и удаления. Непересекающиеся изменения объединяются; пересекающиеся правки и delete/edit не отправляются и показывают понятную ошибку с путями полей.
5. При несовпадении SHA выполняется fresh GET, rebase с сохранением fresh SHA/base snapshot и PUT. Для ответа 409/422 выполняется fresh GET, тот же rebase и ровно один повтор PUT (`retryCount 0 → 1`); второй конфликт блокирует отправку.
6. Clean remote apply удаляет из памяти и IndexedDB только проекты/элементы, известные по подтверждённой базе и отсутствующие в fresh remote. Проект не удаляется при неизвестном локальном дочернем элементе. Unknown local rows автоматически не удаляются.
7. Contents metadata ETag хранится отдельно и используется только в `If-None-Match` для polling Contents URL. ETag raw/download ответа не читается и не присваивается; PUT response ETag не используется как Contents ETag.
8. Перед каждым PUT предыдущий validated remote snapshot сохраняется и проверяется в IndexedDB. Затем выполняется обязательная попытка полного `localStorage.backup`; при quota используется компактный hash/reference manifest. Без проверенного IDB backup и полного backup/валидного manifest PUT запрещён.
9. Empty-local/nonempty-remote guard повторно проверяется непосредственно перед каждым PUT. Guarded full outbox архивируется в IndexedDB. Empty-cloud/local migration, read-only без токена, import lock, debounce 1 с, polling 2 с, изображения, модалы, статистика и старое меню сохранены.
10. Explicit import не очищает `cloudSync`, ждёт предыдущую sync queue и durable запись нового outbox перед снятием import lock. Вне явного import вызовов `.clear()` для каталоговых stores нет.

## Файлы и размеры

- `/Users/alphabravo/Downloads/katalog-site/index.html` — 221 952 байта, изменён.
- `/Users/alphabravo/Downloads/katalog-site/data.json` — 113 байт, не изменялся в этой задаче.
- `/Users/alphabravo/Downloads/katalog-site/README.md` — 397 байт, 3 строки, не изменялся в этой задаче.
- `/Users/alphabravo/Downloads/katalog-site/OTCHET-cloud-sync-blockers.md` — 5589 байт, создан.

## Проверки

- Inline JavaScript через `node --check -`: PASS.
- `data.json` JSON parse + проверка `projects/elements/categories/settings`: PASS.
- Изолированные сценарии three-way merge: 8/8 PASS (непересекающиеся поля, overlap conflict, remote/local deletes, delete/edit conflicts, независимые additions, удаление поля settings).
- Positive grep: `DB_VERSION = 6`, `cloudSync`, `knownRemoteDeletions`, `mergeCloudSnapshots`, `If-None-Match`, backup-before-PUT, single retry и pre-render outbox load найдены.
- Negative grep: raw ETag assignment, full outbox/cache write в `localStorage`, `cloudSync.clear()` не найдены.
- `.clear()` каталоговых stores найден только в explicit import: 4 вызова.

## Не проверено

- Реальный GitHub GET/PUT/409/422 не запускался: в среде нет сетевого доступа и пользовательского PAT.
- Браузерный upgrade IndexedDB 5 → 6 не прогонялся: пакет `fake-indexeddb` отсутствует; проверены код upgrade, отсутствие неимпортных clears и JS-синтаксис.
