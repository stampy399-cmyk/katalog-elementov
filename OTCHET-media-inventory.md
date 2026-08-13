# Инвентаризация медиа-параметров каталога

Дата замера: 2026-08-13.

## Критерий проверки наших образцов

- видеокодек: H.264 (`h264` в `ffprobe`);
- пиксельный формат: `yuv420p`;
- `faststart`: атом `moov` расположен раньше `mdat`;
- разрешение: `1920x1080`;
- длительность: `~2.0 с`, для однозначной машинной проверки принят допуск `1.9–2.1 с` включительно;
- аудиодорожка: отсутствует.

Для каждого MP4 выполнен отдельный вызов `ffprobe 6.0` с полями `format=duration,size` и `stream=codec_type,codec_name,width,height,pix_fmt`. Размер указан в байтах. `faststart` проверен по смещениям MP4-атомов: `moov < mdat`.

## Итоги

- Клипов конкурента (`assets/clips/*.mp4`): **42**.
- Наших образцов (`assets/ours/*.mp4`): **15**.
- Наших соответствует целевому формату: **2**.
- Наших не соответствует: **13**.
- Ошибок `ffprobe`: **0**.

## Наши образцы

| Файл | Длительность, с | Разрешение | Кодек | pix_fmt | faststart | Аудио | Размер, байт | Итог |
|---|---:|---:|---|---|---|---|---:|---|
| `assets/ours/blend-mode.mp4` | 2.400000 | 960x540 | h264 | yuv420p | нет | нет | 487184 | НЕ соответствует |
| `assets/ours/blur-effect.mp4` | 4.000000 | 960x540 | h264 | yuv420p | нет | нет | 2058697 | НЕ соответствует |
| `assets/ours/camera-motion.mp4` | 6.633333 | 1920x1080 | h264 | yuv420p | да | нет | 6555599 | НЕ соответствует |
| `assets/ours/crossfade.mp4` | 2.833333 | 960x540 | h264 | yuv420p | да | нет | 165229 | НЕ соответствует |
| `assets/ours/grid-lines.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 55542 | соответствует |
| `assets/ours/hard-cut.mp4` | 2.400000 | 960x540 | h264 | yuv420p | нет | нет | 327855 | НЕ соответствует |
| `assets/ours/inset-window.mp4` | 3.050667 | 1920x1080 | h264 | yuv420p | да | да | 922479 | НЕ соответствует |
| `assets/ours/keyframes-motion.mp4` | 8.000000 | 1920x1080 | h264 | yuv420p | да | нет | 2450748 | НЕ соответствует |
| `assets/ours/light-glow.mp4` | 2.400000 | 960x540 | h264 | yuv420p | нет | да | 295359 | НЕ соответствует |
| `assets/ours/opacity-fade.mp4` | 2.766667 | 960x540 | h264 | yuv420p | да | нет | 132945 | НЕ соответствует |
| `assets/ours/other.mp4` | 2.400000 | 960x540 | h264 | yuv420p | да | нет | 815931 | НЕ соответствует |
| `assets/ours/position-slide.mp4` | 8.000000 | 1376x768 | h264 | yuv420p | да | нет | 3394191 | НЕ соответствует |
| `assets/ours/saturation-color-v2.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 4167287 | соответствует |
| `assets/ours/saturation-color.mp4` | 4.000000 | 960x540 | h264 | yuv420p | нет | нет | 2058217 | НЕ соответствует |
| `assets/ours/scale-zoom.mp4` | 2.400000 | 960x540 | h264 | yuv420p | да | нет | 593018 | НЕ соответствует |

## Отклонения наших образцов

- `assets/ours/blend-mode.mp4`: длительность 2.400000 с вне допуска; 960x540 вместо 1920x1080; нет faststart.
- `assets/ours/blur-effect.mp4`: длительность 4.000000 с вне допуска; 960x540 вместо 1920x1080; нет faststart.
- `assets/ours/camera-motion.mp4`: длительность 6.633333 с вне допуска.
- `assets/ours/crossfade.mp4`: длительность 2.833333 с вне допуска; 960x540 вместо 1920x1080.
- `assets/ours/hard-cut.mp4`: длительность 2.400000 с вне допуска; 960x540 вместо 1920x1080; нет faststart.
- `assets/ours/inset-window.mp4`: длительность 3.050667 с вне допуска; есть аудиодорожка.
- `assets/ours/keyframes-motion.mp4`: длительность 8.000000 с вне допуска.
- `assets/ours/light-glow.mp4`: длительность 2.400000 с вне допуска; 960x540 вместо 1920x1080; нет faststart; есть аудиодорожка.
- `assets/ours/opacity-fade.mp4`: длительность 2.766667 с вне допуска; 960x540 вместо 1920x1080.
- `assets/ours/other.mp4`: длительность 2.400000 с вне допуска; 960x540 вместо 1920x1080.
- `assets/ours/position-slide.mp4`: длительность 8.000000 с вне допуска; 1376x768 вместо 1920x1080.
- `assets/ours/saturation-color.mp4`: длительность 4.000000 с вне допуска; 960x540 вместо 1920x1080; нет faststart.
- `assets/ours/scale-zoom.mp4`: длительность 2.400000 с вне допуска; 960x540 вместо 1920x1080.

У всех 15 наших образцов кодек `h264` и `pix_fmt=yuv420p`; отклонений по этим двум параметрам нет.

## Клипы конкурента

