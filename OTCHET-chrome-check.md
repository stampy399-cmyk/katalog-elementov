# Проверка UI каталога в headless Chrome

- Репозиторий: `/Users/alphabravo/Downloads/katalog-elementov`
- Коммит: `5ee318c`
- Дата: `2026-08-13`

## Запуск

HTTP-сервер:

```text
python3 -u -m http.server 0 --bind 127.0.0.1
```

Назначенный порт: `50150`.

Основной запуск Chrome:

```text
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --disable-gpu --no-first-run --user-data-dir=$(mktemp -d) --enable-logging=stderr --virtual-time-budget=8000 --dump-dom http://127.0.0.1:50150/index.html
```

Chrome сформировал DOM объёмом `272792 B`; в stderr страницы console errors не было. После формирования DOM процесс самостоятельно не завершился, поэтому был остановлен и проверка продолжена через разрешённый fallback CDP.

Fallback: Chrome `151.0.7922.109`, `--remote-debugging-port=50938`; доступность подтверждена через `curl http://127.0.0.1:50938/json/version` и `/json/list`. Через CDP включены `Runtime`, `Log`, `Network`, `Page`, выполнен переход на `http://127.0.0.1:50150/index.html#comparison` и наблюдение `8000 ms`.

## Console

- Console errors: `0`.
- Игнорировано favicon 404: `0`.
- Список ошибок: отсутствует.

Учитывались `Runtime.consoleAPICalled(type=error)`, `Runtime.exceptionThrown` и `Log.entryAdded(level=error)` целевой страницы. Служебные сообщения процесса Chrome не считались ошибками console страницы.

## DOM

- Вкладка `МЫ УМЕЕМ` активна: да (`aria-pressed="true"`, `#comparison`).
- Строк семейств (`[data-capability-family]`): `18` — да.
- Карточек умений по умолчанию (`.ability-card`): `0` — да.
- `document.readyState`: `complete`.

## Итог

PASS — console errors `0`; DOM: `18` семейств, `0` карточек умений по умолчанию. Chrome и HTTP-сервер остановлены.
