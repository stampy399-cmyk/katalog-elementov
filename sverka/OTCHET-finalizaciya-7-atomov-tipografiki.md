# Финализация 7 атомов типографики

Проверены 7/7 MP4. Все: 1920x1080, 30 fps, 150 кадров, видео 5.000 s, H.264, encoder `libx264`, CRF 20 по скриптам, AAC 48 kHz stereo. Извлечены и визуально проверены кадры №75; текст полный, читаемый, без гличей. Анимация задана плавными выражениями времени; пересчёт не требовался.

- ✓ `nash-tipografika/tekstovaya_plashka.mp4`
- ✓ `nash-tipografika/zagolovok__tezis.mp4`
- ✓ `nash-tipografika/chislo__metrika.mp4`
- ✓ `nash-tipografika/tekstovaya_plashka__vynoska.mp4`
- ✓ `nash-tipografika/cta__prizyv.mp4`
- ✓ `nash-tipografika/spisok__punkty.mp4`
- ✓ `nash-tipografika/logotip__imennaya_podpis.mp4`

QA-кадры: `qa-midframes/*-frame75.png` (7 PNG). Финальный манифест содержит 7 записей и повторяет структуру `competitor-tipografika/MANIFEST.json`; все значения `file` существуют относительно каталога `nash-tipografika`.

Не вышло: ничего.
