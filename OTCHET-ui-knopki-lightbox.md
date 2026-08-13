# Правки UI: навигация, лайтбокс, карточки и техпаспорт

Дата: 2026-08-13

Репозиторий: `/Users/alphabravo/Downloads/katalog-elementov`

Ветка GitHub Pages: `main`

Живой сайт: `https://stampy399-cmyk.github.io/katalog-elementov/`

Коммит реализации: `7809be9e307480ac04ec0fc4364ceda5ea0a72c0`

## Что сделано

### 1. Полноширинная навигация

- Маленький переключатель справа от фильтров удалён.
- Над всем приложением добавлена полноширинная панель из двух кнопок:
  - `КАТАЛОГ КОНКУРЕНТОВ`;
  - `МЫ УМЕЕМ`.
- Высота кнопок: `55 px`.
- Размер шрифта: `clamp(20px, 2vw, 24px)`; вес: `800`.
- Активная вкладка залита акцентным синим цветом, имеет контрастный белый текст и тень.
- Панель занимает отдельную верхнюю строку desktop-layout и остаётся видимой при прокрутке рабочей области; на ширине до `760 px` используется `position: sticky`.
- Переиспользованы существующие `state.view`, `setView()`, hash `#comparison`, фильтры и обработчик `hashchange`.

### 2. Полноэкранный лайтбокс

- Все `17` наших медиа и все `52` карточки референсов на вкладке сравнения получили click-to-open.
- Одиночный режим:
  - тёмный полноэкранный фон;
  - изображение показывается без растягивания сверх натурального размера и вписывается в viewport;
  - MP4 открывается отдельным `<video controls autoplay>`;
  - закрытие по `Esc`, кнопке `×`, клику по фону и свободной области.
- Режим `Сравнить бок о бок` доступен у `17` семейств с нашим образцом:
  - наш образец слева, текущий референс справа;
  - кнопки `‹`/`›`;
  - клавиши `ArrowLeft`/`ArrowRight`;
  - циклическое листание максимум трёх референсов;
  - счётчик `1 / N`;
  - на мобильной ширине две панели располагаются вертикально.
- Для `EMPTY`, где нашего образца нет, side-by-side не предлагается.

### 3. Размер референсов

- Сетка заменена на `repeat(auto-fit, minmax(min(300px, 100%), 1fr))`.
- На QA viewport `1440×1000` минимальная фактическая ширина карточки не меньше `300 px`.
- Изображения референсов показываются через `object-fit: contain`, без обрезки содержимого.

### 4. Техпаспорта

- Создан `/Users/alphabravo/Downloads/katalog-elementov/ours_tech.json` со всеми `18` семействами.
- Каждая запись содержит ровно `status`, `tech_path`, `tool`, `how_to`, `sample`.
- Заполнены `17` достоверных `tech_path` из `OTCHET-vizual-sverka.md` и `17` путей `sample` из `assets/ours/`.
- Статусы: `16` — `умеем`, `2` — `не умеем` (`OTHER`, `EMPTY`).
- Не подтверждённые поля оставлены строкой `TODO: инвентарь`: `38` значений.
- Под каждым блоком «Наш образец» добавлен раскрывающийся блок «Как воспроизвести».
- UI показывает TODO-поля без скрытия и выделяет их янтарным цветом; статус показывается отдельным badge `УМЕЕМ`/`НЕ УМЕЕМ`.
- JSON загружается отдельно через `fetch('ours_tech.json')`; ошибка загрузки изолирована от каталога и не ломает основной интерфейс.

## Изменённые файлы

- `/Users/alphabravo/Downloads/katalog-elementov/index.html`
- `/Users/alphabravo/Downloads/katalog-elementov/ours_tech.json`
- `/Users/alphabravo/Downloads/katalog-elementov/scripts/qa-site-v1.js`
- `/Users/alphabravo/Downloads/katalog-elementov/scripts/qa-browser-v1.js`
- `/Users/alphabravo/Downloads/katalog-elementov/OTCHET-ui-knopki-lightbox.md`

`data.json` не изменён и не включён в коммиты. SHA-256 до и после:

```text
d25a276eb7e0f14cae9a99c631f48b52227b43adc247a12dd0699feb59a5bcba  data.json
```

Чужие untracked backup/report/inventory-файлы сохранены и не включены в работу.

## QA

Статический Node QA:

```text
node scripts/qa-site-v1.js
PASS 48639 assertions; projects=9; elements=2852; base=2780; unique=72; families=18; imported=624
```

Проверены дополнительно: покрытие `ours_tech.json` 18/18, допустимые статусы, непустые поля, существование sample-файлов, `69` lightbox-enabled медиа, `17` side-by-side кнопок и `18` техпаспортов.

Локальный headless Google Chrome, HTTP и `file://`:

```text
node scripts/qa-browser-v1.js http://127.0.0.1:8765/index.html
PASS 48 browser assertions; HTTP console=0; file console=0; refresh=PASS
```

Живой GitHub Pages, повторный чистый прогон:

```text
node scripts/qa-browser-v1.js 'https://stampy399-cmyk.github.io/katalog-elementov/index.html?ui=7809be9-exit'
PASS 48 browser assertions; HTTP console=0; file console=0; refresh=PASS
```

Headless QA проверяет:

