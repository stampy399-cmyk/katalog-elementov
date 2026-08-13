#!/usr/bin/env node

import {existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync} from "node:fs";
import {dirname, extname, resolve} from "node:path";
import {spawnSync} from "node:child_process";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const FRAMES = 60;
const DURATION = 2;

const supportedTypes = new Set([
  "hard-cut",
  "crossfade",
  "scale-zoom",
  "position-slide",
  "blur-effect",
  "blend-mode",
  "light-glow",
  "opacity-fade",
  "saturation-color",
  "grid-lines",
  "camera-motion",
  "inset-window",
]);

const remotionTypes = new Set([
  "text",
  "typography",
  "text-typography",
  "shape",
  "shapes",
  "geometry-shape",
  "card",
  "cards",
  "photo-image",
  "keyframes",
  "keyframes-motion",
  "complex-keyframes",
]);

function usage() {
  return "Usage: node scripts/make-sample.mjs path/to/spec.json";
}

function fail(message) {
  throw new Error(message);
}

function routeRemotion(reason) {
  fail(`маршрут Remotion, не ffmpeg: ${reason}`);
}

function asObject(value, name, required = true) {
  if (value === undefined && !required) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} должен быть объектом`);
  }
  return value;
}

function asNumber(object, key, options = {}) {
  const {defaultValue, min = -Infinity, max = Infinity, integer = false} = options;
  const raw = object[key] ?? defaultValue;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    fail(`${key} должен быть конечным числом`);
  }
  if (integer && !Number.isInteger(raw)) fail(`${key} должен быть целым числом`);
  if (raw < min || raw > max) fail(`${key} должен быть в диапазоне ${min}..${max}`);
  return raw;
}

function asString(object, key, options = {}) {
  const {defaultValue, allowed} = options;
  const raw = object[key] ?? defaultValue;
  if (typeof raw !== "string" || raw.length === 0) fail(`${key} должен быть непустой строкой`);
  if (allowed && !allowed.includes(raw)) fail(`${key} должен быть одним из: ${allowed.join(", ")}`);
  return raw;
}

function ffColor(value, name) {
  if (typeof value !== "string" || !/^(?:#|0x)?[0-9a-fA-F]{6}$/.test(value)) {
    fail(`${name} должен быть цветом #RRGGBB`);
  }
  return `0x${value.replace(/^(?:#|0x)/, "").toUpperCase()}`;
}

function rgb(value, name) {
  const color = ffColor(value, name).slice(2);
  return [0, 2, 4].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
}

function framePair(motion, fields) {
  const keyframes = motion.keyframes;
  if (keyframes === undefined) return null;
  if (!Array.isArray(keyframes) || keyframes.length !== 2) {
    routeRemotion("сложные keyframes");
  }
  for (const keyframe of keyframes) asObject(keyframe, "motion.keyframes[]");
  const animatedFields = ["x", "y", "scale", "opacity", "rotation"];
  for (const keyframe of keyframes) {
    for (const field of animatedFields) {
      if (keyframe[field] !== undefined && !fields.includes(field)) {
        routeRemotion("совмещённые position/scale/opacity keyframes");
      }
    }
  }
  const pair = {};
  for (const field of fields) {
    pair[`${field}Start`] = asNumber(keyframes[0], field);
    pair[`${field}End`] = asNumber(keyframes[1], field);
  }
  return pair;
}

