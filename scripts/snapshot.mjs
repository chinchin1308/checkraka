// Saves the latest month of TPSO material prices for every province into snapshot/,
// so the page can still show prices when the live API cannot be reached.
// Run by .github/workflows/snapshot.yml. Needs Node 20+ (global fetch).
//
//   snapshot/meta.json            { year, month, savedAt, hash, types: [code…] }
//   snapshot/master.json          the /api/master response (provinces + available months)
//   snapshot/prices/<code>.json   { year, month, type, typeName, data: [ …price rows… ] }
//
// Files are rewritten only when the price data itself changes, so a daily run
// that finds nothing new leaves the repository untouched.
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const API = process.env.PRICE_API || 'https://tpso-material-prices.awarekoala2.chatgpt.site';
const OUT = process.env.SNAPSHOT_DIR || 'snapshot';
const KEEP = ['commodityCode', 'commodityNameTH', 'unitName', 'priceCur', 'priceVAT'];
const MAX_FAIL_SHARE = 0.1;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(p, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(API + p, { signal: AbortSignal.timeout(90_000) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
      return j;
    } catch (e) { last = e; await sleep(2000 * (i + 1)); }
  }
  throw new Error(p + ': ' + (last && last.message));
}
const readJSON = async f => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };
const stable = v => JSON.stringify(v);

const master = await get('/api/master');
const periods = (master.data?.dataAvailablePeriods || []).filter(p => p.periodType === 'month');
const types = master.data?.types || [];
if (!periods.length || !types.length) throw new Error('master has no provinces or months');
const latest = periods.reduce((a, b) => (+a.endYear * 12 + +a.endPeriod >= +b.endYear * 12 + +b.endPeriod ? a : b));
const year = +latest.endYear, month = +latest.endPeriod;
console.log(`latest period ${month}/${year}, ${types.length} provinces`);

const results = new Map(), failed = [];
let next = 0;
async function worker() {
  while (next < types.length) {
    const t = types[next++];
    try {
      const r = await get('/api/prices?' + new URLSearchParams({ year, month, type: t.code }));
      if (!Array.isArray(r.data)) throw new Error('no data array');
      const data = r.data.map(row => Object.fromEntries(KEEP.map(k => [k, row[k] ?? null])));
      results.set(String(t.code), { year, month, type: String(t.code), typeName: t.name, data });
      console.log(`  ${t.code} ${t.name}: ${data.length}`);
    } catch (e) { failed.push(t.code); console.log(`  ${t.code} ${t.name}: FAILED ${e.message}`); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

const oldMeta = await readJSON(path.join(OUT, 'meta.json'));
const sameMonth = oldMeta && +oldMeta.year === year && +oldMeta.month === month;
if (failed.length > types.length * MAX_FAIL_SHARE && !sameMonth) {
  console.error(`${failed.length} provinces failed; keeping the previous snapshot`);
  process.exit(1);
}
// on a partial run for the month already saved, keep the files we already have
if (sameMonth) for (const code of failed) {
  const prev = await readJSON(path.join(OUT, 'prices', code + '.json'));
  if (prev && +prev.year === year && +prev.month === month) results.set(code, prev);
}

const codes = [...results.keys()].sort();
const hash = createHash('sha256').update(stable([year, month, codes.map(c => [c, results.get(c).data])])).digest('hex').slice(0, 16);
if (oldMeta && oldMeta.hash === hash) { console.log('no change'); process.exit(0); }

await mkdir(path.join(OUT, 'prices'), { recursive: true });
for (const f of await readdir(path.join(OUT, 'prices'))) if (!results.has(f.replace(/\.json$/, ''))) await rm(path.join(OUT, 'prices', f));
for (const c of codes) await writeFile(path.join(OUT, 'prices', c + '.json'), stable(results.get(c)));
await writeFile(path.join(OUT, 'master.json'), stable({ data: master.data }));
await writeFile(path.join(OUT, 'meta.json'), JSON.stringify({ year, month, savedAt: new Date().toISOString(), hash, types: codes }, null, 1));
console.log(`saved ${codes.length} provinces for ${month}/${year}` + (failed.length ? `; ${failed.length} failed` : ''));
