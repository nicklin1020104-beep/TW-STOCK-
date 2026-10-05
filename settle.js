// 收盤開獎：13:30 收盤後用證交所即時行情（收盤價）算出大盤與各族群表現，馬上上傳比賽結果
// 排程：交易日 13:35（沒開盤的日子，即時行情日期不是今天，會自動跳過）
// 17:00 的完整報告看到今天已開獎，就不會再重新上傳，避免分數變來變去
const fs = require('fs');
const path = require('path');
const { resultsKey, getRevenue, getShares, getJSON, sleep, ymd, CACHE } = require('./screener.js');
const { buildIndustry } = require('./industry.js');
const THEMES = require('./themes.js');

const VOTE_API = 'https://shoupan-api.shoupan.workers.dev';
const MIN_LOTS_ALL = 3000;
const ROOT = __dirname;
const SETTLED_DIR = path.join(ROOT, 'track');
const num = (s) => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
};

async function mis(chs) {
  const j = await getJSON(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${chs.join('|')}&json=1&delay=0&_=${Date.now()}`);
  return j.msgArray || [];
}

(async () => {
  const now = new Date(Date.now() + 8 * 3600000);
  const today = ymd(now);
  const force = process.argv.includes('--force');
  const marker = path.join(SETTLED_DIR, `settled-${today}.json`);
  if (fs.existsSync(marker) && !force) return console.log('今天已開獎');

  // 大盤：確認今天有開盤而且已收盤
  const [tw] = await mis(['tse_t00.tw']);
  if (!tw || tw.d !== today) return console.log('今天沒有開盤，跳過');
  if (!force && (tw.t || '') < '13:30:00') return console.log('還沒收盤', tw.t);
  const twPct = (num(tw.z) / num(tw.y) - 1) * 100;

  // 歷史行情（快取）＋ 今天的即時收盤
  const hist = fs
    .readdirSync(CACHE)
    .filter((f) => /^\d{8}\.json$/.test(f) && f.slice(0, 8) < today && fs.statSync(path.join(CACHE, f)).size > 10)
    .sort()
    .map((f) => ({ date: f.slice(0, 8), data: JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')) }));
  const prev = hist[hist.length - 1];
  const voteDate = prev.date; // 上一個交易日的投票，看今天的表現
  const codes = Object.keys(prev.data);
  const data = {};
  for (let i = 0; i < codes.length; i += 80) {
    const part = codes.slice(i, i + 80);
    const chs = part.map((c) => `${prev.data[c].mkt === '上櫃' ? 'otc' : 'tse'}_${c}.tw`);
    let rows = [];
    for (let k = 0; k < 3 && !rows.length; k++) {
      try {
        rows = await mis(chs);
      } catch (e) {
        await sleep(3000);
      }
    }
    for (const m of rows) {
      if (m.d !== today) continue;
      data[m.c] = { name: m.n, open: num(m.o), high: num(m.h), low: num(m.l), close: num(m.z), vol: (num(m.v) || 0) * 1000, mkt: prev.data[m.c] ? prev.data[m.c].mkt : '上市' };
    }
    await sleep(600);
  }
  const got = Object.keys(data).length;
  console.log(`即時收盤 ${got}/${codes.length} 檔，加權 ${twPct.toFixed(2)}%`);
  if (got < codes.length * 0.9) throw new Error('即時行情抓不完整');

  // 族群分類調整（和完整報告一樣）
  try {
    const { overrides } = await (await fetch(`${VOTE_API}/api/overrides`)).json();
    for (const o of overrides || []) {
      for (const list of Object.values(THEMES)) {
        const i = list.indexOf(o.code);
        if (i >= 0) list.splice(i, 1);
      }
      (THEMES[o.theme] = THEMES[o.theme] || []).push(o.code);
    }
  } catch {}
  const rev = await getRevenue();
  let shares = {};
  try {
    shares = await getShares();
  } catch {}
  const allDays = [...hist, { date: today, data }];
  const AT = allDays.length - 1;
  const groups = buildIndustry(allDays, rev, AT, {}, MIN_LOTS_ALL, { groups: THEMES, MIN_STOCKS: 2, START_EXCESS: 3, START_MAX_PRIOR5: 5, shares });
  const official = buildIndustry(allDays, rev, AT, {}, MIN_LOTS_ALL, { shares });
  const themes = {};
  for (const r of [...official.rows, ...groups.rows]) themes[r.name] = +r.r1.toFixed(2);
  const top3 = [...groups.rows].sort((a, b) => b.r1 - a.r1).slice(0, 3).map((r) => r.name);

  // Cloudflare 13:35 已經開過獎就不覆蓋（這裡只是備援）
  try {
    const p = await (await fetch(`${VOTE_API}/api/poll?date=${voteDate}`)).json();
    if (p.result) { fs.mkdirSync(SETTLED_DIR, { recursive: true }); fs.writeFileSync(marker, JSON.stringify({ by: 'cloudflare', at: new Date().toISOString() })); return console.log('Cloudflare 已開獎，跳過'); }
  } catch {}
  const key = resultsKey();
  if (!key) throw new Error('沒有比賽金鑰（RESULTS_KEY）');
  const body = { date: voteDate, next: today, tw: +twPct.toFixed(2), themes, top3 };
  const res = await fetch(`${VOTE_API}/api/results`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Results-Key': key }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('上傳失敗 ' + res.status);
  fs.mkdirSync(SETTLED_DIR, { recursive: true });
  fs.writeFileSync(marker, JSON.stringify({ ...body, at: new Date().toISOString() }));
  console.log('收盤開獎完成', voteDate, '→', today, top3.join('、'));
})().catch((e) => {
  console.error('收盤開獎失敗：', e.message);
  process.exit(1);
});
