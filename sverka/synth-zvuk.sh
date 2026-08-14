#!/bin/zsh
set -euo pipefail

src_dir="competitor-zvuk"
out_dir="nash-zvuk"
mkdir -p "$out_dir"

for src in "$src_dir"/*.mp3; do
  file=${src:t}
  stem=${file:r}
  out="$out_dir/$file"
  dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$src")
  fade=$(awk -v d="$dur" 'BEGIN { f=d*0.14; if (f>0.18) f=0.18; if (f<0.025) f=0.025; printf "%.6f", f }')
  fade_out=$(awk -v d="$dur" -v f="$fade" 'BEGIN { printf "%.6f", d-f }')

  case "$stem" in
    zvuk-whoosh-*)
      cmds="0.000 lp frequency 1200;0.050 lp frequency 1050;0.100 lp frequency 900;0.150 lp frequency 750;0.200 lp frequency 620;0.250 lp frequency 500;0.300 lp frequency 400;0.350 lp frequency 320;0.400 lp frequency 260;0.450 lp frequency 200"
      ffmpeg -nostdin -hide_banner -loglevel error -y \
        -f lavfi -i "anoisesrc=c=white:r=48000:d=${dur}:a=0.96" \
        -filter:a "asendcmd=commands='$cmds',lowpass@lp=f=1200:poles=2,afade=t=in:st=0:d=$fade,afade=t=out:st=$fade_out:d=$fade,volume=10dB,alimiter=limit=0.251188643:level=disabled,pan=stereo|c0=c0|c1=c0" \
        -c:a libmp3lame -b:a 192k -ar 48000 -ac 2 "$out"
      ;;
    zvuk-hit-*)
      ffmpeg -nostdin -hide_banner -loglevel error -y \
        -f lavfi -i "sine=f=72:r=48000:d=$dur" \
        -filter:a "volume='2*exp(-7*t)':eval=frame,alimiter=limit=0.251188643:level=disabled,pan=stereo|c0=c0|c1=c0" \
        -c:a libmp3lame -b:a 192k -ar 48000 -ac 2 "$out"
      ;;
    zvuk-riser-*)
      cmds="0.000 hp frequency 180;0.080 hp frequency 350;0.160 hp frequency 700;0.240 hp frequency 1200;0.320 hp frequency 2000;0.400 hp frequency 3200"
      ffmpeg -nostdin -hide_banner -loglevel error -y \
        -f lavfi -i "anoisesrc=c=white:r=48000:d=${dur}:a=0.96" \
        -filter:a "asendcmd=commands='$cmds',highpass@hp=f=180:poles=2,volume='0.25+0.75*t/$dur':eval=frame,afade=t=in:st=0:d=0.012,afade=t=out:st=$fade_out:d=$fade,volume=-12dB,alimiter=limit=0.251188643:level=disabled,pan=stereo|c0=c0|c1=c0" \
        -c:a libmp3lame -b:a 192k -ar 48000 -ac 2 "$out"
      ;;
    *)
      print -u2 "Unsupported audio type: $file"
      exit 64
      ;;
  esac
done
