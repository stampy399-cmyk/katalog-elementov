#!/usr/bin/env python3

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path


HASH_RE = re.compile(r"^[0-9a-f]{8,64}$", re.IGNORECASE)
DEFAULT_OSMOTR = Path(
    "/Users/alphabravo/Documents/GithubWork/nisha-santehnika/"
    "OSMOTR-tipografika-sverka.md"
)
ADDED_METADATA = {
    "spisok-punkty": {
        "group_id": "text-typography--список-пункты--d588b39f",
        "nazvanie": "Список / пункты",
        "video_id": "nNgwfV-_ydM",
        "start": 595.5,
        "end": 598.5,
        "baza": True,
    },
    "tekstovaya-plashka": {
        "group_id": "text-typography--текстовая-плашка--16320f2c",
        "nazvanie": "Текстовая плашка",
        "video_id": "4QRQ90F0Iv8",
        "start": 876.05,
        "end": 879.866,
        "baza": True,
    },
}


def extract_slug(filename: str) -> str:
    stem = Path(filename).stem
    parts = stem.split("--")
    if parts and HASH_RE.fullmatch(parts[-1]):
        parts.pop()
    if not parts or not parts[-1]:
        raise ValueError(f"Cannot extract slug from {filename!r}")
    return parts[-1].casefold()


def name_from_slug(slug: str) -> str:
    metadata = ADDED_METADATA.get(slug)
    if metadata:
        return str(metadata["nazvanie"])
    return slug.replace("-", " ").capitalize()


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = path.stat().st_mode & 0o777 if path.exists() else 0o644
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, delete=False
    ) as handle:
        handle.write(content)
        temporary_path = Path(handle.name)
    temporary_path.chmod(mode)
    temporary_path.replace(path)


def render_osmotr(records: list[dict]) -> str:
    rows = [
        "# Сверка типографики конкурента",
        "",
        f"Итог: {len(records)} групп.",
        "",
        "| Название | Файл | База/уник |",
        "|---|---|---|",
    ]
    for record in records:
        name = str(record["nazvanie"]).replace("|", "\\|")
        filename = str(record["file"]).replace("|", "\\|")
        category = "база" if record.get("baza") is True else "уник"
        rows.append(f"| {name} | `{filename}` | {category} |")
    rows.append("")
    return "\n".join(rows)


def validate(manifest_path: Path, mp4_paths: list[Path]) -> list[dict]:
    with manifest_path.open(encoding="utf-8") as handle:
        records = json.load(handle)
    if not isinstance(records, list):
        raise ValueError("MANIFEST.json root must be a list")
    for index, record in enumerate(records):
        filename = record.get("file") if isinstance(record, dict) else None
        if not isinstance(filename, str) or not (manifest_path.parent / filename).is_file():
            raise ValueError(f"Entry {index} references missing file: {filename!r}")
    if len(records) != len(mp4_paths):
        raise ValueError(
            f"Manifest has {len(records)} entries, but disk has {len(mp4_paths)} MP4 files"
        )
    if len({record["file"] for record in records}) != len(records):
        raise ValueError("MANIFEST.json contains duplicate file values")
    return records