- обе большие кнопки, высоту `>=55 px`, шрифт `>=20 px`, вес `>=700` и активное состояние;
- обе вкладки и hash `#comparison`;
- `18` сравнений, `13` видео, `52` референса;
- фактическую ширину карточек `>=300 px`;
- `18` техпаспортов и видимые TODO-поля;
- открытие изображения и видео, наличие video controls;
- закрытие фоном и `Esc`;
- открытие side-by-side, смену референса кнопкой и клавишей `ArrowRight`;
- `0` console errors;
- сохранение в IndexedDB, локальное удаление, локальную текстовую правку и безопасный mock server merge.

QA-кадры:

- `/tmp/katalog-comparison-qa.png` — вкладка сравнения с новой навигацией и увеличенными карточками;
- `/tmp/katalog-lightbox-pair-qa.png` — полноэкранный side-by-side, референс `3 / 3`.

## Публикация и live-проверка

- Push реализации: `a4b01a6..7809be9  main -> main`.
- GitHub Actions run: `31682936444`, workflow `pages build and deployment` — `completed/success`.
- `curl` живого `index.html` нашёл:
  - `КАТАЛОГ КОНКУРЕНТОВ`;
  - `МЫ УМЕЕМ`;
  - `ours_tech.json`;
  - `data-lightbox-pair`.
- Живой `ours_tech.json`: `18` семейств, `16` `умеем`, `2` `не умеем`.
- Live и локальные файлы побайтно совпали:

```text
3c0991ed7a2c801591da295cd286a9e4fb69099217d32256c0a7dd8dba0630e8  index.html
2edf07151eb68ad82335b52381c0dcaa270248dbaa41302fb12f67b17b0614cb  ours_tech.json
```

Первый live headless-прогон получил единичный внешний `503` от GitHub Pages для существующей JPG `assets/elements/b4040196-b0d2-4487-a586-019600000023.jpg`. Повторные прогоны прошли `48/48` с `HTTP console=0`; ошибка не воспроизвелась и к изменённому UI/JS не относилась.

## Что не вышло

Нет незакрытых функциональных блокеров. Все требуемые UI-сценарии опубликованы и проверены на живом сайте.

---

# Продолжение: полный инвентарь «МЫ УМЕЕМ»

Дата: 2026-08-13

## Результат

- Единственный источник техпаспортов — `ours_tech_full.json`; старый `ours_tech.json` удалён.
- Загружены все `216` умений и сгруппированы по `18` значениям `matches_competitor_family`.
- Статусы: `154` «умеем 1:1», `60` «умеем частично», `2` «не умеем».
- На вкладке добавлена верхняя статистика `216 / 154 / 60 / 2` и отдельные карточки всех умений.
- Каждая карточка содержит название, цветной статус и раскрывающийся техпаспорт: `tech_path`, `tool`, `how_to`, `sample`.
- `32` sample-пути внутри `assets/` показаны как медиа-превью с общим лайтбоксом; `65` внешних путей оставлены текстом, `119` пустых значений показаны как `—`. Файлы в репозиторий не копировались.
- Существующие `18` сравнений и `17` side-by-side кнопок сохранены.
- Фильтр семейств и текстовый поиск учитывают новые карточки и поля техпаспортов.
- `data.json` не менялся: SHA-256 `d25a276eb7e0f14cae9a99c631f48b52227b43adc247a12dd0699feb59a5bcba`.
- SHA-256 локального и опубликованного `ours_tech_full.json`: `16f682499e9399d61e29116de765c6cc8e9b9c2bd2fae7479e8640176c20cbe7`.

Изменённые файлы:

- `/Users/alphabravo/Downloads/katalog-elementov/index.html`
- `/Users/alphabravo/Downloads/katalog-elementov/ours_tech_full.json`
- `/Users/alphabravo/Downloads/katalog-elementov/ours_tech.json` — удалён
- `/Users/alphabravo/Downloads/katalog-elementov/scripts/qa-site-v1.js`
- `/Users/alphabravo/Downloads/katalog-elementov/scripts/qa-browser-v1.js`
- `/Users/alphabravo/Downloads/katalog-elementov/OTCHET-ui-knopki-lightbox.md`

## QA

Статический Node QA:

```text
node scripts/qa-site-v1.js
PASS 48666 assertions; projects=9; elements=2852; base=2780; unique=72; families=18; imported=624
```

Проверены схема всех `216` записей, точные счётчики статусов, покрытие `18` семейств, существование `32` локальных sample-файлов, `216` карточек, `234` техпаспорта, `101` lightbox-медиа, поиск и фильтр. TODO-заглушек нет.

Headless Google Chrome на локальном HTTP, `file://` и живом GitHub Pages:

```text
node scripts/qa-browser-v1.js 'https://stampy399-cmyk.github.io/katalog-elementov/index.html?ui=3d2eb97'
PASS 60 browser assertions; HTTP console=0; file console=0; refresh=PASS
```

Проверены обе вкладки, статистика, раскрытие нового техпаспорта, лайтбокс нового sample-превью, закрытие по `Esc`, существующие image/video lightbox, side-by-side и листание референсов, фильтр, IndexedDB и server merge.

## Публикация и live-проверка

- Коммит реализации: `3d2eb97d0571bf59d9493811ebc4ec449133daf5`.
- Push: `4e3d909..3d2eb97  main -> main`.
- GitHub Pages Actions run `31685186136`: `completed/success`.
- `curl` живого `index.html` нашёл `ours_tech_full.json`, `data-ability-stat="total"` и `ability-card`.
- `curl` живого JSON подтвердил `216 / 154 / 60 / 2`, `18` семейств и точное совпадение SHA-256 с локальным файлом.
- Живой headless Chrome: `60/60`, `HTTP console=0`.

## Что не вышло

Нет незакрытых блокеров.
