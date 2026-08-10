Аудит index.html, 2026-08-10

Объём: read-only исследование. index.html не изменён. Размер 152127 байт, 2663 строки. JS syntax check: PASS. Контроль: localStorage 0, IndexedDB 1, fetch 2, window.confirm 2. data.json и README.md отсутствуют.

Схема хранения и состояния

localStorage-ключей и вызовов нет. Локальный источник текущей реализации — IndexedDB: DB_NAME local-element-catalog, DB_VERSION 5, CATALOG_VERSION 5 (строки 533-545). Object stores projects/elements/settings/categories с keyPath id/id/key/key; индекс elements.projectId (строки 790-809). В памяти state: db, projects[], elements[], categories[], settings, search, categoryFilter, activeProjectId, editingElementId, videoComposer, newElementId, menuOpen, statsOpen, calibration, очереди сохранения/undo/backup и служебные timers/revisions (строки 566-595).

Нормализованный project: id, title, url, channel, titleSource, channelSource, niche, duration, host, progress, progressOverride, completed, createdAt, updatedAt (строки 728-753). Нормализованный element: id, projectId, image, name, description, opinion, application, technique, category, timecodes[], repeatCount, createdAt, updatedAt; legacy tags один раз переводятся в category/description и поле tags удаляется (строки 650-672, 755-776). Category: key, name, uses, repeats (строки 674-696). Export/cloud-кандидат snapshot: version, exportedAt, projects, elements, categories, settings (строки 2030-2044); settings: theme, crop, cropCalibrated, activeProjectId, lastCropSource, backupDirectoryHandle, backupLastWrittenAt (строки 537-545).

Точки по требованиям 1-13

1. GitHub sync отсутствует: нет GitHub URL, PAT, Contents API, ETag/If-None-Match, PUT/sha, polling/conflict retry, cloud status или cloud migration/guard. Локальная загрузка из IndexedDB — строки 930-952; локальный debounce 240 ms и очередь — 976-1003; saveProject/saveElement/saveSettings — 1005-1042. Единственный fetch — noembed metadata — 1473-1527. Paste image/data URL — 1870-1905; crop сохраняет PNG без JPEG/1280 compression — 1834-1844.

2. Удаление делает native window.confirm для ролика и элемента — 2393-2399, 2442-2455. Фактическая мутация state/IndexedDB — 1630-1668; element имеет undo toast — 1693-1707. Автоудаления при загрузке нет, но намеренный импорт очищает все четыре store — 2101-2134; legacy migration удаляет tags — 667-668.

3. Category menu имеет z-index 8 — 169 и 445-446. Соседние .element-card не имеют z-index; карточки рисуются grid-порядком — 385-389. При открытом меню нужен stacking/overflow fix на card/combo.

4. Делегированный input обновляет модель на каждый символ — 2462-2489. Обычные поля не вызывают renderFeed: updateProjectVisual делает точечный textContent/value update и sidebar render — 1390-1421; updateProjectCounts обновляет счётчик — 1423-1429. Search вызывает полный renderFeed на каждый input — 2561-2564; category menu пересоздаёт innerHTML на каждый input — 1348-1363. selectCategory и действия добавления/копирования вызывают полный render — 1372-1378, 1553-1562, 1621-1628.

5. addElement и copyElement вставляют через unshift — 1553-1562, 1621-1628; renderWorkspace выводит elementsForProject без сортировки и добавляет + элемент после cards — 1294-1305. editingElementId только даёт expanded/grid-column class, позиция не переносится наверх — 1245-1273, 1301-1305.

6. document paste уже слушается глобально — 2617-2622 и создаёт element в currentProjectId — 1879-1905. Проверки фокуса текстового поля нет; любое изображение перехватывается. Сжатия нет, crop может открыть калибровку.

7. Заголовок и title пока «Каталог элементов» — 7, 498. На viewport <=500px brand дополнительно показывает «Каталог» через псевдоэлемент — 485-488.

8. Базовый UI уже имеет border/shadow и surface-raised для карточек в обеих темах — 22-43, 386-394, 450-462. Текущая контрастность/светлая тема — точка для визуального усиления, функционального отдельного контраста нет.

9. Частичные SVG есть у удаления/копирования — 1213, 1271-1272; «...» — 502. Иконок нет у пунктов меню 513-521, Ролики 505, + ролик 507, + элемент 1304, параметров 1229, поиска 499, статистики 1963 и категорий: options строятся plain text — 1348-1360.

10. Полосы уже есть в sidebar row-progress — 333-337, header project-header-actions — 365-367, stats timeline mini-progress — 1944. В категории статистики пока только текст uses/repeats — 1961; зелёного состояния 100% и отдельной шапочной полосы в markup нет.

11. Автотаймкодов нет. timecodesFrom только читает и валидирует существующее — 719-725; normalize/load не заполняют пустые поля — 755-776, 930-950; новый element создаётся без timecode — 1553-1559; пустое поле отображает «—» — 1249-1259. projectProgress зависит только от имеющихся timecodes — 1103-1113.

12. Stats — отдельная боковая панель из меню, не блок рядом с parameters — 512-524, 1721-1731. Сейчас есть глобальные KPI projects/elements/repeats/niches/top, canvas bars, timeline, top repeated elements, categories uses/repeats, niches — 1947-1977. Нет current-project split, percentages/category mini-bars, techniques, keyword dictionary/stopwords, image/timecode split, timeline coverage, completion KPI. При изменении панель полностью заменяет innerHTML — 1947-1977; вызовы обновления — 1323, 1588-1599, 1618.

13. В каталоге есть только index.html; data.json и README.md отсутствуют. Текущий пустой snapshot-контракт для data.json логически следует из catalogSnapshot — 2036-2044: version, exportedAt, projects:[], elements:[], categories:[], settings.

Совместимость и риски

- Главный риск: требование говорит localStorage, но фактическая схема IndexedDB; cloud integration должна читать текущие stores/snapshot без автоматического удаления или несовместимой замены.
- Не менять normalize/migration семантику без обратной совместимости: legacy tags мигрируются и удаляются, time/timecodes/times сводятся к одному валидному timecodes[] — 719-725, 650-672.
- PUT cloud должен учитывать отложенные IndexedDB commits и текущий backup API; существующий backup — File System Access API, не localStorage — 2288-2364.
- Import intentionally clear()-ит stores — 2114-2117; это не следует переиспользовать для cloud pull.
- Existing metadata fetch noembed — внешняя сеть и не связана с GitHub — 1494-1527.
