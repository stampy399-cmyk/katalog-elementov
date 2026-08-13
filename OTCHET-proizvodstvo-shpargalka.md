# Производственная шпаргалка: 2-секундные образцы

Дата аудита: 2026-08-13. Рабочий формат: 1920×1080, 30 fps, 60 кадров, H.264, `yuv420p`, `+faststart`, ровно 2.000 s, без аудио.

## 1. Что подтверждено

- `ours_tech_full.json`: 216 техпаспортов; 154 `умеем 1:1`, 60 `умеем частично`, 2 `не умеем`; 84 уникальных `tech_path`; на момент проверки существуют 216/216 указанных путей.
- Все 16 запрошенных семейств приёмов имеют живой движок, скрипт или чистый FFmpeg-маршрут.
- `/Users/alphabravo/Documents/BASE/02-ENGINES`: 24 обычных каталога движков, 2 symlink, 5 файлов верхнего уровня; 188 исходных `.py/.sh/.js/.mjs/.ts/.tsx` без `node_modules` и логов.
- FFmpeg 6.0: доступны `xfade`, `overlay`, `blend`, `gblur`, `boxblur`, `avgblur`, `drawgrid`, `drawbox`, `drawtext`, `zoompan`, `colorbalance`, `eq`, `fade`, `hue`, `crop`, `scale`.
- Практически проверены 10 шаблонов: hard cut, inset, xfade, camera pan, grid+color+fade, zoom, slide, glow, screen blend, blur-fill. Каждый дал `h264 / 1920×1080 / yuv420p / 60 кадров / 2.000000 s / 0 audio`.

Правило производства: параметры цвета, координат, размера, кривой и движения брать только из конкретного конкурентного клипа. Числа ниже — устройство команды; переменные `REF_*` заменять замером референса, не подбирать «на глаз».

## 2. Реально полезные движки

