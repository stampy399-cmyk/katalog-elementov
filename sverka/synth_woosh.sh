#!/bin/bash
# synth_woosh.sh - Synthesize and apply woosh effect to video
# Usage: synth_woosh.sh <input.mp4> <center_timestamp_sec> <output.mp4>
#
# Effect: white noise with sweep filter (1200→200 Hz), fade in/out, -12dB peak
# Dual-mono stereo (identical signal both channels)

set -euo pipefail

input="$1"
center="$2"
output="$3"

[[ -f "$input" ]] || { echo "Input not found: $input" >&2; exit 66; }
command -v ffmpeg >/dev/null || { echo "ffmpeg is required" >&2; exit 69; }
command -v ffprobe >/dev/null || { echo "ffprobe is required" >&2; exit 69; }
[[ "$center" =~ ^[0-9]+([.][0-9]+)?$ ]] || { echo "Invalid timestamp: $center" >&2; exit 65; }

# Get video duration
duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$input")

# Validate woosh fits inside video (0.3 sec duration, needs center ±0.15 margin)
python3 - "$center" "$duration" <<'PY'
import sys
center, duration = map(float, sys.argv[1:])
if not 0.15 <= center <= duration - 0.15:
    raise SystemExit(f"Timestamp {center} must allow full 0.3s woosh inside video (0-{duration}s)")
PY

# Calculate delay in milliseconds: woosh starts 0.15 sec before center
delay_ms=$(python3 - "$center" <<'PY'
import sys
print(int(round((float(sys.argv[1]) - 0.15) * 1000)))
PY
)

# Create temp directory
temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/synth-woosh.XXXXXX")
trap 'rm -rf "$temp_dir"' EXIT

sweep_cmd="$temp_dir/sweep.cmd"
filter_txt="$temp_dir/filter.txt"
temp_output="$temp_dir/output.mp4"

# Generate sweep commands: lower frequency from 1200 Hz to 200 Hz over 0.3 sec
for i in $(seq 0 30); do
  time=$(python3 -c "print(f'{$i / 100:.3f}')")
  freq=$(python3 -c "print(int(1200 - (1000 * $i / 30)))")
  printf '%s lp frequency %s;\n' "$time" "$freq" >> "$sweep_cmd"
done

# Build filtergraph for audio
cat > "$filter_txt" <<'FILTERGRAPH'
[1:a]asendcmd=f=CMDFILE,lowpass@lp=f=1200:poles=2,afade=t=in:st=0:d=0.1,afade=t=out:st=0.2:d=0.1,volume=-12dB,adelay=DELAYMS:all=1[woosh];
[0:a][woosh]amix=inputs=2:duration=first:normalize=0[mixed];
[mixed]pan=stereo|c0=c0|c1=c0[stereo_out]
FILTERGRAPH

sed -i "" "s|CMDFILE|$sweep_cmd|g; s|DELAYMS|$delay_ms|g" "$filter_txt"

echo "[*] Synthesizing woosh: center=${center}s, delay=${delay_ms}ms, duration=${duration}s"

ffmpeg -hide_banner -loglevel error -y \
  -i "$input" \
  -f lavfi -i "anoisesrc=c=white:duration=0.3:amplitude=0.5:r=48000" \
  -filter_complex_script "$filter_txt" \
  -map 0:v -map '[stereo_out]' \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  "$temp_output" || { echo "ffmpeg encode failed" >&2; exit 1; }

echo "[*] Verifying dual-mono stereo..."
ffmpeg -hide_banner -loglevel error -i "$temp_output" \
  -map 0:a:0 -af 'pan=mono|c0=c0-c1,volumedetect' \
  -f null - 2>"$temp_dir/dualmono.log" || true

if grep -q 'max_volume: -inf dB' "$temp_dir/dualmono.log"; then
  echo "[+] Channels identical (difference = -inf dB)"
else
  tail -1 "$temp_dir/dualmono.log" | grep max_volume || echo "[!] Check channels manually"
fi

mkdir -p "$(dirname "$output")"
mv "$temp_output" "$output"
echo "[+] Saved: $output"
