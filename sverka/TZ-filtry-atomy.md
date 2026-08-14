# TZ: фильтры-атомы

## blend-mode--акцентная-цветовая-тонировка--2c7f5f48 — Акцентная цветовая тонировка

**ТИП:** BLEND-MODE — акцентная цветовая заливка через режим `multiply`.  
**Параметры:** цвет RGB(198, 28, 35) / HEX `#C61C23`; opacity 72%; saturation 115%; brightness −8%.  
**Динамика:** интенсивность тонировки 0% → 72% за 1.4000 с, удержание 72% 0.7000 с, затем возврат к 0% через смену на тёмную сетку.

## position-slide--пленочная-пыль-зерно--1358a562 — Плёночная пыль / зерно

**ТИП:** POSITION-SLIDE — движущийся плёночный overlay с пылью, зерном и царапинами.  
**Параметры:** пыль RGB(255, 255, 255), opacity 38%; зерно RGB(130, 130, 130), opacity 24%; цветной glitch RGB(59, 72, 210), opacity 28%; scale 100%.  
**Динамика:** слой непрерывно скользит по X от −100% до +100% за 8.0000 с; зерно мерцает с частотой 12 Гц, царапины остаются вертикальными.

## saturation-color--обесцвечивание-футажа--21db3adb — Обесцвечивание футажа

**ТИП:** SATURATION-COLOR — плавное обесцвечивание футажа.  
**Параметры:** saturation 100% → 0%; hue 0°; brightness 100%; contrast 105%; итоговый чёрно-белый слой сохраняет luminance 100%.  
**Динамика:** saturation снижается 100% → 0% за 1.4335 с, удерживается на 0% 1.0330 с, затем возвращается 0% → 100% за 1.4335 с.

## saturation-color--изменение-цвета-насыщенности--d1fd89bd — Изменение цвета / насыщенности

**ТИП:** SATURATION-COLOR — усиление насыщенности с тёплым сдвигом оттенка.  
**Параметры:** saturation 100% → 145%; hue +12°; brightness +4%; contrast +6%; color temperature +300 K.  
**Динамика:** параметры нарастают от 0% к целевым за 2.5000 с, затем удерживаются до конца 5.0000-секундного фрагмента; переход плавный, без рывка.

## Сводная таблица

| Видео | ТИП | Параметры |
|---|---|---|
| filtry-akcentnaya-cvetovaya-tonirovka-2c7f5f48.mp4 | BLEND-MODE | RGB(198,28,35), #C61C23, opacity 72%, saturation 115%, brightness −8% |
| filtry-plenochnaya-pyl-zerno-1358a562.mp4 | POSITION-SLIDE | RGB(255,255,255) / 38%, RGB(130,130,130) / 24%, RGB(59,72,210) / 28%, X −100% → +100% |
| filtry-obescvechivanie-futazha-21db3adb.mp4 | SATURATION-COLOR | saturation 100% → 0% → 100%, hue 0°, brightness 100%, contrast 105% |
| filtry-izmenenie-cveta-nasyshennosti-d1fd89bd.mp4 | SATURATION-COLOR | saturation 100% → 145%, hue +12°, brightness +4%, contrast +6%, temperature +300 K |