| Путь | Что реально производит | Когда брать |
|---|---|---|
| `/Users/alphabravo/Documents/BASE/02-ENGINES/core/tricks/` | 43 карточки проверенных приёмов с донорским кодом и параметрами | Первый индекс: найти уже существующий аналог, затем идти к донору |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/analyze-reference/video_analysis.py` | Метрики клипа, cuts/motion/color/BW-триггеры | Перед сборкой, если параметры референса ещё не выписаны |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/video-photofilm-tier1/build_photofilm.py` | Фото: неподрагивающий Ken Burns, RGB-float crossfade, cut, contain/fill/pillarbox, авто-кроп детали, грейд, ровный одно-проходный H.264 | Фото, плавный push/pull, растворение |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/video-remotion-overlays/src/Graphics.tsx` | Lower third, kinetic/karaoke text, highlight box, glow | Текст и callout поверх реального футажа |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/video-remotion-overlays/src/Montage.tsx` | Hard cut, zoom-punch, blur pulse, alpha composite | Простые keyframe-композиции и overlay |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/video-remotion-shorts/fx.sh` | Whip blur, punch, shake, pop-in, text, end card | Брать формулы эффектов; сам скрипт фиксирован под 608×1080, поэтому финальный 16:9 образец собирать его формулой в FFmpeg/Remotion |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/video-narration-over-footage/frame_window.py` | 1920×1080 inset-window mask: rounded window, feathered edge; отдельно warm glow layer | Окно-врезка и мягкая кромка |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/video-narration-over-footage/cutout.py` | RGBA-вырезка персонажа без белого ореола | Фото/персонаж поверх футажа |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/video-narration-over-footage/particles.py` | Зацикленный ProRes 4444 alpha: bokeh/snow | Только если в референсе действительно есть этот слой |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/factory/montage_rich.py` | Профильный монтаж: still zoom/pan, hard/crossfade, overlay, drawtext, инфографика, H.264 | Длинные сборки; для одного 2-секундного элемента избыточен |
| `/Users/alphabravo/Documents/BASE/02-ENGINES/media-openmontage` → `/Users/alphabravo/Documents/BASE/01-NICHES/en-europe-migration/OpenMontage` | Живой source OpenMontage/Remotion: text/stat/callout/comparison cards, bar/line/pie/KPI/progress, captions, section/stat/hero overlays, split-screen, карты, SVG, 20 переходов; `node_modules` сейчас отсутствует | Основной генератор карточек, текста, фигур и сложных keyframes; в рабочей копии нужен `npm ci` |
| `/Users/alphabravo/Documents/BASE/01-NICHES/de-ocean-deepsea/graphics/make_plates.py` | Pillow RGBA 1920×1080: T1/T2 titles, подписи, линии, orca/human/yacht, карты, scale-comparison | Только когда геометрия совпадает с этим семейством; работать на копии |
| `/Users/alphabravo/Documents/BASE/01-NICHES/de-factories-germany/ZAVODY-WANKEL/work/build_v2.py` | Blur-fill, Ken Burns, xfade, slam/date/card/bignum/triptych/timeline overlays, warm leak, dust/fog | Проверенный донор фото, типографики и карточек |
| `/Users/alphabravo/Documents/BASE/01-NICHES/en-guns-ammo/production/СТИЛЬ-КИТ/manifests/transitions.json` | Параметры и готовые референсы hard cut, dip-black, glitch, zoom-punch, whip, flash, film burn | Не печь готовый клип целиком; переносить только совпавший приём и его параметры в редактируемые слои |
| `/Users/alphabravo/Documents/BASE/01-NICHES/en-guns-ammo/production/СТИЛЬ-КИТ/manifests/infographics.json` | Параметры готовых price/nameplate/scorecard/stamp/arrow/chart/UI примитивов | Источник размеров/таймингов; не использовать baked-видео как новую инфографику |
| `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/templates.py` | 11 Pillow-конструкторов: grid, numeric card, product, two-path, leaders, comparison, chapter, thermal, evidence, warning, marker | Живая библиотека вне `BASE`; применять только при точном совпадении композиции |
| `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/motion.py` | `ken_burns`: push/pull/pan left/right/drift | 60 кадров из still, параметры из референса |
| `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/effects.py` | `color_grade`, `warm_film_burn`, `restrained_glitch`, `atmosphere` | Цвет, glow, glitch, blur/vignette; статический API/покадровый sequence |
| `/Users/alphabravo/Downloads/Draw-Studio-src/src/montage_engine.py` | Живая копия Draw: crop/scale, photo/video scenes, camera motion | Резервный маршрут для Draw-сцен |

Не использовать как движок:

- `/Users/alphabravo/Documents/BASE/02-ENGINES/model-3d/` содержит только `orca/scene.gltf`, `scene.bin`, texture assets и ZIP; самостоятельного 3D-рендерера там нет.
- `/Users/alphabravo/Documents/BASE/02-ENGINES/video-geoessay-drawstudio` — битый symlink на отсутствующий `/Users/alphabravo/Desktop/Draw Studio`. Живая замена: `/Users/alphabravo/Downloads/Draw-Studio-src/src/montage_engine.py`.
- `publish-*`, voice/audio, janitor, media-download и CapCut-инструменты не генерируют требуемую 2-секундную графику.

## 3. Матрица «приём → чем воспроизводить»

| Приём | Первый выбор | Полный путь / FFmpeg-фильтр | 2-секундная схема |
|---|---|---|---|
| Жёсткая склейка | FFmpeg | `trim + concat`; эталон параметров: `/Users/alphabravo/Documents/BASE/01-NICHES/en-guns-ammo/production/СТИЛЬ-КИТ/manifests/transitions.json` | A до `REF_CUT`, B после, без overlap |
| Окно-врезка | FFmpeg + готовая mask | `/Users/alphabravo/Documents/BASE/02-ENGINES/video-narration-over-footage/frame_window.py`; `scale + overlay` | base 60 кадров, inset scale/crop, позиция и border из референса |
| Зум | Фото: photofilm; видео: FFmpeg | `/Users/alphabravo/Documents/BASE/02-ENGINES/video-photofilm-tier1/build_photofilm.py`; `zoompan` | 60 кадров, `REF_Z0 → REF_Z1`, anchor из референса |
| Слайд позиции | Remotion или FFmpeg | `/Users/alphabravo/Documents/BASE/01-NICHES/en-europe-migration/OpenMontage/remotion-composer/projects/uk-intro/GeoIntro.tsx`; `overlay=x/y expr` | `REF_X0,Y0 → REF_X1,Y1` на абсолютных кадрах |
| Свечение | Alpha layer + FFmpeg | `/Users/alphabravo/Documents/BASE/02-ENGINES/video-remotion-overlays/src/Graphics.tsx`; `gblur + overlay`; warm donor `frame_window.py` | Дублировать alpha shape, blur нижней копии, compositing mode из референса |
| Кроссфейд | Photofilm или FFmpeg | `/Users/alphabravo/Documents/BASE/02-ENGINES/video-photofilm-tier1/build_photofilm.py`; `xfade` | Два куска по `1 + REF_XF/2`, overlap `REF_XF`, итог 2.0 s |
| Режим наложения | FFmpeg | `blend=all_mode=screen|multiply|overlay|addition:all_opacity=REF_ALPHA` | Оба слоя 1920×1080/60 кадров до blend |
| Движение камеры | Фото: photofilm/Tonrohr; видео: FFmpeg | `build_photofilm.py`; `motion.py`; `scale overscan + crop x/y(t)` | Pan/drift/zoom на 60 абсолютных кадрах |
| Сетка линий | FFmpeg или Pillow | `drawgrid`; `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/templates.py:black_grid_frame` | spacing/thickness/color/alpha строго из референса |
| Насыщенность/цвет | FFmpeg или Pillow | `eq + hue + colorbalance`; `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/effects.py:color_grade` | Один grade перед overlay; не менять геометрию |
| Типографика | OpenMontage/Remotion | `/Users/alphabravo/Documents/BASE/01-NICHES/en-europe-migration/OpenMontage/remotion-composer/src/Explainer.tsx`; `/Users/alphabravo/Documents/BASE/02-ENGINES/video-remotion-overlays/src/Graphics.tsx` | Text/card как отдельный RGBA timed layer |
| Геометрия/фигуры | OpenMontage SVG/Pillow | `Explainer.tsx`; `/Users/alphabravo/Documents/BASE/01-NICHES/de-ocean-deepsea/graphics/make_plates.py`; Tonrohr `templates.py` | Отдельный RGBA слой; анимация по кадрам, не baked full frame |
| Кейфреймы | Remotion | `GeoIntro.tsx`; `Graphics.tsx`; `Montage.tsx` | `interpolate/spring` по абсолютным frames 0–59; no restart/reveal |
| Блюр | FFmpeg | `gblur`, `boxblur`, `avgblur`; blur-fill donor `build_v2.py` | Blur всего кадра, локального слоя или backplate по референсу |
| Прозрачность | Remotion/FFmpeg | `opacity`; `fade=alpha=1`; `colorchannelmixer=aa=REF_ALPHA` | Alpha layer отдельно; full-frame fade только если так в клипе |
| Фото | Photofilm/OpenMontage | `build_photofilm.py`; `Explainer.tsx` image scene | Static hold или measured Ken Burns; cover/contain из композиции референса |

## 4. Единый контракт выдачи

Для любого маршрута финальный проход один и тот же. `-frames:v 60` является главным ограничителем; `-t 2.000` — дополнительная защита. Вход должен покрывать 2 s; для короткого видео использовать `-stream_loop -1`, для фото — `-loop 1 -framerate 30`.

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i INPUT \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1,format=yuv420p" \
  -map 0:v:0 -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -profile:v high -level 4.1 \
  -pix_fmt yuv420p -movflags +faststart OUTPUT.mp4
```

