# Отчёт: починка MANIFEST.json

- Записей до: 13
- Записей после: 9
- Удалено: 6
- Добавлено: 2
- Манифест: `/Users/alphabravo/Documents/GithubWork/katalog-elementov/sverka/competitor-tipografika/MANIFEST.json`
- Итоговая таблица: `/Users/alphabravo/Documents/GithubWork/nisha-santehnika/OSMOTR-tipografika-sverka.md`

## Удалённые записи без файла

- Число с подписью — `chislo-s-podpisyu--6e96b4e4.mp4`
- Счётчик с подписью — `schetchik-s-podpisyu--721d63bf.mp4`
- Белая подложка с текстом — `belaya-podlozhka-s-tekstom--b0ac9c83.mp4`
- Текстовая сборка — `tekstovaya-sborka--8f3d4ced.mp4`
- Плавное появление подписи — `plavnoe-poyavlenie-podpisi--df63aa86.mp4`
- Ценник конвектора — `cennik-konvektora--2488ea56.mp4`

## Добавленные файлы без записи

- Список / пункты — `text-typography--spisok-punkty--2f9c60ce36b0a8b5b5d78f2fc5504a2b.mp4`
- Текстовая плашка — `text-typography--tekstovaya-plashka--8d92bcb624e875ab0aa2dde8e6e726be.mp4`

## Проверка

- PASS: `python3 json.load`, 9 существующих файлов, число записей равно числу MP4.
- PASS: `ffprobe`, 9/9 MP4 содержат видеопоток H.264.

## Параллельная запись

- Во время работы внешний `ffmpeg` удалил исходный снимок каталога; 9 целевых MP4 восстановлены из исходных роликов под зафиксированными именами.
- 22 поздно появившихся MP4 перемещены без удаления в `concurrent-ffmpeg-quarantine/`; на финальной проверке 9 процессов ещё писали только в карантин.

## Не выполнено

- `/Users/alphabravo/Documents/GithubWork/nisha-santehnika/OSMOTR-tipografika-sverka.md` не обновлён: `PermissionError: [Errno 1] Operation not permitted: '/Users/alphabravo/Documents/GithubWork/nisha-santehnika/tmpny7kzj4u'`
- Готовая таблица сохранена локально: `/Users/alphabravo/Documents/GithubWork/katalog-elementov/sverka/competitor-tipografika/OSMOTR-tipografika-sverka.md`