| Файл | Длительность, с | Разрешение | Кодек | pix_fmt | faststart | Аудио | Размер, байт |
|---|---:|---:|---|---|---|---|---:|
| `assets/clips/blend-mode-ref1.mp4` | 4.500000 | 1920x1080 | h264 | yuv420p | да | нет | 1907354 |
| `assets/clips/blend-mode-ref2.mp4` | 6.000000 | 1920x1080 | h264 | yuv420p | да | нет | 792743 |
| `assets/clips/blend-mode-ref3.mp4` | 2.800000 | 1920x1080 | h264 | yuv420p | да | нет | 1176227 |
| `assets/clips/blur-effect-ref1.mp4` | 3.000000 | 1920x1080 | h264 | yuv420p | да | нет | 1179019 |
| `assets/clips/blur-effect-ref2.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 931360 |
| `assets/clips/blur-effect-ref3.mp4` | 4.500000 | 1920x1080 | h264 | yuv420p | да | нет | 1935674 |
| `assets/clips/camera-motion-ref1.mp4` | 3.166667 | 1920x1080 | h264 | yuv420p | да | нет | 2086915 |
| `assets/clips/camera-motion-ref2.mp4` | 3.900000 | 1920x1080 | h264 | yuv420p | да | нет | 1718666 |
| `assets/clips/crossfade-ref1.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 542275 |
| `assets/clips/crossfade-ref2.mp4` | 2.433333 | 1920x1080 | h264 | yuv420p | да | нет | 1264129 |
| `assets/clips/crossfade-ref3.mp4` | 6.000000 | 1920x1080 | h264 | yuv420p | да | нет | 2302995 |
| `assets/clips/geometry-shape-ref1.mp4` | 2.300000 | 1920x1080 | h264 | yuv420p | да | нет | 692465 |
| `assets/clips/geometry-shape-ref2.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 847812 |
| `assets/clips/geometry-shape-ref3.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 444578 |
| `assets/clips/grid-lines-ref1.mp4` | 6.000000 | 1920x1080 | h264 | yuv420p | да | нет | 482291 |
| `assets/clips/grid-lines-ref3.mp4` | 5.166667 | 1920x1080 | h264 | yuv420p | да | нет | 1855887 |
| `assets/clips/hard-cut-ref1.mp4` | 2.033333 | 1920x1080 | h264 | yuv420p | да | нет | 1600644 |
| `assets/clips/hard-cut-ref2.mp4` | 3.133333 | 1920x1080 | h264 | yuv420p | да | нет | 593883 |
| `assets/clips/hard-cut-ref3.mp4` | 3.333333 | 1920x1080 | h264 | yuv420p | да | нет | 2236115 |
| `assets/clips/inset-window-ref1.mp4` | 4.500000 | 1920x1080 | h264 | yuv420p | да | нет | 922334 |
| `assets/clips/inset-window-ref2.mp4` | 3.000000 | 1920x1080 | h264 | yuv420p | да | нет | 199398 |
| `assets/clips/inset-window-ref3.mp4` | 5.000000 | 1920x1080 | h264 | yuv420p | да | нет | 395941 |
| `assets/clips/keyframes-motion-ref1.mp4` | 3.233333 | 1920x1080 | h264 | yuv420p | да | нет | 310964 |
| `assets/clips/keyframes-motion-ref2.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 947147 |
| `assets/clips/keyframes-motion-ref3.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 403311 |
| `assets/clips/light-glow-ref1.mp4` | 2.500000 | 1920x1080 | h264 | yuv420p | да | нет | 2448906 |
| `assets/clips/light-glow-ref2.mp4` | 3.000000 | 1920x1080 | h264 | yuv420p | да | нет | 1774112 |
| `assets/clips/light-glow-ref3.mp4` | 2.600000 | 1920x1080 | h264 | yuv420p | да | нет | 974697 |
| `assets/clips/opacity-fade-ref1.mp4` | 2.300000 | 1920x1080 | h264 | yuv420p | да | нет | 536123 |
| `assets/clips/photo-image-ref1.mp4` | 6.000000 | 1920x1080 | h264 | yuv420p | да | нет | 1350509 |
| `assets/clips/photo-image-ref2.mp4` | 6.000000 | 1920x1080 | h264 | yuv420p | да | нет | 259157 |
| `assets/clips/photo-image-ref3.mp4` | 3.000000 | 1920x1080 | h264 | yuv420p | да | нет | 199398 |
| `assets/clips/position-slide-ref1.mp4` | 2.800000 | 1920x1080 | h264 | yuv420p | да | нет | 1833780 |
| `assets/clips/position-slide-ref2.mp4` | 2.000000 | 1920x1080 | h264 | yuv420p | да | нет | 3295479 |
| `assets/clips/saturation-color-ref1.mp4` | 1.166667 | 1920x1080 | h264 | yuv420p | да | нет | 1357965 |
| `assets/clips/saturation-color-ref2.mp4` | 2.600000 | 1920x1080 | h264 | yuv420p | да | нет | 732945 |
| `assets/clips/saturation-color-ref3.mp4` | 2.466667 | 1920x1080 | h264 | yuv420p | да | нет | 467641 |
| `assets/clips/scale-zoom-ref1.mp4` | 6.000000 | 1920x1080 | h264 | yuv420p | да | нет | 725760 |
| `assets/clips/scale-zoom-ref2.mp4` | 3.900000 | 1920x1080 | h264 | yuv420p | да | нет | 2078602 |
| `assets/clips/scale-zoom-ref3.mp4` | 2.500000 | 1920x1080 | h264 | yuv420p | да | нет | 889274 |
| `assets/clips/text-typography-ref1.mp4` | 3.100000 | 1920x1080 | h264 | yuv420p | да | нет | 380990 |
| `assets/clips/text-typography-ref2.mp4` | 4.000000 | 1920x1080 | h264 | yuv420p | да | нет | 165908 |

## Ограничения

- `AGENTS-DETALI.md`, на который ссылается переданный `AGENTS.md`, в доступном дереве репозитория не найден.
- Медиафайлы не изменялись и не удалялись; коммиты не создавались.
