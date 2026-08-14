# Отчёт QA-рендеров

Проверено фактических MP4: 17.
Брак: 6; чисто: 11.
Скрипт: /Users/alphabravo/Documents/GithubWork/katalog-elementov/sverka/tools/qa_render_check.py.

Результаты:
- /Users/alphabravo/Documents/GithubWork/katalog-elementov/sverka/QA-BRAK.json — 4172 байт; JSON проверен парсером.
- /Users/alphabravo/Documents/GithubWork/katalog-elementov/sverka/QA-BRAK.md — 2930 байт.

По семействам:
- nash: 13 файлов, брак 4, чисто 9.
- nash-filtry: 4 файлов, брак 2, чисто 2.

Отмеченные проблемы:
- nash/crossfade--film-burn-с-растворением--07ba90f5.mp4: маджента
- nash/hard-cut--световой-переход-со-склейкой--7fa9d360.mp4: маджента
- nash/light-glow--film-burn-light-leak--234963b2.mp4: маджента
- nash/other--переход-через-красную-заливку--1c489052.mp4: маджента, тряска
- nash-filtry/filtry-akcentnaya-cvetovaya-tonirovka-2c7f5f48.mp4: маджента
- nash-filtry/filtry-plenochnaya-pyl-zerno-1358a562.mp4: маджента

Проверены существование и размеры выходных файлов; оба файла после записи повторно открыты и распарсены.