function rejectRemotionFeatures(spec, motion, type) {
  if (spec.route === "remotion" || spec.requiresRemotion === true) {
    routeRemotion("маршрут явно задан в спеке");
  }
  for (const field of ["text", "texts", "shape", "shapes", "figures", "card", "cards"]) {
    if (spec[field] !== undefined) routeRemotion(`${field} требует отдельного timed layer`);
  }
  const easing = motion.easing ?? "linear";
  if (easing !== "linear") routeRemotion(`easing ${easing}`);
  if (motion.spring || motion.overshoot || motion.stagger || motion.complexKeyframes) {
    routeRemotion("сложные keyframes");
  }
  if (motion.keyframes !== undefined && !["scale-zoom", "position-slide", "camera-motion"].includes(type)) {
    routeRemotion(`keyframes для ${type}`);
  }
  for (const field of ["opacityKeyframes", "positionKeyframes", "scaleKeyframes", "pathKeyframes", "timeline"]) {
    if (motion[field] !== undefined) routeRemotion(`сложные keyframes: ${field}`);
  }
  for (const field of ["opacityStart", "opacityEnd", "scaleStart", "scaleEnd", "rotationStart", "rotationEnd", "path"]) {
    if (motion[field] !== undefined) routeRemotion(`сложные keyframes: ${field}`);
  }
}

function resolveLayer(layers, name, specDirectory) {
  const value = asString(layers, name);
  const path = resolve(specDirectory, value);
  if (!existsSync(path) || !statSync(path).isFile()) fail(`слой ${name} не найден: ${path}`);
  return path;
}

function resolveOutput(spec, specDirectory) {
  const value = asString(spec, "output");
  const path = resolve(specDirectory, value);
  if (extname(path).toLowerCase() !== ".mp4") fail("output должен оканчиваться на .mp4");
  return path;
}

