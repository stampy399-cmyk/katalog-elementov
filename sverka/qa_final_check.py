#!/usr/bin/env python3
"""
QA Final Check: Fast batch validation for all family pairs
Checks: video (1080p30, duration 3-6s, audio present)
        audio (volume, duration ±30%)
Output: QA-FINAL.json + QA-FINAL.md
"""

import json
import subprocess
import os
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional, Dict, List, Tuple
import sys
import statistics

BASE = Path('/Users/alphabravo/Documents/GithubWork/katalog-elementov/sverka')

# Pairs to check (skip nash-kamera and nash-infografika during render)
FAMILIES = [
    ('nash', 'competitor'),
    ('nash-filtry', 'competitor-filtry'),
    ('nash-chastitsy', 'competitor-chastitsy'),
    ('nash-futazhi', 'competitor-futazhi'),
    ('nash-tipografika', 'competitor-tipografika'),
    ('nash-zvuk', 'competitor-zvuk'),
]

@dataclass
class QAResult:
    family: str
    file: str
    verdikt: str  # "chisto" or "brak"
    problemy: List[str]

def run_ffprobe(filepath, queries):
    """Run ffprobe with multiple queries"""
    cmd = f'ffprobe -v error -show_format -show_streams -of json "{filepath}"'
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
        return json.loads(result.stdout) if result.stdout else {}
    except:
        return {}

def get_video_info(filepath):
    """Get video stream info: width, height, fps, duration, has_audio"""
    probe_data = run_ffprobe(filepath, [])

    streams = probe_data.get('streams', [])
    video_stream = None
    audio_exists = False

    for s in streams:
        if s.get('codec_type') == 'video' and not video_stream:
            video_stream = s
        elif s.get('codec_type') == 'audio':
            audio_exists = True

    if not video_stream:
        return None, None, None, None, False

    width = video_stream.get('width')
    height = video_stream.get('height')
    fps_str = video_stream.get('r_frame_rate', '30/1')

    # Parse fps
    try:
        if '/' in fps_str:
            num, den = map(int, fps_str.split('/'))
            fps = num / den
        else:
            fps = float(fps_str)
    except:
        fps = None

    # Get duration
    duration = None
    if 'duration' in video_stream:
        try:
            duration = float(video_stream['duration'])
        except:
            pass

    if not duration and 'format' in probe_data:
        try:
            duration = float(probe_data['format'].get('duration', 0))
        except:
            pass

    return width, height, fps, duration, audio_exists

def get_audio_info(filepath):
    """Get audio info: duration, max volume"""
    probe_data = run_ffprobe(filepath, [])

    # Duration
    duration = None
    if 'format' in probe_data:
        try:
            duration = float(probe_data['format'].get('duration', 0))
        except:
            pass

    # Volume via volumedetect filter
    max_volume = None
    try:
        cmd = f'ffmpeg -v error -i "{filepath}" -af volumedetect -f null - 2>&1 | grep max_volume'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        if 'max_volume' in result.stdout:
            # Parse "max_volume: -25.5 dB"
            parts = result.stdout.split('max_volume:')
            if len(parts) > 1:
                vol_str = parts[1].split('dB')[0].strip()
                max_volume = float(vol_str)
    except:
        pass

    return duration, max_volume

def check_video(filepath):
    """Check video file"""
    problems = []

    width, height, fps, duration, audio_exists = get_video_info(filepath)

    if width is None:
        return 'brak', ['no video stream']

    # Check resolution
    if width != 1920 or height != 1080:
        problems.append(f'resolution {width}x{height} (need 1920x1080)')

    # Check fps
    if fps and abs(fps - 30) > 0.5:
        problems.append(f'fps {fps:.1f} (need 30)')

    # Check duration
    if duration is None:
        problems.append('no duration info')
    elif not (3 <= duration <= 6):
        problems.append(f'duration {duration:.1f}s (need 3-6s)')

    # Check audio stream
    if not audio_exists:
        problems.append('no audio stream')

    verdikt = 'brak' if problems else 'chisto'
    return verdikt, problems

def check_audio(filepath, competitor_path):
    """Check audio file"""
    problems = []

    duration, max_volume = get_audio_info(filepath)

    # Check duration
    if duration is None:
        problems.append('no duration info')
    elif duration < 0.1:
        problems.append(f'duration {duration:.2f}s (too short)')

    # Check volume
    if max_volume is not None and max_volume < -25:
        problems.append(f'silent: max_volume {max_volume:.1f}dB')

    # Check duration vs competitor
    if os.path.exists(competitor_path):
        _, comp_dur = get_audio_info(competitor_path)
        if duration and comp_dur:
            ratio = duration / comp_dur
            if not (0.7 <= ratio <= 1.3):  # ±30%
                problems.append(f'duration mismatch: {duration:.2f}s vs {comp_dur:.2f}s ({ratio:.2f}x)')

    verdikt = 'brak' if problems else 'chisto'
    return verdikt, problems