def build_report(
    before_count: int,
    after_count: int,
    removed: list[dict],
    added: list[dict],
    manifest_path: Path,
    osmotr_path: Path,
    fallback_path: Path | None,
    error: str | None,
) -> str:
    lines = [
        "# Отчёт: починка MANIFEST.json",
        "",
        f"- Записей до: {before_count}",
        f"- Записей после: {after_count}",
        f"- Удалено: {len(removed)}",
        f"- Добавлено: {len(added)}",
        f"- Манифест: `{manifest_path}`",
        f"- Итоговая таблица: `{osmotr_path}`",
        "",
        "## Удалённые записи без файла",
        "",
    ]
    lines.extend(
        f"- {record.get('nazvanie', '<без названия>')} — `{record.get('file', '<без file>')}`"
        for record in removed
    )
    lines.extend(["", "## Добавленные файлы без записи", ""])
    lines.extend(
        f"- {record['nazvanie']} — `{record['file']}`" for record in added
    )
    lines.extend(["", "## Проверка", ""])
    lines.append(
        f"- PASS: `python3 json.load`, {after_count} существующих файлов, "
        f"число записей равно числу MP4."
    )
    if error:
        lines.extend(["", "## Не выполнено", ""])
        lines.append(f"- `{osmotr_path}` не обновлён: `{error}`")
        if fallback_path:
            lines.append(f"- Готовая таблица сохранена локально: `{fallback_path}`")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--directory", type=Path, default=Path(__file__).resolve().parent
    )
    parser.add_argument("--osmotr", type=Path, default=DEFAULT_OSMOTR)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    directory = args.directory.resolve()
    manifest_path = directory / "MANIFEST.json"
    mp4_paths = sorted(directory.glob("*.mp4"), key=lambda path: path.name.casefold())

    if args.check:
        records = validate(manifest_path, mp4_paths)
        print(json.dumps({"entries": len(records), "mp4": len(mp4_paths), "valid": True}))
        return 0

    with manifest_path.open(encoding="utf-8") as handle:
        original_records = json.load(handle)
    if not isinstance(original_records, list):
        raise ValueError("MANIFEST.json root must be a list")

    files_by_slug: dict[str, Path] = {}
    for path in mp4_paths:
        slug = extract_slug(path.name)
        if slug in files_by_slug:
            raise ValueError(f"Multiple MP4 files have slug {slug!r}")
        files_by_slug[slug] = path

    matched_slugs: set[str] = set()
    updated_records: list[dict] = []
    removed_records: list[dict] = []
    for original in original_records:
        if not isinstance(original, dict) or not isinstance(original.get("file"), str):
            removed_records.append(original)
            continue
        slug = extract_slug(original["file"])
        path = files_by_slug.get(slug)
        if path is None or slug in matched_slugs:
            removed_records.append(original)
            continue
        record = dict(original)
        record["file"] = path.name
        updated_records.append(record)
        matched_slugs.add(slug)

    added_records: list[dict] = []
    for slug, path in files_by_slug.items():
        if slug in matched_slugs:
            continue
        metadata = dict(ADDED_METADATA.get(slug, {}))
        record = {
            **metadata,
            "nazvanie": name_from_slug(slug),
            "file": path.name,
            "baza": metadata.get("baza", False),
        }
        updated_records.append(record)
        added_records.append(record)

    manifest_content = json.dumps(updated_records, ensure_ascii=False, indent=2) + "\n"
    atomic_write(manifest_path, manifest_content)
    validated_records = validate(manifest_path, mp4_paths)

    osmotr_content = render_osmotr(validated_records)
    fallback_path = directory / "OSMOTR-tipografika-sverka.md"
    osmotr_error = None
    actual_fallback: Path | None = None
    try:
        atomic_write(args.osmotr, osmotr_content)
    except OSError as exc:
        osmotr_error = f"{type(exc).__name__}: {exc}"
        atomic_write(fallback_path, osmotr_content)
        actual_fallback = fallback_path

    task_report = directory / "OTCHET-fix-manifest.md"
    report_content = build_report(
        len(original_records),
        len(validated_records),
        removed_records,
        added_records,
        manifest_path,
        args.osmotr,
        actual_fallback,
        osmotr_error,
    )
    atomic_write(task_report, report_content)

    result = {
        "before": len(original_records),
        "after": len(validated_records),
        "removed": [record.get("nazvanie") for record in removed_records],
        "added": [record["nazvanie"] for record in added_records],
        "manifest": str(manifest_path),
        "osmotr": str(args.osmotr),
        "osmotr_error": osmotr_error,
        "fallback": str(actual_fallback) if actual_fallback else None,
        "task_report": str(task_report),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 2 if osmotr_error else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
