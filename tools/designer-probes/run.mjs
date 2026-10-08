#!/usr/bin/env node
// Runs read-only Python probe scripts against a live Designer session and saves the results.
//
// Usage:
//   node tools/designer-probes/run.mjs [probe-name ...] [--director host:port]
//   node tools/designer-probes/run.mjs                 # runs every probes/*.py
//   node tools/designer-probes/run.mjs 03_clip_fields  # runs one probe
//
// Each probe's response is written to tools/designer-probes/results/<name>.json.

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const probesDir = join(here, 'probes');
const resultsDir = join(here, 'results');

const args = process.argv.slice(2);
let director = 'localhost:80';
const names = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--director') director = args[++i];
  else names.push(args[i].replace(/\.py$/, ''));
}

const all = (await readdir(probesDir)).filter(f => f.endsWith('.py')).sort();
// An argument that is a path to an existing .py file is run as-is (ad-hoc experiments).
const adHoc = [];
for (const n of [...names]) {
  try { await readFile(`${n}.py`); adHoc.push(`${n}.py`); names.splice(names.indexOf(n), 1); } catch { /* not a path */ }
}
const selected = [
  ...(names.length || !adHoc.length ? all.filter(f => !names.length || names.includes(basename(f, '.py'))) : []),
  ...adHoc
];
if (!selected.length) {
  console.error(`No probes matched. Available: ${all.map(f => basename(f, '.py')).join(', ')}`);
  process.exit(1);
}

await mkdir(resultsDir, { recursive: true });

for (const file of selected) {
  const name = basename(file, '.py');
  const script = await readFile(adHoc.includes(file) ? file : join(probesDir, file), 'utf8');
  const started = Date.now();
  let out;
  try {
    const res = await fetch(`http://${director}/api/session/python/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script })
    });
    const data = await res.json();
    let value = data.returnValue;
    try { value = JSON.parse(value); } catch { /* keep raw string */ }
    out = {
      probe: name,
      httpStatus: res.status,
      status: data.status,
      roundTripMs: Date.now() - started,
      d3Log: data.d3Log,
      pythonLog: data.pythonLog,
      result: value
    };
  } catch (err) {
    out = { probe: name, error: String(err) };
  }
  await writeFile(join(resultsDir, `${name}.json`), JSON.stringify(out, null, 2));
  const ok = !out.error && out.status && out.status.code === 0;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  (${out.roundTripMs ?? '-'} ms)${ok ? '' : '  ' + (out.error || out.status?.message || '')}`);
}
