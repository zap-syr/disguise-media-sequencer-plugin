#!/usr/bin/env node
// Cross-checks probe 10_media_details against the media files on disk (MOV/MP4 atoms, PNG/JPEG
// headers). No ffprobe needed.
//
// Usage: node tools/designer-probes/verify_media.mjs "<project folder>" [pathFilter]
//   e.g. node tools/designer-probes/verify_media.mjs "D:/d3 projects/api_test" footages
// Run `node tools/designer-probes/run.mjs 10_media_details` first.

import { openSync, readSync, fstatSync, closeSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [projectDir, filter = ''] = process.argv.slice(2);
const probe = JSON.parse(readFileSync(join(here, 'results', '10_media_details.json'), 'utf8')).result;

function read(fd, pos, len) { const b = Buffer.alloc(len); readSync(fd, b, 0, len, pos); return b; }

function mov(fd) {
  const size = fstatSync(fd).size;
  const tracks = [];
  const CONT = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);
  (function walk(start, end, ctx) {
    let pos = start;
    while (pos + 8 <= end) {
      const h = read(fd, pos, 16);
      let len = h.readUInt32BE(0); const type = h.toString('latin1', 4, 8); let hdr = 8;
      if (len === 1) { len = Number(h.readBigUInt64BE(8)); hdr = 16; }
      if (len === 0) len = end - pos;
      if (len < 8) break;
      if (type === 'trak') { const t = {}; tracks.push(t); walk(pos + hdr, pos + len, t); }
      else if (CONT.has(type)) walk(pos + hdr, pos + len, ctx);
      else if (ctx && type === 'hdlr' && !ctx.handler) ctx.handler = read(fd, pos + hdr + 8, 4).toString('latin1');
      else if (ctx && type === 'mdhd') {
        const b = read(fd, pos + hdr, 32);
        if (b[0] === 1) { ctx.timescale = b.readUInt32BE(20); ctx.duration = Number(b.readBigUInt64BE(24)); }
        else { ctx.timescale = b.readUInt32BE(12); ctx.duration = b.readUInt32BE(16); }
      }
      else if (ctx && type === 'stsz') { const b = read(fd, pos + hdr, 12); ctx.samples = b.readUInt32BE(8); }
      else if (ctx && type === 'stsd') {
        const e = read(fd, pos + hdr + 8, 100);
        ctx.fourcc = e.toString('latin1', 4, 8);
        if (ctx.handler === 'vide') {
          ctx.width = e.readUInt16BE(32); ctx.height = e.readUInt16BE(34);
          ctx.compressor = e.toString('latin1', 51, 51 + Math.min(e[50], 31)).trim();
          ctx.depth = e.readUInt16BE(82);
        } else if (ctx.handler === 'soun') { ctx.channels = e.readUInt16BE(24); }
      }
      pos += len;
    }
  })(0, size, null);
  const v = tracks.find(t => t.handler === 'vide');
  const a = tracks.filter(t => t.handler === 'soun');
  return {
    res: v ? `${v.width}x${v.height}` : null,
    nFrames: v ? v.samples : null,
    duration: v && v.timescale ? v.duration / v.timescale : null,
    codec: v ? `${v.fourcc}/${v.compressor}` : null,
    hasAlpha: v ? v.depth === 32 : null,
    hasAudio: a.length > 0,
    audioChannels: a.reduce((s, t) => s + (t.channels || 0), 0),
  };
}

function png(fd) {
  const b = read(fd, 0, 33);
  return { res: `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`, hasAlpha: [4, 6].includes(b[25]) ? true : null, hasAudio: false };
}

const rows = Object.entries(probe).filter(([p]) => p.toLowerCase().includes(filter.toLowerCase()));
let ok = 0; const bad = [];
for (const [clip, d] of rows) {
  if (!d.source) { bad.push([clip, 'no source path']); continue; }
  const file = join(projectDir, d.source);
  if (!existsSync(file)) { bad.push([clip, `missing on disk: ${file}`]); continue; }
  const fd = openSync(file, 'r');
  const ext = file.toLowerCase().split('.').pop();
  let t;
  try { t = ['mov', 'mp4', 'm4v'].includes(ext) ? mov(fd) : ext === 'png' ? png(fd) : null; }
  finally { closeSync(fd); }
  if (!t) { bad.push([clip, `not verifiable (.${ext})`]); continue; }
  const diffs = [];
  if (t.res && t.res !== d.res) diffs.push(`res ${d.res} vs file ${t.res}`);
  if (t.nFrames != null && d.kind === 'video' && t.nFrames !== d.nFrames) diffs.push(`nFrames ${d.nFrames} vs file ${t.nFrames}`);
  if (t.duration != null && d.duration != null && Math.abs(t.duration - d.duration) > 0.05) diffs.push(`duration ${d.duration.toFixed(3)} vs file ${t.duration.toFixed(3)}`);
  if (t.hasAlpha != null && t.hasAlpha !== d.hasAlpha) diffs.push(`alpha ${d.hasAlpha} vs file ${t.hasAlpha}`);
  if (t.hasAudio !== d.hasAudio) diffs.push(`audio ${d.hasAudio} vs file ${t.hasAudio} (${t.audioChannels}ch)`);
  if (diffs.length) bad.push([clip, diffs.join('; ') + `  [${t.codec ?? ext}]`]); else ok++;
}
console.log(`checked ${rows.length} clips: ${ok} match, ${bad.length} differ/unverifiable`);
for (const [c, why] of bad) console.log(' ', c, '->', why);
