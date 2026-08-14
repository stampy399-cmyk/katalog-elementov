#!/usr/bin/env python3

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATUS_PATH = ROOT / "STATUS.json"
DEFAULT_STATUS = "не просмотрено"
VALID_STATUSES = {DEFAULT_STATUS, "доработать", "утверждено"}
NUMBER_PATTERN = re.compile(r"^#(\d+)$")

FAMILIES = [
    {"name": "Переходы", "directory": "competitor"},
    {"name": "Частицы", "directory": "competitor-chastitsy"},
    {"name": "Фильтры", "directory": "competitor-filtry"},
    {"name": "Типографика", "directory": "competitor-tipografika"},
    {"name": "Инфографика", "directory": "competitor-infografika"},
    {"name": "Камера", "directory": "competitor-kamera"},
    {"name": "Футажи", "directory": "competitor-futazhi"},
    {"name": "Звук", "directory": "competitor-zvuk"},
]

INITIAL_REVISIONS = {
    "Световой переход со склейкой / light-leak": "плохо, изучить приём глубже",
    "Переход через красную заливку": "очень плохо, всегда идёт с типографикой (текст на заливке)",
    "Кроссфейд / растворение": "хорошо, чуть доработать",
    "Film-burn с растворением": "хорошо, чуть доработать",
    "Световой переход / wash / glitch-dissolve": "хорошо, чуть доработать",
    "Световой стингер, собирающий следующий план/сравнение": "плохо, кадр почти пустой",
    "Световая или glitch-вспышка со сменой плана": "есть над чем работать",
}


def load_json(path):
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def load_existing():
    if not STATUS_PATH.exists():
        return {}
    data = load_json(STATUS_PATH)
    if not isinstance(data, dict):
        raise ValueError(f"{STATUS_PATH} must contain a JSON object")
    return data


def format_number(value):
    return f"#{value:02d}"


def parse_number(value):
    if not value.startswith("#"):
        return None
    match = NUMBER_PATTERN.fullmatch(value)
    if not match:
        raise ValueError(f"Invalid global number: {value}")
    number = int(match.group(1))
    if number < 1 or format_number(number) != value:
        raise ValueError(f"Invalid global number: {value}")
    return number


def normalize_record(record):
    return {
        "group_id": str(record["group_id"]),
        "family": str(record["family"]),
        "status": record.get("status", DEFAULT_STATUS),
        "kommentariy": str(record.get("kommentariy", "")),
    }


def index_existing(data):
    by_identity = {}
    used_numbers = set()
    for number, record in data.items():
        if not isinstance(record, dict):
            raise ValueError(f"Invalid record: {number}")
        family = str(record.get("family", "")).strip()
        group_id = str(record.get("group_id", "")).strip()
        status = record.get("status", DEFAULT_STATUS)
        if not family or not group_id:
            raise ValueError(f"Missing identity for {number}")
        if status not in VALID_STATUSES:
            raise ValueError(f"Invalid status for {number}: {status}")
        identity = (family, group_id)
        if identity in by_identity:
            raise ValueError(f"Duplicate identity for {number}: {identity}")
        by_identity[identity] = (number, record)
        global_number = parse_number(number)
        if global_number is not None:
            if global_number in used_numbers:
                raise ValueError(f"Duplicate global number: {number}")
            used_numbers.add(global_number)
    return by_identity, used_numbers


def item_group_id(item):
    group_id = str(item.get("group_id", "")).strip()
    if group_id:
        return group_id
    filename = str(item.get("file", "")).strip()
    if filename:
        return f"file:{filename}"
    raise ValueError("Manifest item must contain group_id or file")


def make_default_record(family, item):
    title = str(item.get("nazvanie", ""))
    comment = INITIAL_REVISIONS.get(title, "") if family["name"] == "Переходы" else ""
    return {
        "group_id": item_group_id(item),
        "family": family["name"],
        "status": "доработать" if comment else DEFAULT_STATUS,
        "kommentariy": comment,
    }


def generate():
    existing_by_key = load_existing()
    existing, used_numbers = index_existing(existing_by_key)
    result = {}
    counts = {}
    matched_existing = set()
    current_identities = set()
    next_number = max(used_numbers, default=0) + 1

    def allocate(record):
        nonlocal next_number
        number = format_number(next_number)
        used_numbers.add(next_number)
        next_number += 1
        result[number] = record
        return number

    def preserve_or_allocate(family, item):
        record = make_default_record(family, item)
        identity = (record["family"], record["group_id"])
        if identity in current_identities:
            raise ValueError(f"Duplicate manifest identity: {identity}")
        current_identities.add(identity)

        old_entry = existing.get(identity)
        fallback_id = f"file:{str(item.get('file', '')).strip()}"
        if not old_entry and fallback_id != "file:":
            old_entry = existing.get((family["name"], fallback_id))

        if not old_entry:
            allocate(record)
            return

        old_key, old_record = old_entry
        matched_existing.add(old_key)
        record["status"] = old_record.get("status", DEFAULT_STATUS)
        record["kommentariy"] = str(old_record.get("kommentariy", ""))
        if parse_number(old_key) is None:
            allocate(record)
        else:
            result[old_key] = record

    for family in FAMILIES:
        manifest_path = ROOT / family["directory"] / "MANIFEST.json"
        if not manifest_path.exists():
            manifest = []
        else:
            manifest = load_json(manifest_path)
            if not isinstance(manifest, list):
                raise ValueError(f"{manifest_path} must contain a JSON array")

        counts[family["name"]] = len(manifest)
        for index, item in enumerate(manifest, start=1):
            if not isinstance(item, dict):
                raise ValueError(f"Invalid item {index} in {manifest_path}")
            preserve_or_allocate(family, item)

        for old_key, old_record in existing_by_key.items():
            is_legacy = parse_number(old_key) is None
            is_same_family = old_record.get("family") == family["name"]
            if old_key not in matched_existing and is_legacy and is_same_family:
                matched_existing.add(old_key)
                allocate(normalize_record(old_record))

    for old_key, old_record in existing_by_key.items():
        if old_key in matched_existing:
            continue
        global_number = parse_number(old_key)
        if global_number is None:
            allocate(normalize_record(old_record))
        else:
            result[old_key] = normalize_record(old_record)

    result = dict(sorted(result.items(), key=lambda entry: parse_number(entry[0])))

    temporary_path = STATUS_PATH.with_suffix(".json.tmp")
    temporary_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(STATUS_PATH)
    numbers = [parse_number(number) for number in result]
    return {
        "counts": counts,
        "current_total": sum(counts.values()),
        "status_total": len(result),
        "first_number": format_number(min(numbers)) if numbers else None,
        "last_number": format_number(max(numbers)) if numbers else None,
    }


if __name__ == "__main__":
    summary = generate()
    for family in FAMILIES:
        name = family["name"]
        print(f"{name}: {summary['counts'][name]}")
    print(f"Элементов: {summary['current_total']}")
    print(f"Записей STATUS: {summary['status_total']}")
    print(f"Диапазон: {summary['first_number']}…{summary['last_number']}")