Не добавлять `-r` после фильтров: `fps=30` уже формирует ровно 60 временных кадров и не создаёт скрытых дублей на выходе.

## 5. Готовые чисто-FFmpeg шаблоны

### 5.1 Жёсткая склейка на 1.000 s

`1.000` заменить измеренным `REF_CUT`; длительности двух `trim` должны в сумме дать 2.000.

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i A.mp4 -stream_loop -1 -i B.mp4 \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
         fps=30,setsar=1,trim=duration=1.000,setpts=PTS-STARTPTS[a];
    [1:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
         fps=30,setsar=1,trim=duration=1.000,setpts=PTS-STARTPTS[b];
    [a][b]concat=n=2:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.2 Кроссфейд 0.500 s

Для общего итога 2.000 s каждый вход здесь длится 1.250 s: `1.25 + 1.25 - 0.50 = 2.00`. `offset = 1.25 - 0.50 = 0.75`.

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i A.mp4 -stream_loop -1 -i B.mp4 \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
         fps=30,setsar=1,trim=duration=1.250,setpts=PTS-STARTPTS[a];
    [1:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,
         fps=30,setsar=1,trim=duration=1.250,setpts=PTS-STARTPTS[b];
    [a][b]xfade=transition=fade:duration=0.500:offset=0.750,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.3 Окно-врезка

Пример координат заменять замером. Для эталонного rounded-window BASE сначала создать маску:

```bash
python3 /Users/alphabravo/Documents/BASE/02-ENGINES/video-narration-over-footage/frame_window.py \
  --out WORK/window-mask.png --frame-w 1920 --frame-h 1080 \
  --inset-x 68 --inset-y 66 --radius 250 --feather 6
```

Прямоугольная врезка без маски:

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i BASE.mp4 -stream_loop -1 -i INSET.mp4 \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1[base];
    [1:v]scale=640:360:force_original_aspect_ratio=increase,crop=640:360,fps=30,setsar=1[pip];
    [base]drawbox=x=1230:y=670:w=650:h=370:color=white@0.80:t=5[framed];
    [framed][pip]overlay=x=1235:y=675:shortest=1,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.4 Фото: чистый зум 60 кадров

`1.00`, `1.10` и центр заменить значениями референса. Для фото предпочтителен `build_photofilm.py`; этот вариант — быстрый FFmpeg-маршрут.

```bash
ffmpeg -hide_banner -y -loop 1 -framerate 30 -i PHOTO.jpg \
  -vf "scale=7680:-1,
       zoompan=z='1.00+(1.10-1.00)*on/59':
               x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':
               d=60:s=1920x1080:fps=30,
       setsar=1,format=yuv420p" \
  -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -x264-params no-dct-decimate=1 \
  -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.5 Видео: pan/движение камеры

Overscan и траекторию заменить замером. Здесь движение слева направо за 2 s.

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i INPUT.mp4 \
  -vf "scale=2304:1296:force_original_aspect_ratio=increase,
       crop=1920:1080:x='(iw-ow)*t/2':y='(ih-oh)/2',
       fps=30,setsar=1,format=yuv420p" \
  -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.6 Слайд/простые keyframes RGBA-слоя

Здесь слой входит слева за 0.400 s в `x=100, y=100`.

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i BASE.mp4 -loop 1 -framerate 30 -i CARD.png \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1[base];
    [1:v]scale=640:-2,format=rgba[card];
    [base][card]overlay=
      x='if(lt(t,0.4),-overlay_w+(100+overlay_w)*t/0.4,100)':
      y=100:shortest=1,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

Для более чем двух ключей, spring/overshoot или одновременных position+scale+opacity использовать Remotion, не наращивать вложенные FFmpeg `if()`.

### 5.7 Свечение вокруг RGBA-фигуры

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i BASE.mp4 -loop 1 -framerate 30 -i SHAPE.png \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1[base];
    [1:v]format=rgba,split[shape][g0];
    [g0]colorchannelmixer=aa=0.65,gblur=sigma=24[glow];
    [base][glow]overlay=x=750:y=450:shortest=1[b1];
    [b1][shape]overlay=x=750:y=450:shortest=1,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.8 Режим наложения

`screen`, `multiply`, `overlay`, `addition` и `0.65` выбирать по референсу.

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i BASE.mp4 -stream_loop -1 -i FX.mp4 \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1[base];
    [1:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1[fx];
    [base][fx]blend=all_mode=screen:all_opacity=0.65,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.9 Сетка, цвет и насыщенность

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i INPUT.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,
       eq=saturation=1.25:contrast=1.04:brightness=0.01,
       colorbalance=rs=0.05:bs=-0.04,
       drawgrid=width=120:height=120:thickness=2:color=white@0.25,
       setsar=1,format=yuv420p" \
  -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.10 Blur-fill для вертикального/квадратного фото или видео

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i INPUT.mp4 \
  -filter_complex "
    [0:v]fps=30,split[bg0][fg0];
    [bg0]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=35[bg];
    [fg0]scale=1920:1080:force_original_aspect_ratio=decrease[fg];
    [bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### 5.11 Opacity fade полного кадра

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i INPUT.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,
       fade=t=in:st=0:d=0.300,fade=t=out:st=1.700:d=0.300,
       setsar=1,format=yuv420p" \
  -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

Для fade только RGBA-слоя: перед `overlay` применить к слою `fade=t=in:st=0:d=REF_IN:alpha=1,fade=t=out:st=REF_OUT:d=REF_D:alpha=1`.

### 5.12 Типографика FFmpeg — только простой статичный текст

Текст хранить в UTF-8 файле, чтобы не ломать shell-escaping.

```bash
ffmpeg -hide_banner -y -stream_loop -1 -i INPUT.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,
       drawtext=fontfile='/ABS/FONT.ttf':textfile='/ABS/text.txt':
                fontsize=84:fontcolor=white:borderw=4:bordercolor=black@0.85:
                x=(w-text_w)/2:y=780:enable='between(t,0.2,1.8)',
       setsar=1,format=yuv420p" \
  -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

Word-by-word, stroke draw-on, count-up, spring, complex wrapping и shapes — только OpenMontage/Remotion.

## 6. Порядок вызова генераторов: карточки, текст, фигуры

### Вариант A — OpenMontage, основной

1. Не менять engine. Создать рабочую копию без `node_modules`, затем установить зависимости по существующему `package-lock.json`. В самом OpenMontage `node_modules` на момент аудита отсутствует.

```bash
ENGINE=/Users/alphabravo/Documents/BASE/01-NICHES/en-europe-migration/OpenMontage/remotion-composer
WORK=/ABS/WORK/sample-001-openmontage
rsync -a --exclude node_modules "$ENGINE/" "$WORK/"
cd "$WORK"
npm ci
```

2. Создать `WORK/props.json`, заполняя только значениями из конкурентного кадра. Доступные `type`: `text_card`, `stat_card`, `callout`, `comparison`, `hero_title`, `bar_chart`, `line_chart`, `pie_chart`, `kpi_grid`, `progress_bar`, `anime_scene`, image/video scene; overlays: `section_title`, `stat_reveal`, `hero_title`, `provider_chip`.

Минимальная форма одного 2-секундного слоя:

```json
{
  "themeConfig": {
    "primaryColor": "#REF",
    "accentColor": "#REF",
    "backgroundColor": "#REF",
    "surfaceColor": "#REF",
    "textColor": "#REF",
    "mutedTextColor": "#REF",
    "headingFont": "REF_FONT",
    "bodyFont": "REF_FONT",
    "monoFont": "REF_FONT",
    "chartColors": ["#REF"],
    "springConfig": {"damping": 20, "stiffness": 120, "mass": 1},
    "transitionDuration": 0,
    "captionHighlightColor": "#REF",
    "captionBackgroundColor": "transparent"
  },
  "cuts": [
    {
      "id": "sample-001",
      "type": "text_card",
      "source": "",
      "in_seconds": 0,
      "out_seconds": 2,
      "text": "REF_TEXT",
      "fontSize": 84,
      "color": "#REF",
      "backgroundColor": "#REF"
    }
  ],
  "overlays": [],
  "captions": [],
  "audio": {}
}
```

`springConfig` в примере — текущий default движка, не утверждение о конкуренте. Если движение не измерено, выбрать линейный FFmpeg/Remotion `interpolate`; spring не добавлять.

3. Рендерить только кадры 0–59:

```bash
cd "$WORK"
npx remotion render src/index.tsx Explainer "$WORK/raw.mp4" \
  --props="$WORK/props.json" --frames=0-59 --codec=h264 --crf=18 --pixel-format=yuv420p
```

4. Пропустить через единый контракт из раздела 4: `-an -frames:v 60 -movflags +faststart`.

### Вариант B — alpha overlay из `video-remotion-overlays`

Подходит для lower third, kinetic text и highlight. Исходник движка 1280×720/30; работать на копии, рендерить первые 60 кадров в ProRes 4444, затем масштабировать layer до 1920×1080 и накладывать на footage.

```bash
ENGINE=/Users/alphabravo/Documents/BASE/02-ENGINES/video-remotion-overlays
WORK=/ABS/WORK/sample-001-overlay
rsync -a --exclude node_modules "$ENGINE/" "$WORK/"
ln -s "$ENGINE/node_modules" "$WORK/node_modules"
cd "$WORK"
npx remotion render src/index.ts Overlay "$WORK/overlay.mov" \
  --frames=0-59 --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le

ffmpeg -hide_banner -y -stream_loop -1 -i BASE.mp4 -i "$WORK/overlay.mov" \
  -filter_complex "
    [0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1[base];
    [1:v]scale=1920:1080:flags=lanczos,format=rgba[ov];
    [base][ov]overlay=0:0:shortest=1,format=yuv420p[v]" \
  -map "[v]" -an -t 2.000 -frames:v 60 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart OUT.mp4
```

### Вариант C — Pillow/Tonrohr для фигур и карточек

Применять существующие constructors без изменения источников:

- `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/templates.py:render_template`
- `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/core.py:render_sequence`
- `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/motion.py:ken_burns`
- `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/effects.py`

Порядок: constructor → 60 RGBA PNG frames → ProRes 4444 → FFmpeg overlay → единый H.264-финал.

```bash
ffmpeg -hide_banner -y -framerate 30 -i WORK/frames/frame_%06d.png \
  -frames:v 60 -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le WORK/overlay.mov
```

Не запускать `materialize_assets.py` для нового образца: он материализует фиксированные 31 production instances Tonrohr, а не произвольную конкурентную композицию.

### Вариант D — готовая Pillow-геометрия ocean

`/Users/alphabravo/Documents/BASE/01-NICHES/de-ocean-deepsea/graphics/make_plates.py` уже содержит линии, карточки, карту, orca/human/yacht и scale comparison. Прямой запуск пишет в hardcoded output дерева ниши, поэтому для образца запускать только рабочую копию; исходный файл и его output не трогать. Полученный RGBA PNG оживлять FFmpeg/Remotion, а не запекать новую full-frame infographic.

## 7. Фото через `build_photofilm.py`

`shots.json`:

```json
{
  "shots": [
    {"photo": "/ABS/PHOTO.jpg", "grade": "auto", "crop": null}
  ]
}
```

Команда:

```bash
python3 /Users/alphabravo/Documents/BASE/02-ENGINES/video-photofilm-tier1/build_photofilm.py \
  --preset /Users/alphabravo/Documents/BASE/02-ENGINES/video-photofilm-tier1/presets/en-ufo-disclosure.json \
  --shots WORK/shots.json --out WORK/raw.mp4 \
  --transition cut --window 0 2 --zoom-mode inside --encoder x264
```

Пресет UFO нельзя считать универсальным стилем: это только валидная схема запуска. Перед production copy preset в `WORK`, заменить его числа измерениями конкретного конкурентного клипа, не менять preset движка. Затем единый финальный проход из раздела 4.

## 8. Автопроверка каждого образца

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames \
  -show_entries format=duration \
  -of default=noprint_wrappers=1 OUT.mp4

ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 OUT.mp4
```

Обязательный результат:

```text
codec_name=h264
width=1920
height=1080
pix_fmt=yuv420p
avg_frame_rate=30/1
nb_frames=60
duration=2.000000
```

Второй `ffprobe` не должен печатать ничего. Для faststart проверить порядок MP4 atoms: `moov` должен находиться перед `mdat`.

```bash
grep -abo 'moov\|mdat' OUT.mp4
```

## 9. Поточный порядок для 20–30 образцов

1. На каждый конкурентный клип завести отдельный `WORK/sample-NNN/`: `reference.mp4`, `spec.json`, `assets/`, `frames/`, `raw/`, `final.mp4`, `qa.txt`.
2. Выписать из референса: кадр cut/reveal, RGB/палитру, bounding boxes, anchor, z0/z1, x/y keyframes, opacity, blend mode, blur radius, easing. Не добавлять ни одного незафиксированного события.
3. Выбрать ровно один существующий маршрут из матрицы. Сложная графика — OpenMontage/Remotion; чистая цветокоррекция/движение — FFmpeg; фото — photofilm; совпавшая Pillow-карточка — её constructor.
4. Генерировать графику как редактируемый RGBA timed layer. Whole-frame baked infographic запрещена.
5. Композитить с footage одним FFmpeg-проходом, затем единый H.264-контракт.
6. Запускать `ffprobe`; любой результат не `60 frames / 2.000000 / no audio` блокирует выдачу.
7. Сохранять использованный command и source paths в `spec.json`, чтобы следующий дубль был воспроизводимым.

## 10. Ограничения аудита

- Конкретные 20–30 конкурентных клипов в задачу не переданы, поэтому значения `REF_*` не измерялись; шпаргалка не утверждает их цвет, координаты или easing.
- Битый symlink Draw Studio не восстановлен: движки менять запрещено. Живая копия найдена по пути `/Users/alphabravo/Downloads/Draw-Studio-src/src/montage_engine.py`.
- OpenMontage source и lockfile существуют, но зависимости не установлены; реальный рендер потребует `npm ci` в рабочей копии.
- 3D в `BASE/02-ENGINES/model-3d` не является рендер-движком; для перечисленных 16 приёмов 3D не требуется.
- `AGENTS-DETALI.md`, на который ссылается внешний `AGENTS.md`, в рабочем репозитории и соседних каталогах не найден; применены инструкции, переданные непосредственно в задаче.