const stillExtensions = new Set([".avif", ".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);

function appendInput(args, path) {
  if (stillExtensions.has(extname(path).toLowerCase())) {
    args.push("-loop", "1", "-framerate", String(FPS), "-i", path);
  } else {
    args.push("-stream_loop", "-1", "-i", path);
  }
}

function cover(input, label, format = "yuv420p") {
  return `[${input}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},setsar=1,format=${format}[${label}]`;
}

function formatSeconds(frames) {
  return (frames / FPS).toFixed(6);
}

function buildHardCut(layers, motion, specDirectory) {
  const cutFrame = asNumber(motion, "cutFrame", {defaultValue: 30, min: 1, max: 59, integer: true});
  const inputs = [resolveLayer(layers, "first", specDirectory), resolveLayer(layers, "second", specDirectory)];
  const secondFrames = FRAMES - cutFrame;
  const filter = [
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},setsar=1,format=yuv420p,trim=end_frame=${cutFrame},setpts=PTS-STARTPTS[a]`,
    `[1:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},setsar=1,format=yuv420p,trim=end_frame=${secondFrames},setpts=PTS-STARTPTS[b]`,
    "[a][b]concat=n=2:v=1:a=0,format=yuv420p[v]",
  ].join(";");
  return {inputs, filter};
}

function buildCrossfade(layers, motion, specDirectory) {
  const fadeFrames = asNumber(motion, "fadeFrames", {defaultValue: 15, min: 1, max: 58, integer: true});
  const defaultStart = Math.floor((FRAMES - fadeFrames) / 2);
  const startFrame = asNumber(motion, "startFrame", {
    defaultValue: defaultStart,
    min: 1,
    max: FRAMES - fadeFrames - 1,
    integer: true,
  });
  const firstFrames = startFrame + fadeFrames;
  const secondFrames = FRAMES - startFrame;
  const inputs = [resolveLayer(layers, "first", specDirectory), resolveLayer(layers, "second", specDirectory)];
  const filter = [
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},setsar=1,format=yuv420p,trim=end_frame=${firstFrames},setpts=PTS-STARTPTS,settb=AVTB[a]`,
    `[1:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},setsar=1,format=yuv420p,trim=end_frame=${secondFrames},setpts=PTS-STARTPTS,settb=AVTB[b]`,
    `[a][b]xfade=transition=fade:duration=${formatSeconds(fadeFrames)}:offset=${formatSeconds(startFrame)},format=yuv420p[v]`,
  ].join(";");
  return {inputs, filter};
}

function buildScaleZoom(layers, motion, specDirectory) {
  const pair = framePair(motion, ["scale"]);
  const zoomStart = pair?.scaleStart ?? asNumber(motion, "zoomStart", {defaultValue: 1, min: 1, max: 4});
  const zoomEnd = pair?.scaleEnd ?? asNumber(motion, "zoomEnd", {defaultValue: 1.12, min: 1, max: 4});
  const anchorX = asNumber(motion, "anchorX", {defaultValue: 0.5, min: 0, max: 1});
  const anchorY = asNumber(motion, "anchorY", {defaultValue: 0.5, min: 0, max: 1});
  const inputs = [resolveLayer(layers, "source", specDirectory)];
  const filter = [
    `[0:v]fps=${FPS},scale=7680:4320:force_original_aspect_ratio=increase,crop=7680:4320`,
    `zoompan=z='${zoomStart}+(${zoomEnd}-${zoomStart})*on/59':x='(iw-iw/zoom)*${anchorX}':y='(ih-ih/zoom)*${anchorY}':d=1:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
    "setsar=1,format=yuv420p[v]",
  ].join(",");
  return {inputs, filter};
}

function buildPositionSlide(layers, motion, specDirectory) {
  const pair = framePair(motion, ["x", "y"]);
  const xStart = pair?.xStart ?? asNumber(motion, "xStart", {defaultValue: -640, min: -3840, max: 3840});
  const xEnd = pair?.xEnd ?? asNumber(motion, "xEnd", {defaultValue: 100, min: -3840, max: 3840});
  const yStart = pair?.yStart ?? asNumber(motion, "yStart", {defaultValue: 220, min: -2160, max: 2160});
  const yEnd = pair?.yEnd ?? asNumber(motion, "yEnd", {defaultValue: yStart, min: -2160, max: 2160});
  const width = asNumber(motion, "width", {defaultValue: 640, min: 2, max: 3840, integer: true});
  const height = asNumber(motion, "height", {defaultValue: 360, min: 2, max: 2160, integer: true});
  const inputs = [resolveLayer(layers, "base", specDirectory), resolveLayer(layers, "foreground", specDirectory)];
  const filter = [
    cover(0, "base"),
    `[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${FPS},setsar=1,format=rgba[foreground]`,
    `[base][foreground]overlay=x='${xStart}+(${xEnd}-${xStart})*n/59':y='${yStart}+(${yEnd}-${yStart})*n/59':eval=frame:shortest=1,format=yuv420p[v]`,
  ].join(";");
  return {inputs, filter};
}

function buildBlur(layers, motion, specDirectory) {
  const sigma = asNumber(motion, "sigma", {defaultValue: 35, min: 0.1, max: 100});
  const mode = asString(motion, "mode", {defaultValue: "background-fill", allowed: ["background-fill", "full-frame"]});
  const inputs = [resolveLayer(layers, "source", specDirectory)];
  if (mode === "full-frame") {
    return {
      inputs,
      filter: `${cover(0, "normalized").slice(0, -12)},gblur=sigma=${sigma},format=yuv420p[v]`,
    };
  }
  const filter = [
    `[0:v]fps=${FPS},split[backgroundSource][foregroundSource]`,
    `[backgroundSource]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},gblur=sigma=${sigma}[background]`,
    `[foregroundSource]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,setsar=1[foreground]`,
    "[background][foreground]overlay=(W-w)/2:(H-h)/2:shortest=1,setsar=1,format=yuv420p[v]",
  ].join(";");
  return {inputs, filter};
}

function buildBlend(layers, motion, specDirectory) {
  const mode = asString(motion, "mode", {
    defaultValue: "screen",
    allowed: ["addition", "difference", "hardlight", "multiply", "overlay", "screen", "softlight"],
  });
  const opacity = asNumber(motion, "opacity", {defaultValue: 0.65, min: 0, max: 1});
  const inputs = [resolveLayer(layers, "base", specDirectory), resolveLayer(layers, "overlay", specDirectory)];
  const filter = [
    cover(0, "base"),
    cover(1, "overlay"),
    `[base][overlay]blend=all_mode=${mode}:all_opacity=${opacity}:shortest=1,format=yuv420p[v]`,
  ].join(";");
  return {inputs, filter};
}

function buildGlow(layers, palette, motion, specDirectory) {
  const colorValue = palette.glow ?? palette.accent ?? "#FF8A3D";
  const [red, green, blue] = rgb(colorValue, "palette.glow");
  const size = asNumber(motion, "size", {defaultValue: 700, min: 32, max: 1600, integer: true});
  const sigma = asNumber(motion, "sigma", {defaultValue: 170, min: 1, max: 600});
  const opacity = asNumber(motion, "opacity", {defaultValue: 0.7, min: 0, max: 1});
  const xStart = asNumber(motion, "xStart", {defaultValue: 100, min: -1600, max: WIDTH});
  const xEnd = asNumber(motion, "xEnd", {defaultValue: 900, min: -1600, max: WIDTH});
  const yStart = asNumber(motion, "yStart", {defaultValue: 520, min: -1600, max: HEIGHT});
  const yEnd = asNumber(motion, "yEnd", {defaultValue: 300, min: -1600, max: HEIGHT});
  const fadeInFrames = asNumber(motion, "fadeInFrames", {defaultValue: 6, min: 0, max: 30, integer: true});
  const fadeOutFrames = asNumber(motion, "fadeOutFrames", {defaultValue: 6, min: 0, max: 30, integer: true});
  const fadeFilters = [];
  if (fadeInFrames > 0) fadeFilters.push(`fade=t=in:start_frame=0:nb_frames=${fadeInFrames}:alpha=1`);
  if (fadeOutFrames > 0) {
    fadeFilters.push(`fade=t=out:start_frame=${FRAMES - fadeOutFrames}:nb_frames=${fadeOutFrames}:alpha=1`);
  }
  const glowTail = fadeFilters.length ? `,${fadeFilters.join(",")}` : "";
  const alpha = `255*${opacity}*exp(-((X-W/2)*(X-W/2)+(Y-H/2)*(Y-H/2))/(2*${sigma}*${sigma}))`;
  const inputs = [resolveLayer(layers, "base", specDirectory)];
  const filter = [
    cover(0, "base"),
    `nullsrc=s=${size}x${size}:r=${FPS},format=rgba,geq=r='${red}':g='${green}':b='${blue}':a='${alpha}'${glowTail}[glow]`,
    `[base][glow]overlay=x='${xStart}+(${xEnd}-${xStart})*n/59':y='${yStart}+(${yEnd}-${yStart})*n/59':eval=frame:shortest=1,format=yuv420p[v]`,
  ].join(";");
  return {inputs, filter};
}

function buildOpacityFade(layers, palette, motion, specDirectory) {
  const fadeInFrames = asNumber(motion, "fadeInFrames", {defaultValue: 9, min: 0, max: 59, integer: true});
  const fadeOutFrames = asNumber(motion, "fadeOutFrames", {defaultValue: 9, min: 0, max: 59, integer: true});
  if (fadeInFrames + fadeOutFrames > FRAMES) fail("fadeInFrames + fadeOutFrames не должны превышать 60");
  const color = ffColor(palette.background ?? "#000000", "palette.background");
  const filters = [`scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`, `crop=${WIDTH}:${HEIGHT}`, `fps=${FPS}`];
  if (fadeInFrames > 0) filters.push(`fade=t=in:start_frame=0:nb_frames=${fadeInFrames}:color=${color}`);
  if (fadeOutFrames > 0) {
    filters.push(`fade=t=out:start_frame=${FRAMES - fadeOutFrames}:nb_frames=${fadeOutFrames}:color=${color}`);
  }
  filters.push("setsar=1", "format=yuv420p[v]");
  return {inputs: [resolveLayer(layers, "source", specDirectory)], filter: `[0:v]${filters.join(",")}`};
}

function buildSaturation(layers, palette, motion, specDirectory) {
  const saturationStart = asNumber(motion, "saturationStart", {defaultValue: 1, min: 0, max: 3});
  const saturationEnd = asNumber(motion, "saturationEnd", {defaultValue: 0, min: 0, max: 3});
  const contrast = asNumber(palette, "contrast", {defaultValue: 1, min: -2, max: 2});
  const brightness = asNumber(palette, "brightness", {defaultValue: 0, min: -1, max: 1});
  const redShift = asNumber(palette, "redShift", {defaultValue: 0, min: -1, max: 1});
  const greenShift = asNumber(palette, "greenShift", {defaultValue: 0, min: -1, max: 1});
  const blueShift = asNumber(palette, "blueShift", {defaultValue: 0, min: -1, max: 1});
  const expression = `${saturationStart}+(${saturationEnd}-${saturationStart})*n/59`;
  const filter = [
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS}`,
    `eq=saturation='${expression}':contrast=${contrast}:brightness=${brightness}:eval=frame`,
    `colorbalance=rs=${redShift}:gs=${greenShift}:bs=${blueShift}`,
    "setsar=1,format=yuv420p[v]",
  ].join(",");
  return {inputs: [resolveLayer(layers, "source", specDirectory)], filter};
}

function buildGrid(layers, palette, motion, specDirectory) {
  const spacingX = asNumber(motion, "spacingX", {defaultValue: 120, min: 4, max: WIDTH, integer: true});
  const spacingY = asNumber(motion, "spacingY", {defaultValue: 120, min: 4, max: HEIGHT, integer: true});
  const thickness = asNumber(motion, "thickness", {defaultValue: 2, min: 1, max: 40, integer: true});
  const offsetX = asNumber(motion, "offsetX", {defaultValue: 0, min: -WIDTH, max: WIDTH, integer: true});
  const offsetY = asNumber(motion, "offsetY", {defaultValue: 0, min: -HEIGHT, max: HEIGHT, integer: true});
  const alpha = asNumber(palette, "lineAlpha", {defaultValue: 0.3, min: 0, max: 1});
  const color = ffColor(palette.line ?? palette.accent ?? "#FFFFFF", "palette.line");
  const filter = `${cover(0, "normalized").slice(0, -12)},drawgrid=x=${offsetX}:y=${offsetY}:width=${spacingX}:height=${spacingY}:thickness=${thickness}:color=${color}@${alpha},format=yuv420p[v]`;
  return {inputs: [resolveLayer(layers, "base", specDirectory)], filter};
}

function buildCamera(layers, motion, specDirectory) {
  const pair = framePair(motion, ["x", "y"]);
  const xStart = pair?.xStart ?? asNumber(motion, "xStart", {defaultValue: 0, min: 0, max: 1});
  const xEnd = pair?.xEnd ?? asNumber(motion, "xEnd", {defaultValue: 1, min: 0, max: 1});
  const yStart = pair?.yStart ?? asNumber(motion, "yStart", {defaultValue: 0.5, min: 0, max: 1});
  const yEnd = pair?.yEnd ?? asNumber(motion, "yEnd", {defaultValue: yStart, min: 0, max: 1});
  const overscan = asNumber(motion, "overscan", {defaultValue: 1.2, min: 1.01, max: 2});
  const scaledWidth = Math.ceil((WIDTH * overscan) / 2) * 2;
  const scaledHeight = Math.ceil((HEIGHT * overscan) / 2) * 2;
  const x = `(iw-ow)*(${xStart}+(${xEnd}-${xStart})*n/59)`;
  const y = `(ih-oh)*(${yStart}+(${yEnd}-${yStart})*n/59)`;
  const filter = `[0:v]scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT}:x='${x}':y='${y}',fps=${FPS},setsar=1,format=yuv420p[v]`;
  return {inputs: [resolveLayer(layers, "source", specDirectory)], filter};
}

function verifyOutput(path) {
  const probe = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames:format=duration",
    "-of", "json",
    path,
  ], {encoding: "utf8", maxBuffer: 1024 * 1024});
  if (probe.error) fail(`не удалось запустить ffprobe: ${probe.error.message}`);
  if (probe.status !== 0) fail(`ffprobe завершился с кодом ${probe.status}: ${probe.stderr.trim()}`);

  let metadata;
  try {
    metadata = JSON.parse(probe.stdout);
  } catch (error) {
    fail(`ffprobe вернул невалидный JSON: ${error.message}`);
  }
  const videoStreams = metadata.streams?.filter((stream) => stream.codec_type === "video") ?? [];
  const audioStreams = metadata.streams?.filter((stream) => stream.codec_type === "audio") ?? [];
  const video = videoStreams[0];
  const errors = [];
  if (videoStreams.length !== 1) errors.push(`video streams=${videoStreams.length}, ожидалось 1`);
  if (audioStreams.length !== 0) errors.push(`audio streams=${audioStreams.length}, ожидалось 0`);
  if (video?.codec_name !== "h264") errors.push(`codec=${video?.codec_name}, ожидалось h264`);
  if (video?.width !== WIDTH || video?.height !== HEIGHT) {
    errors.push(`size=${video?.width}x${video?.height}, ожидалось ${WIDTH}x${HEIGHT}`);
  }
  if (video?.pix_fmt !== "yuv420p") errors.push(`pix_fmt=${video?.pix_fmt}, ожидалось yuv420p`);
  if (video?.avg_frame_rate !== "30/1") errors.push(`fps=${video?.avg_frame_rate}, ожидалось 30/1`);
  if (Number(video?.nb_frames) !== FRAMES) errors.push(`frames=${video?.nb_frames}, ожидалось ${FRAMES}`);
  if (Number(metadata.format?.duration) !== DURATION) {
    errors.push(`duration=${metadata.format?.duration}, ожидалось 2.000000`);
  }

  const bytes = readFileSync(path);
  const moovOffset = bytes.indexOf(Buffer.from("moov"));
  const mdatOffset = bytes.indexOf(Buffer.from("mdat"));
  if (moovOffset < 0 || mdatOffset < 0 || moovOffset >= mdatOffset) {
    errors.push(`faststart отсутствует: moov=${moovOffset}, mdat=${mdatOffset}`);
  }
  if (errors.length) fail(`выход не прошёл проверку: ${errors.join("; ")}`);
}