def main():
    results = []
    stats = {'total': 0, 'chisto': 0, 'brak': 0, 'by_type': {}}

    for nash_name, comp_name in FAMILIES:
        nash_dir = BASE / nash_name
        comp_dir = BASE / comp_name

        if not nash_dir.exists():
            print(f"Warning: {nash_dir} not found", file=sys.stderr)
            continue

        # Determine file type
        is_audio = nash_name.endswith('-zvuk')
        pattern = '*.mp3' if is_audio else '*.mp4'
        files_to_check = sorted([f for f in nash_dir.glob(pattern) if not f.name.startswith('.')])

        for file_path in files_to_check:
            rel_name = file_path.name
            comp_file = comp_dir / rel_name

            stats['total'] += 1
            type_key = 'audio' if is_audio else 'video'
            if type_key not in stats['by_type']:
                stats['by_type'][type_key] = {'total': 0, 'chisto': 0, 'brak': 0}

            stats['by_type'][type_key]['total'] += 1

            print(f"Checking {nash_name}/{rel_name}...", file=sys.stderr)

            if is_audio:
                verdikt, problems = check_audio(str(file_path), str(comp_file))
            else:
                verdikt, problems = check_video(str(file_path))

            result = QAResult(family=nash_name, file=rel_name, verdikt=verdikt, problemy=problems)
            results.append(result)

            if verdikt == 'chisto':
                stats['chisto'] += 1
                stats['by_type'][type_key]['chisto'] += 1
            else:
                stats['brak'] += 1
                stats['by_type'][type_key]['brak'] += 1

    # Write JSON
    json_path = BASE / 'QA-FINAL.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump([asdict(r) for r in results], f, ensure_ascii=False, indent=2)
    print(f"Saved {json_path}", file=sys.stderr)

    # Write Markdown report
    md_path = BASE / 'QA-FINAL.md'
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write('# QA-FINAL Report\n\n')

        # Braks first
        f.write('## Брак (дефекты)\n\n')
        braks = [r for r in results if r.verdikt == 'brak']
        if braks:
            f.write('| Семейство | Файл | Проблемы |\n')
            f.write('|-----------|------|----------|\n')
            for r in braks:
                problems_str = '; '.join(r.problemy) if r.problemy else '(неизвестна)'
                f.write(f'| {r.family} | {r.file} | {problems_str} |\n')
        else:
            f.write('_Брака не найдено_\n')

        f.write('\n## Всё чисто\n\n')
        chistos = [r for r in results if r.verdikt == 'chisto']
        f.write(f'**Количество:** {len(chistos)} файлов\n\n')

        # Summary by family
        f.write('## Сводка по семействам\n\n')
        f.write('| Семейство | Всего | Чисто | Брак |\n')
        f.write('|-----------|-------|-------|------|\n')

        family_stats = {}
        for r in results:
            if r.family not in family_stats:
                family_stats[r.family] = {'total': 0, 'chisto': 0, 'brak': 0}
            family_stats[r.family]['total'] += 1
            if r.verdikt == 'chisto':
                family_stats[r.family]['chisto'] += 1
            else:
                family_stats[r.family]['brak'] += 1

        for family in sorted(family_stats.keys()):
            s = family_stats[family]
            f.write(f'| {family} | {s["total"]} | {s["chisto"]} | {s["brak"]} |\n')

        f.write('\n## Итого\n\n')
        f.write(f'- **Всего файлов:** {stats["total"]}\n')
        f.write(f'- **Чисто:** {stats["chisto"]}\n')
        f.write(f'- **Брак:** {stats["brak"]}\n')
        for type_key in sorted(stats['by_type'].keys()):
            ts = stats['by_type'][type_key]
            f.write(f'\n**{type_key.capitalize()}:**\n')
            f.write(f'  - Всего: {ts["total"]}\n')
            f.write(f'  - Чисто: {ts["chisto"]}\n')
            f.write(f'  - Брак: {ts["brak"]}\n')

    print(f"Saved {md_path}", file=sys.stderr)
    print(f"\nDone: {stats['total']} total, {stats['chisto']} chisto, {stats['brak']} brak", file=sys.stderr)

if __name__ == '__main__':
    main()
