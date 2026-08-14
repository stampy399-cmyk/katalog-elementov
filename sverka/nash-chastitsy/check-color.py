#!/usr/bin/env python3
import json
import sys
from pathlib import Path

import cv2


FRAME_INDICES = (15, 75, 135)
SOURCE_BY_GROUP = {
    "empty--неразмеченный-элемент-29f32a7c--4cc57def": "P1.mp4",
    "empty--неразмеченный-элемент-2c55431e--c6121190": "P2.mp4",
    "empty--неразмеченный-элемент-70a553d1--31226553": "P3.mp4",
    "empty--неразмеченный-элемент-db5ea07c--cee9f2d8": "P4.mp4",
    "empty--неразмеченный-элемент-eba7d7f7--a6a0d520": "P1.mp4",
    "other--частицы-оверлей--4e3a82df": "P2.mp4",
    "position-slide--пленочная-пыль-зерно--1358a562": "P3.mp4",
    "text-typography--текстовая-плашка--16320f2c": "P4.mp4",
}


def sample_rgb(path):
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"cannot open {path}")

    wanted = set(FRAME_INDICES)
    samples = []
    index = 0
    while wanted:
        ok, frame = capture.read()
        if not ok:
            break
        if index in wanted:
            blue, green, red = frame.mean(axis=(0, 1))
            samples.append(
                {
                    "frame": index,
                    "rgb": [round(float(red), 2), round(float(green), 2), round(float(blue), 2)],
                }
            )
            wanted.remove(index)
        index += 1
    capture.release()

    if wanted:
        missing = ",".join(str(value) for value in sorted(wanted))
        raise RuntimeError(f"missing frames {missing} in {path}")
    return samples


def average_rgb(samples):
    return [round(sum(sample["rgb"][channel] for sample in samples) / len(samples), 2) for channel in range(3)]


def main():
    render_dir = Path(__file__).resolve().parent
    sverka_dir = render_dir.parent
    manifest = json.loads((render_dir / "MANIFEST.json").read_text(encoding="utf-8"))
    if len(manifest) != 8:
        raise RuntimeError(f"expected 8 manifest entries, got {len(manifest)}")

    source_cache = {}
    results = []
    passed_frames = 0
    for entry in manifest:
        group_id = entry["group_id"]
        source_name = SOURCE_BY_GROUP[group_id]
        source_samples = source_cache.setdefault(
            source_name,
            sample_rgb(sverka_dir / "footage" / source_name),
        )
        render_samples = sample_rgb(render_dir / entry["file"])
        frames = []
        for source_sample, render_sample in zip(source_samples, render_samples):
            source_rgb = source_sample["rgb"]
            render_rgb = render_sample["rgb"]
            channel_delta = [round(abs(render_rgb[i] - source_rgb[i]), 2) for i in range(3)]
            red, green, blue = render_rgb
            magenta = min(red - green, blue - green) > 10.0
            tone_mismatch = max(channel_delta) > 20.0
            passed = not magenta and not tone_mismatch
            passed_frames += int(passed)
            frames.append(
                {
                    "frame": render_sample["frame"],
                    "source_rgb": source_rgb,
                    "render_rgb": render_rgb,
                    "channel_delta": channel_delta,
                    "magenta": magenta,
                    "tone_mismatch": tone_mismatch,
                    "passed": passed,
                }
            )
        results.append(
            {
                "group_id": group_id,
                "file": entry["file"],
                "source": source_name,
                "source_average_rgb": average_rgb(source_samples),
                "render_average_rgb": average_rgb(render_samples),
                "frames": frames,
                "passed": all(frame["passed"] for frame in frames),
            }
        )

    output = {
        "frame_indices": list(FRAME_INDICES),
        "renders_passed": sum(result["passed"] for result in results),
        "renders_total": len(results),
        "frames_passed": passed_frames,
        "frames_total": len(results) * len(FRAME_INDICES),
        "results": results,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if output["renders_passed"] == output["renders_total"] else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (KeyError, OSError, RuntimeError, ValueError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