function buildInset(layers, palette, motion, specDirectory) {
  if (motion.keyframes !== undefined || motion.scale !== undefined || motion.opacityKeyframes !== undefined) {
    routeRemotion("inset-window с opacity/scale keyframes");
  }
  const width = asNumber(motion, "width", {defaultValue: 960, min: 2, max: WIDTH, integer: true});
  const height = asNumber(motion, "height", {defaultValue: 540, min: 2, max: HEIGHT, integer: true});
  const x = asNumber(motion, "x", {defaultValue: Math.round((WIDTH - width) / 2), min: -width, max: WIDTH, integer: true});
  const y = asNumber(motion, "y", {defaultValue: Math.round((HEIGHT - height) / 2), min: -height, max: HEIGHT, integer: true});
  const borderWidth = asNumber(motion, "borderWidth", {defaultValue: 6, min: 0, max: 80, integer: true});
  const opacity = asNumber(motion, "opacity", {defaultValue: 1, min: 0, max: 1});
  const borderColor = ffColor(palette.border ?? palette.accent ?? "#FFFFFF", "palette.border");
  const borderAlpha = asNumber(palette, "borderAlpha", {defaultValue: 0.85, min: 0, max: 1});
  const inputs = [resolveLayer(layers, "base", specDirectory), resolveLayer(layers, "inset", specDirectory)];
  const filters = [cover(0, "base")];
  let baseLabel = "base";
  if (borderWidth > 0) {
    filters.push(`[base]drawbox=x=${x - borderWidth}:y=${y - borderWidth}:w=${width + borderWidth * 2}:h=${height + borderWidth * 2}:color=${borderColor}@${borderAlpha}:t=fill[framed]`);
    baseLabel = "framed";
  }
  filters.push(`[1:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${FPS},setsar=1,format=rgba,colorchannelmixer=aa=${opacity}[inset]`);
  filters.push(`[${baseLabel}][inset]overlay=x=${x}:y=${y}:shortest=1,format=yuv420p[v]`);
  return {inputs, filter: filters.join(";")};
}

