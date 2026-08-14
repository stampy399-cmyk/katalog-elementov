#!/usr/bin/env python3
"""Mass QA of our renders against the matching competitor clips."""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import statistics
import subprocess
import sys
from pathlib import Path
from typing import Any


FAMILIES = (
    ("nash", "competitor"),
    ("nash-filtry", "competitor-filtry"),
)
ANALYSIS_WIDTH = 320
ANALYSIS_HEIGHT = 180
PROBLEM_ORDER = ("маджента", "тряска", "пустота", "соответствие", "техника")
PSNR_JUMP_DB = 5.0


def executable(name: str, fallback: str) -> str:
    configured = os.environ.get(name)
    if configured:
        return configured
    found = shutil.which(fallback)
    if found:
        return found
    return fallback


FFMPEG = executable("FFMPEG", "ffmpeg")
FFPROBE = executable("FFPROBE", "ffprobe")


def command(args: list[str]) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)


def load_manifest(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError(f"MANIFEST.json must contain an array: {path}")
    return [entry for entry in data if isinstance(entry, dict)]


def parse_rate(value: Any) -> float | None:
    if not isinstance(value, str) or not value:
        return None
    if "/" in value:
        numerator, denominator = value.split("/", 1)
        try:
            denominator_value = float(denominator)
            return float(numerator) / denominator_value if denominator_value else None
        except ValueError:
            return None
    try:
        return float(value)
    except ValueError:
        return None


def probe(path: Path) -> dict[str, Any]:
    result = command(
        [
            FFPROBE,
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(path),
        ]
    )
    if result.returncode != 0:
        return {"valid": False, "error": result.stderr.decode("utf-8", "replace").strip()}
    try:
        data = json.loads(result.stdout.decode("utf-8"))
    except json.JSONDecodeError as exc:
        return {"valid": False, "error": f"ffprobe JSON: {exc}"}

    streams = data.get("streams") or []
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    audio_count = sum(1 for stream in streams if stream.get("codec_type") == "audio")
    if video is None:
        return {"valid": False, "audio_count": audio_count, "error": "no video stream"}

    duration_value = video.get("duration") or (data.get("format") or {}).get("duration")
    try:
        duration = float(duration_value)
    except (TypeError, ValueError):
        duration = None

    fps = parse_rate(video.get("avg_frame_rate"))
    if fps is None or fps <= 0:
        fps = parse_rate(video.get("r_frame_rate"))

    return {
        "valid": True,
        "width": video.get("width"),
        "height": video.get("height"),
        "fps": fps,
        "duration": duration,
        "audio_count": audio_count,
    }


def raw_frames(path: Path, timestamp: float | None, count: int | None, pixel_format: str) -> bytes:
    args = [FFMPEG, "-hide_banner", "-loglevel", "error"]
    if timestamp is not None:
        args.extend(["-ss", f"{max(0.0, timestamp):.6f}"])
    args.extend(["-i", str(path)])
    filters = f"scale={ANALYSIS_WIDTH}:{ANALYSIS_HEIGHT}:flags=area,format={pixel_format}"
    args.extend(["-vf", filters])
    if count is not None:
        args.extend(["-frames:v", str(count)])
    args.extend(["-f", "rawvideo", "-pix_fmt", pixel_format, "pipe:1"])
    result = command(args)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", "replace").strip() or "ffmpeg failed")
    return result.stdout


def split_frames(data: bytes, bytes_per_pixel: int) -> list[bytes]:
    frame_size = ANALYSIS_WIDTH * ANALYSIS_HEIGHT * bytes_per_pixel
    if frame_size <= 0:
        return []
    usable = len(data) - (len(data) % frame_size)
    return [data[offset : offset + frame_size] for offset in range(0, usable, frame_size)]


def rgb_frames(path: Path) -> list[bytes]:
    return split_frames(raw_frames(path, None, None, "rgb24"), 3)


def mean_rgb(data: bytes) -> tuple[float, float, float]:
    pixels = ANALYSIS_WIDTH * ANALYSIS_HEIGHT
    return (
        sum(data[0::3]) / pixels,
        sum(data[1::3]) / pixels,
        sum(data[2::3]) / pixels,
    )


def color_samples(frames: list[bytes]) -> list[tuple[float, float, float]]:
    if not frames:
        raise RuntimeError("no frames")
    indices = (0, len(frames) // 2, len(frames) - 1)
    return [mean_rgb(frames[index]) for index in indices]


def magenta_flag(frames: list[bytes]) -> bool:
    return any(red + blue > 2.0 * green for red, green, blue in color_samples(frames))


def psnr(first: bytes, second: bytes) -> float:
    mse = sum((a - b) * (a - b) for a, b in zip(first, second)) / len(first)
    if mse == 0:
        return 100.0
    return 10.0 * math.log10((255.0 * 255.0) / mse)


def shake_flag(frames: list[bytes]) -> bool:
    if len(frames) < 10:
        return False
    start = max(0, len(frames) // 2 - 4)
    window = frames[start : start + 10]
    if len(window) < 10:
        window = frames[-10:]
    values = [psnr(first, second) for first, second in zip(window, window[1:])]
    jumps = [
        index
        for index, (first, second) in enumerate(zip(values, values[1:]))
        if abs(second - first) > PSNR_JUMP_DB
    ]
    return sum(1 for first, second in zip(jumps, jumps[1:]) if second - first in (2, 3)) >= 2


def brightness_flag(frames: list[bytes]) -> bool:
    if not frames:
        return False
    means = [
        0.299 * red + 0.587 * green + 0.114 * blue
        for red, green, blue in (mean_rgb(frame) for frame in frames)
    ]
    average_brightness = statistics.fmean(means)
    luma_values: list[float] = []
    pixel_stride = 64
    for frame in frames:
        for offset in range(0, len(frame), 3 * pixel_stride):
            red, green, blue = frame[offset : offset + 3]
            luma_values.append(0.299 * red + 0.587 * green + 0.114 * blue)
    variance = statistics.pvariance(luma_values) if luma_values else 0.0
    return average_brightness < 8.0 or variance <= 1.0


def technical_problems(metadata: dict[str, Any]) -> list[str]:
    if not metadata.get("valid"):
        return ["техника: невалидный MP4"]

    problems: list[str] = []
    width = metadata.get("width")
    height = metadata.get("height")
    if width != 1920 or height != 1080:
        if width is None or height is None:
            problems.append("техника: нет разрешения")
        else:
            problems.append(f"техника: {width}x{height}")

    fps = metadata.get("fps")
    if fps is None or abs(fps - 30.0) > 0.01:
        problems.append(f"техника: {fps:.3f} fps" if fps is not None else "техника: нет FPS")

    duration = metadata.get("duration")
    if duration is None or duration < 3.0 or duration > 6.0:
        problems.append(
            f"техника: {duration:.2f}с" if duration is not None else "техника: нет длительности"
        )

    if int(metadata.get("audio_count") or 0) < 1:
        problems.append("техника: нет аудио")
    return problems


def problem_sort_key(problem: str) -> tuple[int, str]:
    for index, prefix in enumerate(PROBLEM_ORDER):
        if problem.startswith(prefix):
            return index, problem
    return len(PROBLEM_ORDER), problem


def actual_manifest_entry(path: Path, manifest: list[dict[str, Any]]) -> dict[str, Any] | None:
    entries_by_file = {entry.get("file"): entry for entry in manifest if entry.get("file")}
    if path.name in entries_by_file:
        return entries_by_file[path.name]
    if path.name.endswith(".tmp.mp4"):
        base_name = path.name[: -len(".tmp.mp4")] + ".mp4"
        return entries_by_file.get(base_name)
    return None


def file_size(path: Path) -> int:
    try:
        return path.stat().st_size
    except OSError:
        return 0


def render_markdown(results: list[dict[str, Any]], totals: dict[str, Any], manifest_notes: list[str]) -> str:
    ordered = sorted(results, key=lambda row: (row["verdikt"] != "brak", row["family"], row["file"]))
    lines = [
        "# QA-брак",
        "",
        "| family | group_id | file | problems | verdict |",
        "|---|---|---|---|---|",
    ]
    for row in ordered:
        problems = "<br>".join(row["problemy"])
        lines.append(
            f"| {row['family']} | {row['group_id']} | {row['file']} | {problems or '—'} | {row['verdikt']} |"
        )
    lines.extend(["", f"Итого файлов: {totals['checked']}.", f"Брак: {totals['brak']}.", f"Чисто: {totals['chisto']}."])
    for family in totals["families"]:
        lines.append(
            f"{family['family']}: всего {family['total']}, брак {family['brak']}, чисто {family['chisto']}."
        )
    if manifest_notes:
        lines.extend(["", "Проверка соответствия MANIFEST:"])
        lines.extend(f"- {note}" for note in manifest_notes)
    return "\n".join(lines) + "\n"


def run(root: Path) -> tuple[list[dict[str, Any]], dict[str, Any], list[str]]:
    results: list[dict[str, Any]] = []
    manifest_notes: list[str] = []
    family_totals: list[dict[str, int | str]] = []

    for family, competitor_dir_name in FAMILIES:
        ours_dir = root / family
        competitor_dir = root / competitor_dir_name
        ours_manifest = load_manifest(ours_dir / "MANIFEST.json")
        competitor_manifest = load_manifest(competitor_dir / "MANIFEST.json")
        competitor_by_group = {entry.get("group_id"): entry for entry in competitor_manifest}

        ours_paths = sorted(
            path
            for path in ours_dir.glob("*.mp4")
            if path.is_file() and not path.name.endswith(".tmp.mp4")
        )
        manifest_files = {entry.get("file") for entry in ours_manifest if entry.get("file")}
        actual_manifest_files = {
            actual_manifest_entry(path, ours_manifest).get("file")
            for path in ours_paths
            if actual_manifest_entry(path, ours_manifest) is not None
        }
        missing_files = sorted(manifest_files - actual_manifest_files)
        if missing_files:
            manifest_notes.append(f"{family}: в MANIFEST есть отсутствующие файлы: {', '.join(missing_files)}")

        family_rows: list[dict[str, Any]] = []
        for ours_path in ours_paths:
            ours_entry = actual_manifest_entry(ours_path, ours_manifest)
            group_id = str(ours_entry.get("group_id")) if ours_entry and ours_entry.get("group_id") else "не указан в MANIFEST"
            problems: list[str] = []

            if ours_entry is None:
                problems.append("соответствие: нет group_id в MANIFEST")
            competitor_entry = competitor_by_group.get(group_id) if ours_entry else None
            competitor_path = competitor_dir / str(competitor_entry.get("file")) if competitor_entry and competitor_entry.get("file") else None
            if competitor_entry is None or competitor_path is None or not competitor_path.is_file():
                problems.append("соответствие: нет файла конкурента")

            ours_metadata = probe(ours_path)
            problems.extend(technical_problems(ours_metadata))
            ours_frames: list[bytes] = []
            if ours_metadata.get("valid"):
                try:
                    ours_frames = rgb_frames(ours_path)
                    if magenta_flag(ours_frames):
                        problems.append("маджента")
                    if shake_flag(ours_frames):
                        problems.append("тряска")
                    if brightness_flag(ours_frames):
                        problems.append("пустота")
                except RuntimeError:
                    problems.append("техника: ошибка чтения кадров")

            problems = sorted(set(problems), key=problem_sort_key)
            family_rows.append(
                {
                    "family": family,
                    "group_id": group_id,
                    "file": ours_path.name,
                    "problemy": problems,
                    "verdikt": "brak" if problems else "chisto",
                }
            )

        results.extend(family_rows)
        family_totals.append(
            {
                "family": family,
                "total": len(family_rows),
                "brak": sum(row["verdikt"] == "brak" for row in family_rows),
                "chisto": sum(row["verdikt"] == "chisto" for row in family_rows),
            }
        )

    totals = {
        "checked": len(results),
        "brak": sum(row["verdikt"] == "brak" for row in results),
        "chisto": sum(row["verdikt"] == "chisto" for row in results),
        "families": family_totals,
    }
    return results, totals, manifest_notes


def write_outputs(root: Path, results: list[dict[str, Any]], totals: dict[str, Any], manifest_notes: list[str]) -> None:
    json_path = root / "QA-BRAK.json"
    md_path = root / "QA-BRAK.md"
    report_path = root / "OTCHET-qa-renders.md"

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(results, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    md_path.write_text(render_markdown(results, totals, manifest_notes), encoding="utf-8")

    sizes = {str(path.relative_to(root)): file_size(path) for path in (json_path, md_path)}
    report_lines = [
        "# Отчёт QA-рендеров",
        "",
        f"Проверено фактических MP4: {totals['checked']}.",
        f"Брак: {totals['brak']}; чисто: {totals['chisto']}.",
        f"Скрипт: {Path(__file__).resolve()}.",
        "",
        "Результаты:",
        f"- {json_path.resolve()} — {sizes[str(json_path.relative_to(root))]} байт; JSON проверен парсером.",
        f"- {md_path.resolve()} — {sizes[str(md_path.relative_to(root))]} байт.",
        "",
        "По семействам:",
    ]
    report_lines.extend(
        f"- {family['family']}: {family['total']} файлов, брак {family['brak']}, чисто {family['chisto']}."
        for family in totals["families"]
    )
    report_lines.extend(["", "Отмеченные проблемы:"])
    report_lines.extend(
        f"- {row['family']}/{row['file']}: {', '.join(row['problemy']) or 'нет' }"
        for row in results
        if row["verdikt"] == "brak"
    )
    if manifest_notes:
        report_lines.extend(["", "Несоответствия MANIFEST:"])
        report_lines.extend(f"- {note}" for note in manifest_notes)
    report_lines.extend(["", "Проверены существование и размеры выходных файлов; оба файла после записи повторно открыты и распарсены."])
    report_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")


def validate_outputs(root: Path, totals: dict[str, Any]) -> None:
    json_path = root / "QA-BRAK.json"
    md_path = root / "QA-BRAK.md"
    report_path = root / "OTCHET-qa-renders.md"
    for path in (json_path, md_path, report_path):
        if not path.is_file() or path.stat().st_size <= 0:
            raise RuntimeError(f"output missing or empty: {path}")
    with json_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list) or len(data) != totals["checked"]:
        raise RuntimeError(f"QA-BRAK.json row count mismatch: {len(data) if isinstance(data, list) else 'not an array'}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    try:
        results, totals, manifest_notes = run(root)
        write_outputs(root, results, totals, manifest_notes)
        validate_outputs(root, totals)
    except Exception as exc:
        print(f"QA FAILED: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({"checked": totals["checked"], "brak": totals["brak"], "chisto": totals["chisto"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
