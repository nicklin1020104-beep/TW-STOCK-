// 集保戶股權分散表：千張大戶（持股分級 15 = 1,000,001 股以上）持股比例
// 每週由集保開放資料取得全市場最新一週；歷史週次用集保查詢頁逐檔回補
// 用法（回補）：node tdcc.js backfill 3
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cache', 'tdcc');
const LEVEL = '15';
const UA = { 'User-Agent': 'Mozilla/5.0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const n = (s) => parseFloat(String(s).replace(/,/g, ''));

const load = (date) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, `${date}.json`), 'utf8'));
  } catch {
    return {};
  }
};
const save = (date, obj) => {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${date}.json`), JSON.stringify(obj));
};

// 開放資料：最新一週全市場
async function updateLatest() {
  const res = await fetch('https://opendata.tdcc.com.tw/getOD.ashx?id=1-5', { headers: UA });
  const csv = await res.text();
  let date = null;
  const out = {};
  for (const line of csv.split(/\r?\n/)) {
    const [d, code, level, holders, shares, pct] = line.split(',');
    if (level !== LEVEL) continue;
    const c = (code || '').trim();
    if (!/^[1-9]\d{3}$/.test(c)) continue;
    date = d;
    out[c] = [n(holders), n(shares), n(pct)];
  }
  if (!date) throw new Error('集保開放資料格式異常');
  save(date, { ...load(date), ...out });
  return date;
}

// 查詢頁：單一股票、單一週
class Session {
  async init() {
    const res = await fetch('https://www.tdcc.com.tw/portal/zh/smWeb/qryStock', { headers: UA });
    this.cookie = (res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]).map((c) => c.split(';')[0]).join('; ');
    const html = await res.text();
    this.token = html.match(/name="SYNCHRONIZER_TOKEN" value="([^"]+)/)[1];
    this.dates = [...html.matchAll(/<option value="(\d{8})"/g)].map((m) => m[1]);
  }
  async query(code, date) {
    const body = new URLSearchParams({
      SYNCHRONIZER_TOKEN: this.token, SYNCHRONIZER_URI: '/portal/zh/smWeb/qryStock', method: 'submit', firstLoad: 'true',
      sqlMethod: 'StockNo', stockNo: code, stockName: '', scaDate: date, clkStockNo: code, clkStockName: '',
    });
    const res = await fetch('https://www.tdcc.com.tw/portal/zh/smWeb/qryStock', {
      method: 'POST', headers: { ...UA, Cookie: this.cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    const html = await res.text();
    const t = html.match(/name="SYNCHRONIZER_TOKEN" value="([^"]+)/);
    if (t) this.token = t[1];
    for (const m of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const td = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim());
      if (td.length >= 5 && td[0] === LEVEL) return [n(td[2]), n(td[3]), n(td[4])];
    }
    return null; // 無資料（該週未上市等）
  }
}

// 回補最近 weeks 週（不含最新週），只補流動性夠的股票
async function backfill(weeks, codes) {
  const s = new Session();
  await s.init();
  const dates = s.dates.slice(1, 1 + weeks);
  for (const date of dates) {
    const snap = load(date);
    let done = 0;
    for (const code of codes) {
      if (snap[code] !== undefined) continue;
      try {
        snap[code] = await s.query(code, date);
      } catch (e) {
        await sleep(5000);
        await s.init();
        continue;
      }
      if (++done % 50 === 0) {
        save(date, snap);
        process.stdout.write(`\r回補 ${date} ${done}/${codes.length}   `);
      }
      await sleep(400);
    }
    save(date, snap);
    console.log(`\n${date} 完成`);
  }
}

// 千張大戶持股比例連續增加
function analyze(minStreak = 3) {
  if (!fs.existsSync(DIR)) return { dates: [], rows: [] };
  const dates = fs.readdirSync(DIR).filter((f) => /^\d{8}\.json$/.test(f)).map((f) => f.slice(0, 8)).sort();
  const snaps = dates.map(load);
  const latest = snaps[snaps.length - 1] || {};
  const rows = [];
  for (const code of Object.keys(latest)) {
    const series = snaps.map((s) => s[code] || null);
    let streak = 0;
    for (let i = series.length - 1; i > 0; i--) {
      if (series[i] && series[i - 1] && series[i][2] > series[i - 1][2]) streak++;
      else break;
    }
    if (streak < minStreak) continue;
    const first = series[series.length - 1 - streak];
    const last = series[series.length - 1];
    rows.push({ code, streak, pct: last[2], pctChg: last[2] - first[2], holders: last[0], holdersChg: last[0] - first[0], series: series.map((x) => (x ? x[2] : null)) });
  }
  rows.sort((a, b) => b.streak - a.streak || b.pctChg - a.pctChg);
  return { dates, rows };
}

module.exports = { updateLatest, backfill, analyze };

if (require.main === module && process.argv[2] === 'backfill') {
  // 流動性：最近 20 個交易日均量 >= 300 張
  const CACHE = path.join(__dirname, 'cache');
  const files = fs.readdirSync(CACHE).filter((f) => /^\d{8}\.json$/.test(f) && fs.statSync(path.join(CACHE, f)).size > 10).sort().slice(-20);
  const vol = {};
  for (const f of files) for (const [c, q] of Object.entries(JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')))) vol[c] = (vol[c] || 0) + (q.vol || 0) / 1000 / files.length;
  const codes = Object.keys(vol).filter((c) => vol[c] >= 300).sort();
  console.log(`回補 ${codes.length} 檔`);
  updateLatest()
    .then((d) => console.log('最新週', d))
    .then(() => backfill(+process.argv[3] || 3, codes))
    .then(() => console.log('全部完成'))
    .catch((e) => (console.error('失敗：', e.message), process.exit(1)));
}