function build(spec, specDirectory) {
  const type = asString(spec, "type").toLowerCase();
  if (remotionTypes.has(type)) routeRemotion(`тип ${type}`);
  if (!supportedTypes.has(type)) fail(`неизвестный тип приёма: ${type}`);
  const layers = asObject(spec.layers, "layers");
  const palette = asObject(spec.palette, "palette", false);
  const motion = asObject(spec.motion, "motion", false);
  rejectRemotionFeatures(spec, motion, type);

  switch (type) {
    case "hard-cut": return buildHardCut(layers, motion, specDirectory);
    case "crossfade": return buildCrossfade(layers, motion, specDirectory);
    case "scale-zoom": return buildScaleZoom(layers, motion, specDirectory);
    case "position-slide": return buildPositionSlide(layers, motion, specDirectory);
    case "blur-effect": return buildBlur(layers, motion, specDirectory);
    case "blend-mode": return buildBlend(layers, motion, specDirectory);
    case "light-glow": return buildGlow(layers, palette, motion, specDirectory);
    case "opacity-fade": return buildOpacityFade(layers, palette, motion, specDirectory);
    case "saturation-color": return buildSaturation(layers, palette, motion, specDirectory);
    case "grid-lines": return buildGrid(layers, palette, motion, specDirectory);
    case "camera-motion": return buildCamera(layers, motion, specDirectory);
    case "inset-window": return buildInset(layers, palette, motion, specDirectory);
    default: fail(`неизвестный тип приёма: ${type}`);
  }
}

