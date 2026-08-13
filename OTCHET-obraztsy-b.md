# Отчёт: образцы B

## GRID-LINES

- Выход: `/Users/alphabravo/Downloads/katalog-elementov/assets/ours/grid-lines.mp4`
- Движок: `black_grid_frame` из `/Users/alphabravo/Documents/КОНВЕЙЕР ЮТУБ АВТОМТАЗИЦИЯ/production/tonrohr_first3/graphics/templates.py`.
- Сборка: 60 абсолютных кадров через `black_grid_frame(frame_index=0..59, duration_frames=60)`; существующий slide-in заголовка; `ffmpeg` fade-in 0.35 с для появления сетки/рамки; `libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart -an`.
- Результат `ffprobe`: H.264, yuv420p, 1920×1080, 30 fps, 60 кадров, 2.000 с, 55 542 байта.
- Faststart: atom `moov` с байта 36, `mdat` с байта 1551.

## SATURATION-COLOR

- Выход: `/Users/alphabravo/Downloads/katalog-elementov/assets/ours/saturation-color-v2.mp4`
- Исходный наш образец: `/Users/alphabravo/Downloads/katalog-elementov/assets/ours/camera-motion.mp4`.
- Приём: зарегистрированный `desaturation_ramp_v1` из `ours_tech_full.json`; команда `ffmpeg -ss 0.4 -i assets/ours/camera-motion.mp4 -t 2 -vf "eq=saturation='max(0,1-t/2)':eval=frame,format=yuv420p" -r 30 -c:v libx264 -crf 18 -movflags +faststart -an assets/ours/saturation-color-v2.mp4`.
- Ramp: saturation 1.0→0.0 за 2.0 с; контроль `signalstats SATAVG`: 24.4649 на 0.000 с, 12.1917 на 1.000 с, 1.95373 на 1.967 с.
- Результат `ffprobe`: H.264, yuv420p, 1920×1080, 30 fps, 60 кадров, 2.000 с, 4 167 287 байт.
- Faststart: atom `moov` с байта 36, `mdat` с байта 1631.

Старые `assets/ours/grid-lines.png` и `assets/ours/saturation-color.mp4` сохранены. Ошибок проверки нет. Коммит не создавался.
