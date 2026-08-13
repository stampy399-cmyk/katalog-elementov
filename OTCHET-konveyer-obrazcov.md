# Конвейер 2-секундных образцов

Дата: 2026-08-13.

## Результат

- Реализован `scripts/make-sample.mjs`: один вызов `node scripts/make-sample.mjs SPEC.json`, без новых npm-зависимостей.
- JSON-контракт: `type`, `layers`, `palette`, `motion`, `output`. Относительные пути считаются от каталога спеки.
- Рендер пишется во временный файл, проходит встроенный `ffprobe`- и faststart-гейт и только затем атомарно заменяет `output`.
- Фиксированный выход: H.264 High 4.1, `yuv420p`, 1920×1080, 30 fps, 60 кадров, 2.000000 с, без аудио, `+faststart`.

## Покрытие

Чистый FFmpeg, 12 типов:

- `hard-cut`: покадровые `trim + concat`.
- `crossfade`: `xfade`, длительность и старт в кадрах.
- `scale-zoom`: линейный `zoompan`, начальный/конечный zoom и anchor.
- `position-slide`: линейный `overlay x/y` для одного foreground-слоя.
- `blur-effect`: blur-fill или full-frame `gblur`.
- `blend-mode`: `screen`, `multiply`, `overlay`, `addition`, `difference`, `softlight`, `hardlight` с opacity.
- `light-glow`: анимированное цветное radial glow с opacity/fade.
- `opacity-fade`: покадровый fade полного кадра в цвет палитры.
- `saturation-color`: покадровая saturation плюс contrast/brightness/color balance.
- `grid-lines`: `drawgrid` с цветом, alpha, spacing, offset и thickness.
- `camera-motion`: overscan и линейный pan по абсолютным кадрам 0–59.
- `inset-window`: прямоугольная врезка, border и opacity.

По 42 строкам `NEED-SAMPLE`: 12 FFmpeg-семейств содержат 31 строку; 4 Remotion-семейства — 11 строк. Наличие динамического текста, фигур, карточек или сложных keyframes в любой FFmpeg-спеке тоже переводит композицию на Remotion.

Маршрут Remotion, не FFmpeg:

- `text-typography`, любой динамический `text/texts`.
- `geometry-shape`, `shape/shapes/figures`.
- `photo-image` с карточкой, `card/cards`.
- `keyframes-motion`, более двух ключей, spring, overshoot, stagger, нелинейный easing, совмещённые position/scale/opacity/path keyframes.

Проверенный отказ: exit code 1, `Ошибка: маршрут Remotion, не ffmpeg: тип text-typography`; MP4 не создан.

## Примеры и smoke

- 12 спек: `scripts/specs/{hard-cut,crossfade,scale-zoom,position-slide,blur-effect,blend-mode,light-glow,opacity-fade,saturation-color,grid-lines,camera-motion,inset-window}.json`.
- 12/12 спек отработали без ошибок.
- 12 MP4: `assets/ours/pairs/_smoke/`, по одному на тип.
- Визуально проверены кадры 0, 30 и 59 каждого файла: 36 кадров, ошибок композиции фильтров не найдено.

Независимый итоговый `ffprobe`, одинаково для 12/12 файлов:

```text
codec_name=h264
width=1920
height=1080
pix_fmt=yuv420p
avg_frame_rate=30/1
nb_frames=60
duration=2.000000
audio_streams=0
```

Faststart: 12/12; `moov` offset 36, `mdat` offset 1166–1614, во всех файлах `moov < mdat`.

## Не вышло

- Сбоев smoke и ffprobe: 0.
- Remotion-рендер намеренно не реализован в этом скрипте; это требование маршрутизации, не дефект.
- 42 производственные спеки не создавались: задача покрывает конвейер и 12 smoke-примеров, а не выпуск всех образцов.