function main() {
  const argument = process.argv[2];
  if (!argument || argument === "--help" || argument === "-h") {
    if (argument) {
      process.stdout.write(`${usage()}\n`);
      return;
    }
    fail(usage());
  }

  const specPath = resolve(argument);
  if (!existsSync(specPath) || !statSync(specPath).isFile()) fail(`спека не найдена: ${specPath}`);
  const specDirectory = dirname(specPath);
  let spec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    fail(`невалидный JSON: ${error.message}`);
  }
  asObject(spec, "spec");
  const {inputs, filter} = build(spec, specDirectory);
  const outputPath = resolveOutput(spec, specDirectory);
  if (inputs.includes(outputPath)) fail("output не должен совпадать с путём исходного слоя");

  mkdirSync(dirname(outputPath), {recursive: true});
  const temporaryPath = resolve(dirname(outputPath), `.${Date.now()}-${process.pid}-${outputPath.split("/").pop()}`);
  const args = ["-hide_banner", "-loglevel", "error", "-y"];
  for (const input of inputs) appendInput(args, input);
  args.push(
    "-filter_complex", filter,
    "-map", "[v]",
    "-an",
    "-t", "2.000",
    "-frames:v", String(FRAMES),
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-profile:v", "high",
    "-level", "4.1",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    temporaryPath,
  );

  const result = spawnSync("ffmpeg", args, {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  if (result.error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    fail(`не удалось запустить ffmpeg: ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    fail(`ffmpeg завершился с кодом ${result.status}:\n${result.stderr.trim()}`);
  }
  try {
    verifyOutput(temporaryPath);
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
  renameSync(temporaryPath, outputPath);
  process.stdout.write(`OK ${outputPath}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Ошибка: ${error.message}\n`);
  process.exitCode = 1;
}
