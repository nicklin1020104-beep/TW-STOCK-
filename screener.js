// 台股每日選股：一根K棒站上 5/10/20 日均線
// 條件：
//   1. MA5、MA10、MA20 皆上彎（今日均線值 > 昨日均線值）
//   2. 今日一根K棒站上三線：開盤 <= 三線最低、收盤 > 三線最高
//   3. 成交量 > 5000 張
//   4. 最新月營收 YoY > +50%
//   5. 依收盤是否站上季線（MA60）分兩組
// 用法：node screener.js [YYYYMMDD]   （不帶日期 = 最近交易日）

const fs = require('fs');
const path = require('path');
const { buildUS } = require('./us.js');
const { buildMacro, getUSIndexes, getTopBar } = require('./macro.js');
const tdcc = require('./tdcc.js');
const ir = require('./ir.js');
const { buildIndustry } = require('./industry.js');
const THEMES = require('./themes.js');
const { buildRoast } = require('./roast.js');
const { buildLocked } = require('./chips.js');
const { getEstimates } = require('./estimates.js');
const { findCups, CUP_PARAMS } = require('./cup.js');
const activeEtf = require('./activeetf.js');
const { renderGate, GATE_CSS, shareScript, pushScript } = require('./landing.js');
const VOTE_API = 'https://shoupan-api.shoupan.workers.dev';
// 比賽金鑰：雲端（GitHub Actions）從加密設定讀，本機從 worker/.results-key 讀
const resultsKey = () => {
  if (process.env.RESULTS_KEY) return process.env.RESULTS_KEY.trim();
  const f = path.join(__dirname, 'worker', '.results-key');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : null;
};

const MA_SHORT = [5, 10, 20];
const MA_SEASON = 60;
const MIN_VOLUME_LOTS = 5000;
const MIN_YOY = 0; // 營收 YoY 須為正
const DAYS_NEEDED = MA_SEASON + 16; // 多抓 15 天，讓回補的歷史訊號也算得出季線
// 千金股產業龍頭重挫
const BIG_PRICE = 1000; // 股價門檻
const LEADER_RANK = 3; // 產業內市值前 N 名算龍頭
const CRASH_PCT = -5; // 當日跌幅 <= 此值算重挫
const NEWS_PER_TOPIC = 8;
// 回測最佳組合（backtest/run.js，2026/3~9 月）
const BEST_BREADTH = 0.5; // 大盤強：收盤站上月線的個股比例
const BEST_MIN_LOTS = 5000;
const MIN_LOTS_ALL = 3000;
const SURGE_RATIO = 2; // 爆量：當日量 >= 前 20 日均量的倍數（且收紅）
const THREE_FILE = path.join(__dirname, 'track', 'three.json'); // 所有台股頁面（千金龍頭除外）：當日成交量至少張數
// 潛伏股：營收加速成長、股價還沒起漲
const LT_MIN_YOY = 30; // 最新月營收 YoY 至少（且連 3 個月往上）
const LT_MAX_FROM_LOW = 25; // 距 60 日最低收盤不超過 %
const LT_MAX_RUN20 = 10; // 近 20 日漲幅不超過 %
const LT_MAX_MA_SPREAD = 8; // 5/10/20 日均線糾結：最高與最低差距不超過 %
const LT_MIN_AVG_LOTS = 200; // 流動性：20 日均量至少張數

const ROOT = __dirname;
const CACHE = path.join(ROOT, 'cache');
const REPORTS = path.join(ROOT, 'reports');
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(REPORTS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (s) => {
  const v = parseFloat(String(s).replace(/,/g, '').trim());
  return Number.isFinite(v) ? v : null;
};
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const isStock = (code) => /^[1-9]\d{3}$/.test(code);

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(5000);
    }
  }
}

// 回傳 { code: { name, open, close, vol } }；非交易日回傳 null
async function fetchTwse(date) {
  const d = await getJSON(
    `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${date}&type=ALLBUT0999&response=json`
  );
  if (d.stat !== 'OK' || !d.tables) return null;
  const t = d.tables.find((t) => t.fields && t.fields.includes('證券代號') && t.fields.includes('收盤價'));
  if (!t || !t.data.length) return null;
  const f = (n) => t.fields.indexOf(n);
  const out = {};
  for (const r of t.data) {
    const code = r[f('證券代號')].trim();
    if (!isStock(code)) continue;
    out[code] = {
      name: r[f('證券名稱')].trim(),
      open: num(r[f('開盤價')]),
      high: num(r[f('最高價')]),
      low: num(r[f('最低價')]),
      close: num(r[f('收盤價')]),
      vol: num(r[f('成交股數')]),
      mkt: '上市',
    };
  }
  return out;
}

async function fetchTpex(date) {
  const q = `${date.slice(0, 4)}%2F${date.slice(4, 6)}%2F${date.slice(6)}`;
  const d = await getJSON(`https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes?date=${q}&id=&response=json`);
  if (!d.tables || !d.tables[0] || !d.tables[0].data.length) return null;
  const t = d.tables[0];
  const f = (n) => t.fields.indexOf(n);
  const out = {};
  for (const r of t.data) {
    const code = r[f('代號')].trim();
    if (!isStock(code)) continue;
    out[code] = {
      name: r[f('名稱')].trim(),
      open: num(r[f('開盤')]),
      high: num(r[f('最高')]),
      low: num(r[f('最低')]),
      close: num(r[f('收盤')]),
      vol: num(r[f('成交股數')]),
      mkt: '上櫃',
    };
  }
  return out;
}

// 取得某日全市場行情（含快取）。過去日期的休市日也快取，避免重抓。
async function getDay(date, today) {
  const file = path.join(CACHE, `${date}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const twse = await fetchTwse(date);
  await sleep(2500);
  const tpex = twse ? await fetchTpex(date) : null;
  if (twse) await sleep(1500);
  const data = twse ? { ...twse, ...(tpex || {}) } : null;
  // 當日資料若上櫃還沒出來，先不快取，下次再抓
  if (data && tpex) fs.writeFileSync(file, JSON.stringify(data));
  else if (!data && date !== today) fs.writeFileSync(file, 'null');
  return data;
}

// 三大法人買賣超（股數）：{ code: { foreign, trust, dealer, total } }
async function getInsti(date) {
  const dir = path.join(CACHE, 'insti');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${date}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = {};

  const tw = await getJSON(`https://www.twse.com.tw/rwd/zh/fund/T86?date=${date}&selectType=ALLBUT0999&response=json`);
  if (tw.stat === 'OK' && tw.data) {
    const f = (n) => tw.fields.indexOf(n);
    for (const r of tw.data) {
      const code = r[f('證券代號')].trim();
      if (!isStock(code)) continue;
      out[code] = {
        foreign: num(r[f('外陸資買賣超股數(不含外資自營商)')]) + num(r[f('外資自營商買賣超股數')]),
        trust: num(r[f('投信買賣超股數')]),
        dealer: num(r[f('自營商買賣超股數')]),
        total: num(r[f('三大法人買賣超股數')]),
      };
    }
  }
  await sleep(2500);

  const q = `${date.slice(0, 4)}%2F${date.slice(4, 6)}%2F${date.slice(6)}`;
  const tp = await getJSON(`https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?type=Daily&sect=AL&date=${q}&id=&response=json`);
  const t = tp.tables && tp.tables[0];
  if (t && t.data.length) {
    // 欄位：代號,名稱,外資(不含自營)x3,外資自營x3,外資合計x3,投信x3,自營自行x3,自營避險x3,自營合計x3,三大法人合計
    for (const r of t.data) {
      const code = r[0].trim();
      if (!isStock(code)) continue;
      out[code] = { foreign: num(r[10]), trust: num(r[13]), dealer: num(r[22]), total: num(r[23]) };
    }
  }

  const ok = Object.keys(out).length > 0 && t && t.data.length;
  if (ok) fs.writeFileSync(file, JSON.stringify(out));
  return out;
}

const INSTI_KINDS = [
  ['total', '三大法人合計'],
  ['foreign', '外資'],
  ['trust', '投信'],
  ['dealer', '自營商'],
];
const INSTI_TOP = 20;

// 依買賣超金額（股數 × 收盤價）排行
function rankInsti(insti, today, prev) {
  const rows = [];
  for (const code of Object.keys(insti)) {
    const q = today[code];
    if (!q || q.close == null || q.vol / 1000 < MIN_LOTS_ALL) continue;
    const pc = prev[code] && prev[code].close;
    const r = { code, name: q.name, mkt: q.mkt, close: q.close, chg: pc ? (q.close / pc - 1) * 100 : null };
    for (const [k] of INSTI_KINDS) {
      r[k + 'Lots'] = Math.round((insti[code][k] || 0) / 1000);
      r[k + 'Amt'] = ((insti[code][k] || 0) * q.close) / 1e8; // 億元
    }
    rows.push(r);
  }
  const out = {};
  for (const [k] of INSTI_KINDS) {
    const s = [...rows].sort((a, b) => b[k + 'Amt'] - a[k + 'Amt']);
    out[k] = {
      buy: s.filter((r) => r[k + 'Amt'] > 0).slice(0, INSTI_TOP),
      sell: s.filter((r) => r[k + 'Amt'] < 0).reverse().slice(0, INSTI_TOP),
    };
  }
  return out;
}

// 發行股數：{ code: shares }
async function getShares() {
  const [l, o] = await Promise.all([
    getJSON('https://openapi.twse.com.tw/v1/opendata/t187ap03_L'),
    getJSON('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O'),
  ]);
  const out = {};
  for (const r of l) out[r['公司代號'].trim()] = num(r['已發行普通股數或TDR原股發行股數']);
  for (const r of o) out[r['SecuritiesCompanyCode'].trim()] = num(r['IssueShares']);
  return out;
}

const decodeXml = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

// Google 新聞 RSS（近一天）
async function getNews(query) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:1d')}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
      const tag = (t) => {
        const m = it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`));
        return m ? decodeXml(m[1]).trim() : '';
      };
      const source = tag('source');
      let title = tag('title');
      if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
      return { title, link: tag('link'), source, time: new Date(tag('pubDate')) };
    });
    items.sort((a, b) => b.time - a.time);
    const seen = new Set();
    return items.filter((n) => !seen.has(n.title) && seen.add(n.title)).slice(0, NEWS_PER_TOPIC);
  } catch {
    return [];
  }
}

// 公開資訊觀測站某月營收彙總（big5 HTML）：{ code: { rev, mom, yoy, cumYoy } }
async function getRevenueMonth(rocYM, market) {
  const dir = path.join(CACHE, 'revenue');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${rocYM}_${market}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = `https://mopsov.twse.com.tw/nas/t21/${market}/t21sc03_${+rocYM.slice(0, 3)}_${+rocYM.slice(3)}_0.html`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = new TextDecoder('big5').decode(await res.arrayBuffer());
  const out = {};
  for (const tr of html.split(/<tr/i)) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim());
    if (cells.length >= 10 && /^\d{4}$/.test(cells[0])) {
      out[cells[0]] = { rev: num(cells[2]), mom: num(cells[5]), yoy: num(cells[6]), cumYoy: num(cells[9]) };
    }
  }
  if (Object.keys(out).length < 100) throw new Error(`營收資料異常 ${url}`);
  fs.writeFileSync(file, JSON.stringify(out));
  return out;
}

// 民國年月往前推 n 個月，例 '11508' -1 -> '11507'
const prevYM = (ym, n = 1) => {
  let y = +ym.slice(0, 3), m = +ym.slice(3) - n;
  while (m <= 0) (m += 12), y--;
  return `${y}${String(m).padStart(2, '0')}`;
};

// 補上前 1、2 個月的 YoY（yoyPrev、yoyPrev2）
async function addRevenueTrend(rev) {
  const months = {};
  for (const r of Object.values(rev)) if (r.month) months[r.month] = true;
  const hist = {};
  for (const ym of Object.keys(months)) {
    for (const k of [1, 2]) {
      const p = prevYM(ym, k);
      if (hist[p]) continue;
      hist[p] = {};
      for (const mk of ['sii', 'otc']) {
        try {
          Object.assign(hist[p], await getRevenueMonth(p, mk));
        } catch (e) {
          console.error('歷史營收下載失敗', p, mk, e.message);
        }
      }
    }
  }
  for (const [code, r] of Object.entries(rev)) {
    if (!r.month) continue;
    const p1 = hist[prevYM(r.month, 1)][code];
    const p2 = hist[prevYM(r.month, 2)][code];
    r.yoyPrev = p1 ? p1.yoy : null;
    r.yoyPrev2 = p2 ? p2.yoy : null;
  }
  return rev;
}

// ---------- 三率三升（毛利率、營益率、淨利率皆較上一季提升，單季比較） ----------
// 公開資訊觀測站綜合損益表彙總（累計數）：{ code: { rev, gp, op, ni } }
async function getIncomeCum(rocYear, season, market) {
  const dir = path.join(CACHE, 'fin');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${rocYear}Q${season}_${market}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = await fetch('https://mopsov.twse.com.tw/mops/web/ajax_t163sb04', {
    method: 'POST',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `encodeURIComponent=1&step=1&firstin=1&off=1&isQuery=Y&TYPEK=${market}&year=${rocYear}&season=0${season}`,
  });
  const html = await res.text();
  const out = {};
  for (const t of html.split(/<table/i).slice(1)) {
    const ths = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    const col = (re) => ths.findIndex((h) => re.test(h));
    const iRev = col(/^營業收入$/), iGp = col(/^營業毛利（毛損）淨額$/), iOp = col(/^營業利益（損失）$/), iNi = col(/^本期淨利（淨損）$/);
    if ([iRev, iGp, iOp, iNi].some((i) => i < 0)) continue; // 金融保險業沒有毛利，略過
    for (const tr of t.split(/<tr/i)) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
      if (cells.length === ths.length && /^\d{4}$/.test(cells[0])) {
        out[cells[0]] = { rev: num(cells[iRev]), gp: num(cells[iGp]), op: num(cells[iOp]), ni: num(cells[iNi]) };
      }
    }
  }
  if (Object.keys(out).length < 100) throw new Error(`財報資料異常 ${rocYear}Q${season} ${market}`);
  fs.writeFileSync(file, JSON.stringify(out));
  await sleep(2000);
  return out;
}

// 單季 = 本季累計 - 上季累計（Q1 本身就是單季）
async function getIncomeQuarter(rocYear, season) {
  const cum = {};
  for (const mk of ['sii', 'otc']) Object.assign(cum, await getIncomeCum(rocYear, season, mk));
  if (season === 1) return cum;
  const prev = {};
  for (const mk of ['sii', 'otc']) Object.assign(prev, await getIncomeCum(rocYear, season - 1, mk));
  const out = {};
  for (const [c, v] of Object.entries(cum)) {
    const p = prev[c];
    if (p) out[c] = { rev: v.rev - p.rev, gp: v.gp - p.gp, op: v.op - p.op, ni: v.ni - p.ni };
  }
  return out;
}

// 依日期推算已公布的最新一季（Q1 5/15、Q2 8/14、Q3 11/14、年報 3/31 截止）
function latestSeason(date) {
  const y = +date.slice(0, 4) - 1911, md = date.slice(4);
  if (md > '1114') return [y, 3];
  if (md > '0814') return [y, 2];
  if (md > '0515') return [y, 1];
  if (md > '0331') return [y - 1, 4];
  return [y - 1, 3];
}

async function getThreeRates(date) {
  const [y, q] = latestSeason(date);
  const [py, pq] = q === 1 ? [y - 1, 4] : [y, q - 1];
  const cur = await getIncomeQuarter(y, q);
  const prev = await getIncomeQuarter(py, pq);
  const rates = (v) => (v && v.rev > 0 ? { gm: (v.gp / v.rev) * 100, om: (v.op / v.rev) * 100, nm: (v.ni / v.rev) * 100 } : null);
  const out = {};
  for (const c of Object.keys(cur)) {
    const a = rates(cur[c]), b = rates(prev[c]);
    if (!a || !b || [a, b].some((x) => Math.abs(x.gm) > 100)) continue; // 營收極小的季度算出的比率無意義
    out[c] = { cur: a, prev: b, up: a.gm > b.gm && a.om > b.om && a.nm > b.nm, label: `${y}Q${q} vs ${py}Q${pq}` };
  }
  return out;
}

// YoY 比上個月低 = 成長放緩（往下）
const yoyDown = (r) => r.yoyPrev != null && r.yoy < r.yoyPrev;

async function getRevenue() {
  const [l, o] = await Promise.all([
    getJSON('https://openapi.twse.com.tw/v1/opendata/t187ap05_L'),
    getJSON('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O'),
  ]);
  const out = {};
  for (const r of [...l, ...o]) {
    out[r['公司代號'].trim()] = {
      yoy: num(r['營業收入-去年同月增減(%)']),
      mom: num(r['營業收入-上月比較增減(%)']),
      amt: num(r['營業收入-當月營收']), // 千元
      cumYoy: num(r['累計營業收入-前期比較增減(%)']),
      month: r['資料年月'],
      industry: r['產業別'],
    };
  }
  return out;
}

// 基本面：EPS、營益率、毛利率（僅上市）、本益比、淨值比
async function getFundamentals(date, fallbackDate) {
  const q = `${date.slice(0, 4)}%2F${date.slice(4, 6)}%2F${date.slice(6)}`;
  let [epsL, epsO, marL, peL, peO] = await Promise.all([
    getJSON('https://openapi.twse.com.tw/v1/opendata/t187ap14_L'),
    getJSON('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap14_O'),
    getJSON('https://openapi.twse.com.tw/v1/opendata/t187ap17_L'),
    getJSON(`https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=${date}&selectType=ALL&response=json`),
    getJSON(`https://www.tpex.org.tw/www/zh-tw/afterTrading/peQryDate?date=${q}&response=json`),
  ].map((p) => p.catch(() => null)));
  // 當天本益比通常收盤後幾小時才公布，還沒出來就用前一個交易日的
  if (fallbackDate && !(peL && peL.data && peL.data.length)) peL = await getJSON(`https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?date=${fallbackDate}&selectType=ALL&response=json`).catch(() => null);
  if (fallbackDate && !(peO && peO.tables && peO.tables[0] && peO.tables[0].data.length)) peO = await getJSON(`https://www.tpex.org.tw/www/zh-tw/afterTrading/peQryDate?date=${fallbackDate.slice(0, 4)}%2F${fallbackDate.slice(4, 6)}%2F${fallbackDate.slice(6)}&response=json`).catch(() => null);
  const out = {};
  const get = (c) => (out[c] = out[c] || {});
  const opm = (r, rev, op) => (num(r[rev]) ? (num(r[op]) / num(r[rev])) * 100 : null);
  for (const r of epsL || []) {
    const o = get(r['公司代號'].trim());
    o.eps = num(r['基本每股盈餘(元)']);
    o.period = `${r['年度']}Q${r['季別']}`;
    o.opm = opm(r, '營業收入', '營業利益');
  }
  for (const r of epsO || []) {
    const o = get(r['SecuritiesCompanyCode'].trim());
    o.eps = num(r['基本每股盈餘']);
    o.period = `${r['Year']}Q${r['季別']}`;
    o.opm = opm(r, '營業收入', '營業利益');
  }
  for (const r of marL || []) get(r['公司代號'].trim()).gm = num(r['毛利率(%)(營業毛利)/(營業收入)']);
  if (peL && peL.data) {
    const f = (n) => peL.fields.indexOf(n);
    for (const r of peL.data) {
      const pe = num(r[f('本益比')]), close = num(r[f('收盤價')]);
      Object.assign(get(r[f('證券代號')].trim()), { pe, pb: num(r[f('股價淨值比')]), e4: pe > 0 && close ? close / pe : null });
    }
  }
  const t = peO && peO.tables && peO.tables[0];
  if (t) {
    const f = (n) => t.fields.indexOf(n);
    for (const r of t.data) Object.assign(get(r[f('股票代號')].trim()), { pe: num(r[f('本益比')]), pb: num(r[f('股價淨值比')]) });
  }
  return out;
}

const ma = (arr, n, end) => {
  if (end - n + 1 < 0) return null;
  let s = 0;
  for (let i = end - n + 1; i <= end; i++) {
    if (arr[i] == null) return null;
    s += arr[i];
  }
  return s / n;
};

// KD(9,3,3) 與 MACD(12,26,9)，回傳第 T 天與前一天的值
function indicators(days, code, T) {
  const bars = days.slice(0, T + 1).map((d) => d.data[code] || null);
  // KD：從有最高、最低價的第一天開始算，K、D 起始 50
  let k = 50, d = 50, kPrev = null, dPrev = null, started = false;
  for (let i = 0; i <= T; i++) {
    const b = bars[i];
    if (!b || b.high == null || b.low == null || b.close == null) {
      if (started) return null; // 中間缺資料就不算
      continue;
    }
    const win = bars.slice(Math.max(0, i - 8), i + 1).filter((x) => x && x.high != null);
    const hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
    const rsv = hi === lo ? 50 : ((b.close - lo) / (hi - lo)) * 100;
    kPrev = k, dPrev = d;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
    started = true;
  }
  if (!started) return null;
  // MACD：收盤價 EMA
  const closes = bars.map((b) => (b ? b.close : null));
  if (closes.slice(-40).some((v) => v == null)) return null;
  const ema = (arr, n) => {
    const a = 2 / (n + 1);
    const out = [];
    let e = null;
    for (const v of arr) out.push((e = e == null ? v : e + a * (v - e)));
    return out;
  };
  const c = closes.filter((v) => v != null);
  const e12 = ema(c, 12), e26 = ema(c, 26);
  const dif = e12.map((v, i) => v - e26[i]);
  const sig = ema(dif, 9);
  const osc = dif.map((v, i) => v - sig[i]);
  const n = osc.length - 1;
  return { k, d, kPrev, dPrev, dif: dif[n], osc: osc[n], oscPrev: osc[n - 1] };
}

// 某交易日 T 所有「一根K棒站上三線」且營收 YoY 為正的個股
// 潛伏股：營收 YoY 連 3 個月加速，但股價仍在低檔、均線糾結、還沒發動
function findLatent(days, T, rev, fund) {
  const rows = [];
  const today = days[T].data;
  for (const code of Object.keys(today)) {
    const q = today[code];
    if (q.close == null || q.vol == null) continue;
    const r = rev[code];
    if (!r || r.yoy == null || r.yoyPrev == null || r.yoyPrev2 == null) continue;
    if (!(r.yoy >= LT_MIN_YOY && r.yoy > r.yoyPrev && r.yoyPrev > r.yoyPrev2)) continue;

    const closes = days.map((d) => (d.data[code] ? d.data[code].close : null));
    const vols = days.map((d) => (d.data[code] ? d.data[code].vol : null));
    const vavg = ma(vols, 20, T);
    if (!vavg || vavg / 1000 < LT_MIN_AVG_LOTS || q.vol / 1000 < MIN_LOTS_ALL) continue;

    const past = closes.slice(Math.max(0, T - MA_SEASON), T + 1).filter((v) => v != null);
    const fromLow = (q.close / Math.min(...past) - 1) * 100;
    if (fromLow > LT_MAX_FROM_LOW) continue;
    const c20 = closes[T - 20];
    const run20 = c20 ? (q.close / c20 - 1) * 100 : null;
    if (run20 == null || run20 > LT_MAX_RUN20) continue;

    const m = MA_SHORT.map((n) => ma(closes, n, T));
    if (m.some((v) => v == null)) continue;
    const spread = (Math.max(...m) / Math.min(...m) - 1) * 100;
    if (spread > LT_MAX_MA_SPREAD) continue;

    const ma60 = ma(closes, MA_SEASON, T);
    const pc = closes[T - 1];
    rows.push({
      code,
      name: q.name,
      mkt: q.mkt,
      industry: r.industry,
      close: q.close,
      chg: pc ? (q.close / pc - 1) * 100 : null,
      lots: Math.round(q.vol / 1000),
      avgLots: Math.round(vavg / 1000),
      volNow: q.vol / vavg,
      fromLow,
      run20,
      spread,
      aboveMa: q.close > Math.max(...m),
      ma60,
      yoy: r.yoy,
      yoyPrev: r.yoyPrev,
      yoyPrev2: r.yoyPrev2,
      mom: r.mom,
      cumYoy: r.cumYoy,
      ...(fund[code] || {}),
    });
  }
  // 三率三升優先，其次營收加速幅度
  return rows.sort((a, b) => (b.threeUp ? 1 : 0) - (a.threeUp ? 1 : 0) || b.yoy - b.yoyPrev2 - (a.yoy - a.yoyPrev2));
}

function findCrosses(days, T, rev, fund) {
  const rows = [];
  const today = days[T].data;
  for (const code of Object.keys(today)) {
    const q = today[code];
    if (q.close == null || q.open == null || q.vol == null) continue;
    const r = rev[code];
    if (!r || r.yoy == null || r.yoy <= MIN_YOY || yoyDown(r)) continue;
    const closes = days.map((d) => (d.data[code] ? d.data[code].close : null));
    const now_ = MA_SHORT.map((n) => ma(closes, n, T));
    const prev = MA_SHORT.map((n) => ma(closes, n, T - 1));
    if (now_.some((v) => v == null) || prev.some((v) => v == null)) continue;

    // 一根K棒站上三線：開盤 <= 三線最低、收盤 > 三線最高
    if (!(q.open <= Math.min(...now_) && q.close > Math.max(...now_))) continue;

    const lots = q.vol / 1000;
    if (lots < MIN_LOTS_ALL) continue;
    const ma60 = ma(closes, MA_SEASON, T);
    const prevClose = closes[T - 1];
    const row = {
      code,
      name: q.name,
      mkt: q.mkt,
      industry: r.industry,
      open: q.open,
      close: q.close,
      chg: prevClose ? ((q.close / prevClose - 1) * 100) : null,
      lots: Math.round(lots),
      ma5: now_[0],
      ma10: now_[1],
      ma20: now_[2],
      ma60,
      gap60: ma60 ? (q.close / ma60 - 1) * 100 : null,
      yoy: r.yoy,
      mom: r.mom,
      cumYoy: r.cumYoy,
      ...(fund[code] || {}),
      revMonth: r.month,
      yoyPrev: r.yoyPrev,
      yoyPrev2: r.yoyPrev2,
      okUp: now_.every((v, i) => v > prev[i]),
      okVol: lots > MIN_VOLUME_LOTS,
    };
    row.star = row.okUp && row.okVol;
    rows.push(row);
  }
  return rows.sort((a, b) => b.okUp + b.okVol - (a.okUp + a.okVol) || b.lots - a.lots);
}

const TRACK_DAYS = 5; // 追蹤交易日數
const TRACK_START = '20260911'; // 8 月營收公布後才回補，避免用到當時還不知道的營收
const TRACK_FILE = path.join(ROOT, 'track', 'picks.json');
const CUP_TRACK_FILE = path.join(ROOT, 'track', 'cups.json');
const toCupPick = (r) => ({ code: r.code, name: r.name, mkt: r.mkt, close: r.close, status: r.status, tight: r.tight, pivot: r.pivot });

function loadTrack() {
  try {
    return JSON.parse(fs.readFileSync(TRACK_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveTrack(t) {
  fs.mkdirSync(path.dirname(TRACK_FILE), { recursive: true });
  fs.writeFileSync(TRACK_FILE, JSON.stringify(t, null, 1));
}
const toPick = (r) => ({
  code: r.code,
  name: r.name,
  mkt: r.mkt,
  industry: r.industry,
  close: r.close,
  yoy: r.yoy,
  star: r.star,
  okUp: r.okUp,
  okVol: r.okVol,
  above60: r.ma60 != null ? r.close > r.ma60 : null,
});

// 計算每筆訊號之後 1~5 個交易日的報酬與勝率
function buildTracking(track, tradeDate, days, groupsOf) {
  const mem = {};
  for (const d of days) mem[d.date] = d.data;
  const tradingDates = fs
    .readdirSync(CACHE)
    .filter((f) => /^\d{8}\.json$/.test(f) && fs.statSync(path.join(CACHE, f)).size > 10)
    .map((f) => f.slice(0, 8))
    .concat(days.map((d) => d.date))
    .filter((d, i, a) => d <= tradeDate && a.indexOf(d) === i)
    .sort();
  const dayData = (d) => (mem[d] = mem[d] || JSON.parse(fs.readFileSync(path.join(CACHE, d + '.json'), 'utf8')));

  const signals = Object.keys(track)
    .filter((d) => d <= tradeDate)
    .sort()
    .reverse()
    .map((date) => {
      const after = tradingDates.filter((d) => d > date).slice(0, TRACK_DAYS);
      const picks = track[date].map((p) => {
        const rets = after.map((d) => {
          const q = dayData(d)[p.code];
          return q && q.close != null ? (q.close / p.close - 1) * 100 : null;
        });
        const done = rets.length === TRACK_DAYS && rets[TRACK_DAYS - 1] != null;
        const valid = rets.filter((v) => v != null);
        return { ...p, rets, done, max: valid.length ? Math.max(...valid) : null, win: done ? rets[TRACK_DAYS - 1] > 0 : null };
      });
      return { date, after, picks };
    });

  const all = signals.flatMap((sg) => sg.picks);
  const stat = (label, list) => {
    const rate = (k) => {
      const l = list.filter((p) => p.rets[k - 1] != null);
      return l.length ? { n: l.length, win: (l.filter((p) => p.rets[k - 1] > 0).length / l.length) * 100 } : null;
    };
    const done = list.filter((p) => p.done);
    return {
      label,
      r1: rate(1),
      r3: rate(3),
      r5: rate(TRACK_DAYS),
      avg5: done.length ? done.reduce((a, p) => a + p.rets[TRACK_DAYS - 1], 0) / done.length : null,
      avgMax: done.length ? done.reduce((a, p) => a + p.max, 0) / done.length : null,
    };
  };
  const stats = groupsOf ? groupsOf(all, stat) : [
    stat('全部訊號', all),
    stat('★ 符合全部條件', all.filter((p) => p.star)),
    stat('三線上彎', all.filter((p) => p.okUp)),
    stat('三線未全上彎', all.filter((p) => !p.okUp)),
    stat('量 > ' + MIN_VOLUME_LOTS.toLocaleString() + ' 張', all.filter((p) => p.okVol)),
    stat('站上季線', all.filter((p) => p.above60 === true)),
    stat('未站上季線', all.filter((p) => p.above60 === false)),
    stat('營收 YoY ≥ 50%', all.filter((p) => p.yoy >= 50)),
  ];
  return { signals, stats };
}

async function main() {
  const now = new Date(Date.now() + 8 * 3600 * 1000); // 台灣時間
  const todayStr = ymd(now);
  const target = process.argv[2] || todayStr;

  // 14:00 那次：今天有開盤的話，等證交所＋櫃買的收盤行情都出來（最多 40 分鐘）
  if (process.env.WAIT_TODAY && !process.argv[2]) {
    try {
      const j = await getJSON('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0');
      const open = j.msgArray && j.msgArray[0] && j.msgArray[0].d === todayStr;
      for (let i = 0; open && i < 20; i++) {
        const d = await getDay(todayStr, todayStr);
        if (d && Object.values(d).some((q) => q.mkt === '上櫃')) break;
        console.log('今日行情還沒出齊，2 分鐘後再試');
        await sleep(120000);
      }
    } catch (e) {
      console.error('等待今日行情失敗：', e.message);
    }
  }

  // 往回收集足夠交易日
  const days = []; // 由新到舊
  const cursor = new Date(Date.UTC(+target.slice(0, 4), +target.slice(4, 6) - 1, +target.slice(6)));
  let guard = 0;
  while (days.length < DAYS_NEEDED && guard++ < 150) {
    const ds = ymd(cursor);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const data = await getDay(ds, todayStr);
      if (data) {
        days.push({ date: ds, data });
        process.stdout.write(`\r已取得 ${days.length}/${DAYS_NEEDED} 個交易日 (${ds})   `);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  console.log();
  if (days.length < DAYS_NEEDED) throw new Error('交易日資料不足');
  days.reverse(); // 由舊到新
  const T = days.length - 1;
  const tradeDate = days[T].date;

  const rev = await addRevenueTrend(await getRevenue());
  try {
    const { overrides } = await (await fetch(`${VOTE_API}/api/overrides`)).json();
    for (const o of overrides || []) {
      for (const list of Object.values(THEMES)) {
        const i = list.indexOf(o.code);
        if (i >= 0) list.splice(i, 1);
      }
      (THEMES[o.theme] = THEMES[o.theme] || []).push(o.code);
    }
    if (overrides && overrides.length) console.log(`套用分類調整 ${overrides.length} 筆`);
  } catch (e) {
    console.error('分類調整讀取失敗：', e.message);
  }
  const fund = await getFundamentals(days[days.length - 1].date, days[days.length - 2].date);
  let three = {};
  try {
    three = await getThreeRates(days[days.length - 1].date);
  } catch (e) {
    console.error('三率資料下載失敗：', e.message);
  }
  for (const [c, v] of Object.entries(three)) (fund[c] = fund[c] || {}).threeUp = v.up;
  const today = days[T].data;
  const groupAbove = [];
  const groupBelow = [];

  const allCross = findCrosses(days, T, rev, fund);
  const latent = findLatent(days, T, rev, fund);
  const crossSet = new Set(allCross.map((r) => r.code));
  const latentSet = new Set(latent.map((r) => r.code));
  const threeUp = [];
  for (const [code, v] of Object.entries(three)) {
    const q = today[code];
    const r = rev[code];
    if (!v.up || !q || q.close == null || q.vol / 1000 < MIN_LOTS_ALL || !r || r.yoy == null || r.yoy <= MIN_YOY || yoyDown(r)) continue;
    const closes = days.map((d) => (d.data[code] ? d.data[code].close : null));
    const m = [...MA_SHORT, MA_SEASON].map((n) => ma(closes, n, T));
    const p = MA_SHORT.map((n) => ma(closes, n, T - 1));
    const lots = q.vol / 1000;
    let tech = '';
    if (crossSet.has(code)) tech = '一K站三線';
    else if (latentSet.has(code)) tech = '潛伏';
    else if (m[0] > m[1] && m[1] > m[2] && m.slice(0, 3).every((x, i) => x > p[i])) tech = '多頭排列';
    else if (q.close > Math.max(...m.slice(0, 3))) tech = '站上三線';
    const pc = closes[T - 1];
    const vavg = ma(days.map((d) => (d.data[code] ? d.data[code].vol : null)), 20, T - 1);
    const volRatio = vavg ? q.vol / vavg : null;
    const chg = pc ? (q.close / pc - 1) * 100 : null;
    const ind = indicators(days, code, T);
    const kdCross = !!ind && ind.k > ind.d && ind.kPrev <= ind.dPrev; // 今天第一天 K 穿過 D
    const kUp = !!ind && ind.k > ind.kPrev;
    // MACD 柱狀體還是負的，但在變短，照目前速度明天會翻正
    const macdSoon = !!ind && ind.osc < 0 && ind.osc > ind.oscPrev && ind.osc + (ind.osc - ind.oscPrev) >= 0;
    threeUp.push({
      code, name: q.name, mkt: q.mkt, industry: r.industry, close: q.close, ind, kdCross, kUp, macdSoon, kdSignal: kdCross && kUp && macdSoon,
      chg, lots: Math.round(lots), tech, volRatio, surge: volRatio >= SURGE_RATIO && chg > 0,
      above60: m[3] != null ? q.close > m[3] : null,
      rates: v, label: v.label,
      yoy: r.yoy, yoyPrev: r.yoyPrev, mom: r.mom, cumYoy: r.cumYoy, ...(fund[code] || {}),
    });
  }
  let threeHist = {};
  try {
    threeHist = JSON.parse(fs.readFileSync(THREE_FILE, 'utf8'));
  } catch {}
  const threeLabel = threeUp[0] ? threeUp[0].label : null;
  const season = latestSeason(tradeDate).join('Q');
  for (let i = 1; i < T; i++) {
    const d = days[i].date;
    if (threeHist[d] || latestSeason(d).join('Q') !== season) continue; // 只算本季財報公布後的日子
    threeHist[d] = Object.entries(three)
      .filter(([c, v]) => {
        const q = days[i].data[c], r = rev[c];
        return v.up && q && q.close != null && q.vol / 1000 >= MIN_LOTS_ALL && r && r.yoy > MIN_YOY && !yoyDown(r);
      })
      .map(([c]) => c);
  }
  threeHist[tradeDate] = threeUp.map((r) => r.code);
  fs.mkdirSync(path.dirname(THREE_FILE), { recursive: true });
  fs.writeFileSync(THREE_FILE, JSON.stringify(threeHist));
  const sets = days.map((d) => new Set(threeHist[d.date] || []));
  for (const r of threeUp) {
    let k = 0;
    for (let i = T; i >= 0 && sets[i].has(r.code); i--) k++;
    r.streak = k;
  }
  const byLots = (a, b) => b.lots - a.lots;
  const g1 = threeUp.filter((r) => r.streak >= 2).sort((a, b) => b.streak - a.streak || byLots(a, b));
  const g2 = threeUp.filter((r) => r.streak < 2 && r.tech === '一K站三線').sort(byLots);
  const g3 = threeUp.filter((r) => r.streak < 2 && r.tech !== '一K站三線').sort(byLots);
  threeUp.length = 0;
  threeUp.push(...g1, ...g2, ...g3);
  threeUp.groups = { g1, g2, g3, label: threeLabel, kd: threeUp.filter((r) => r.kdSignal).sort(byLots) };
  for (const row of allCross) {
    if (row.star) (row.close > row.ma60 ? groupAbove : groupBelow).push(row);
  }

  // 一週追蹤：存下今日名單，並回補 TRACK_START 之後的歷史訊號
  const track = loadTrack();
  for (let i = MA_SHORT[MA_SHORT.length - 1] + 1; i < T; i++) {
    if (days[i].date >= TRACK_START && !track[days[i].date]) track[days[i].date] = findCrosses(days, i, rev, fund).map(toPick);
  }
  track[tradeDate] = allCross.map(toPick);
  saveTrack(track);
  const tracking = buildTracking(track, tradeDate, days);

  const byYoy = (a, b) => b.yoy - a.yoy;
  groupAbove.sort(byYoy);
  groupBelow.sort(byYoy);

  const insti = await getInsti(tradeDate);
  const flow = rankInsti(insti, today, days[T - 1].data);
  const picks = new Set([...groupAbove, ...groupBelow].map((r) => r.code));
  const trustOf = (c) => (insti[c] ? insti[c].trust : null);
  for (const r of [...allCross, ...latent]) r.trustLots = trustOf(r.code) == null ? null : Math.round(trustOf(r.code) / 1000);

  // 大盤寬度：收盤站上 20 日均線的個股比例
  let up = 0, all = 0;
  for (const code of Object.keys(today)) {
    const closes = days.slice(T - 19, T + 1).map((d) => (d.data[code] ? d.data[code].close : null));
    if (closes.some((v) => v == null)) continue;
    all++;
    if (today[code].close > closes.reduce((a, b) => a + b) / 20) up++;
  }
  const breadth = all ? up / all : null;
  const bestA = allCross.filter((r) => r.trustLots > 0 && r.lots >= BEST_MIN_LOTS && breadth > BEST_BREADTH);
  const bestB = allCross.filter((r) => r.trustLots > 0 && r.lots >= BEST_MIN_LOTS && r.chg < 7);
  const latentTrust = latent.filter((r) => r.trustLots > 0);

  // 主動式 ETF 加碼／減碼（各投信每日公告的持股清單）
  let aetf = null;
  try {
    await activeEtf.updateAll();
    const closeOf = (c) => {
      for (let i = T; i >= Math.max(0, T - 5); i--) if (days[i].data[c] && days[i].data[c].close) return days[i].data[c].close;
      return null;
    };
    aetf = activeEtf.analyze(closeOf);
    // 名稱統一用交易所的簡稱（各投信寫法不同，例如「台灣積體電路製造」）
    const nm = (c, n) => (today[c] && today[c].name) || n;
    for (const e of aetf.etfs) for (const x of [...e.buys, ...e.sells, ...e.top]) x.name = nm(x.code, x.name);
    for (const g of [...aetf.consensusBuy, ...aetf.consensusSell, ...aetf.netBuy, ...aetf.netSell]) { g.name = nm(g.code, g.name); g.mkt = today[g.code] && today[g.code].mkt; }
  } catch (e) {
    console.error('主動式ETF失敗：', e.message);
  }

  // 千張大戶
  let holders = { dates: [], rows: [] };
  try {
    await tdcc.updateLatest();
    const weeks = tdcc.analyze(99).dates.length; // 已有幾週資料
    holders = { ...tdcc.analyze(Math.max(1, Math.min(3, weeks - 1))), partial: weeks < 4 };
    holders.rows = holders.rows
      .filter((h) => today[h.code] && today[h.code].vol / 1000 >= MIN_LOTS_ALL)
      .map((h) => {
        const q = today[h.code];
        const r = rev[h.code] || {};
        const pc = days[T - 1].data[h.code] && days[T - 1].data[h.code].close;
        return { ...h, name: q.name, mkt: q.mkt, industry: r.industry, close: q.close, chg: pc ? (q.close / pc - 1) * 100 : null, lots: Math.round(q.vol / 1000), yoy: r.yoy, yoyPrev: r.yoyPrev, mom: r.mom, cumYoy: r.cumYoy, trustLots: trustOf(h.code) == null ? null : Math.round(trustOf(h.code) / 1000), ...(fund[h.code] || {}) };
      });
  } catch (e) {
    console.error('千張大戶資料失敗：', e.message);
  }

  // 產業趨勢
  let industry = null;
  let allDays = null;
  let sharesAll = {};
  try {
    sharesAll = await getShares();
  } catch (e) {
    console.error('發行股數下載失敗：', e.message);
  }
  try {
    // 用全部快取的歷史（約 9 個月）計算，回測統計比較可靠
    const hist = fs
      .readdirSync(CACHE)
      .filter((f) => /^\d{8}\.json$/.test(f) && f.slice(0, 8) < tradeDate && fs.statSync(path.join(CACHE, f)).size > 10)
      .sort()
      .map((f) => ({ date: f.slice(0, 8), data: JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')) }));
    allDays = [...hist, days[T]];
    const AT = allDays.length - 1;
    // 族群起漲門檻（backtest：贏大盤 3 個百分點、前 5 日 ≤ 5% 最佳）
    industry = buildIndustry(allDays, rev, AT, insti, MIN_LOTS_ALL, { groups: THEMES, MIN_STOCKS: 2, START_EXCESS: 3, START_MAX_PRIOR5: 5, shares: sharesAll });
    industry.official = buildIndustry(allDays, rev, AT, insti, MIN_LOTS_ALL, { shares: sharesAll });
  } catch (e) {
    console.error('產業趨勢失敗：', e.message);
  }

  // 杯柄型態（超級績效）
  let cups = [];
  try {
    if (allDays) {
      cups = findCups(allDays, allDays.length - 1, { minLots: MIN_LOTS_ALL, filter: (c) => rev[c] && rev[c].yoy > MIN_YOY && !yoyDown(rev[c]) });
      for (const r of cups) Object.assign(r, { industry: rev[r.code].industry, yoy: rev[r.code].yoy, yoyPrev: rev[r.code].yoyPrev, mom: rev[r.code].mom, cumYoy: rev[r.code].cumYoy, trustLots: trustOf(r.code) == null ? null : Math.round(trustOf(r.code) / 1000), ...(fund[r.code] || {}) });
    }
  } catch (e) {
    console.error('杯柄型態失敗：', e.message);
  }
  // 杯柄型態一週追蹤：存下今日名單，並回補 TRACK_START 之後的歷史訊號
  let cupTracking = null;
  try {
    if (allDays) {
      let ct = {};
      try {
        ct = JSON.parse(fs.readFileSync(CUP_TRACK_FILE, 'utf8'));
      } catch {}
      const cupFilter = (c) => rev[c] && rev[c].yoy > MIN_YOY && !yoyDown(rev[c]);
      for (let i = 0; i < allDays.length - 1; i++) {
        if (allDays[i].date >= TRACK_START && !ct[allDays[i].date]) ct[allDays[i].date] = findCups(allDays, i, { minLots: MIN_LOTS_ALL, filter: cupFilter }).map(toCupPick);
      }
      ct[tradeDate] = cups.map(toCupPick);
      fs.mkdirSync(path.dirname(CUP_TRACK_FILE), { recursive: true });
      fs.writeFileSync(CUP_TRACK_FILE, JSON.stringify(ct, null, 1));
      cupTracking = buildTracking(ct, tradeDate, days, (all, stat) => [
        stat('全部訊號', all),
        stat('帶量突破', all.filter((p) => /帶量突破/.test(p.status))),
        stat('柄整理中', all.filter((p) => p.status === '柄整理中')),
        stat('收斂型（回檔越來越小）', all.filter((p) => p.tight)),
        stat('非收斂型', all.filter((p) => !p.tight)),
      ]);
    }
  } catch (e) {
    console.error('杯柄追蹤失敗：', e.message);
  }

  // 0050 成分股：法說會與營收
  let ir50 = null;
  try {
    const iso = `${todayStr.slice(0, 4)}-${todayStr.slice(4, 6)}-${todayStr.slice(6)}`;
    const etf = await ir.get0050(iso);
    const conf = await ir.getConferences(etf.list.map((x) => x.code), todayStr);
    const w = Object.fromEntries(etf.list.map((x) => [x.code, x.weight]));
    const members = etf.list.map((x) => {
      const q = today[x.code] || {};
      const r = rev[x.code] || {};
      const pc = days[T - 1].data[x.code] && days[T - 1].data[x.code].close;
      return { code: x.code, name: q.name || x.name, mkt: '上市', weight: x.weight, close: q.close, chg: pc && q.close ? (q.close / pc - 1) * 100 : null, ...r, ...(fund[x.code] || {}) };
    });
    ir50 = { asOf: etf.asOf, conf: conf.map((c) => ({ ...c, weight: w[c.code] })), members, today: iso };
  } catch (e) {
    console.error('0050 法說會資料失敗：', e.message);
  }

  // 總經
  let macro = null;
  try {
    macro = await buildMacro(`${todayStr.slice(0, 4)}-${todayStr.slice(4, 6)}-${todayStr.slice(6)}`);
  } catch (e) {
    console.error('總經資料失敗：', e.message);
  }

  // 千金股產業龍頭：依產業別算市值排名
  const shares = await getShares();
  const closeAt = (code, i) => (days[i] && days[i].data[code] ? days[i].data[code].close : null);
  const pct = (a, b) => (a != null && b ? (a / b - 1) * 100 : null);
  const byIndustry = {};
  for (const code of Object.keys(today)) {
    const q = today[code];
    const ind = rev[code] && rev[code].industry;
    if (!ind || q.close == null || !shares[code]) continue;
    (byIndustry[ind] = byIndustry[ind] || []).push({ code, name: q.name, cap: (q.close * shares[code]) / 1e8 });
  }
  const rankOf = {};
  for (const ind of Object.keys(byIndustry)) {
    byIndustry[ind].sort((a, b) => b.cap - a.cap);
    byIndustry[ind].forEach((r, i) => (rankOf[r.code] = i + 1));
  }
  const bigLeaders = [];
  for (const code of Object.keys(rankOf)) {
    const q = today[code];
    const pc = closeAt(code, T - 1);
    if (rankOf[code] > LEADER_RANK || Math.max(q.close, pc || 0) < BIG_PRICE) continue;
    const ind = rev[code].industry;
    bigLeaders.push({
      code,
      name: q.name,
      mkt: q.mkt,
      industry: ind,
      rank: rankOf[code],
      cap: byIndustry[ind].find((r) => r.code === code).cap,
      close: q.close,
      chg: pct(q.close, pc),
      chg5: pct(pc, closeAt(code, T - 6)),
      chg20: pct(pc, closeAt(code, T - 21)),
      lots: Math.round(q.vol / 1000),
      instiLots: insti[code] ? Math.round(insti[code].total / 1000) : null,
    });
  }
  bigLeaders.sort((a, b) => a.chg - b.chg);
  const crashed = bigLeaders.filter((r) => r.chg != null && r.chg <= CRASH_PCT);

  // 產業新聞：重挫個股 + 千金龍頭與選股所在產業
  console.log('抓取新聞…');
  const stockNews = [];
  for (const r of crashed) {
    stockNews.push({ ...r, news: await getNews(`"${r.name}"`) });
    await sleep(800);
  }
  const indOrder = [
    ...crashed.map((r) => r.industry),
    ...bigLeaders.map((r) => r.industry),
    ...[...groupAbove, ...groupBelow].map((r) => r.industry),
  ].filter((v, i, a) => v && a.indexOf(v) === i);
  const industryNews = [];
  for (const ind of indOrder) {
    const leaders = byIndustry[ind].slice(0, LEADER_RANK).map((r) => r.name);
    const kw = ind.startsWith('其他') ? [] : [ind.replace(/業$/, '')];
    const query = [...kw, ...leaders].map((s) => `"${s}"`).join(' OR ');
    industryNews.push({ industry: ind, leaders, news: await getNews(query) });
    await sleep(800);
  }

  let topbar = null;
  try {
    topbar = await getTopBar();
  } catch (e) {
    console.error('置頂指數失敗：', e.message);
  }

  // 主力鎖碼
  let locked = null;
  try {
    locked = await buildLocked({ days, T, instiOf: getInsti, holders: tdcc.analyze(1), minLots: MIN_LOTS_ALL });
    const addFund = (r) => Object.assign(r, rev[r.code] ? { yoy: rev[r.code].yoy, yoyPrev: rev[r.code].yoyPrev, mom: rev[r.code].mom, cumYoy: rev[r.code].cumYoy } : {}, fund[r.code] || {});
    locked.all.forEach(addFund);
    locked.near.forEach(addFund);
  } catch (e) {
    console.error('主力鎖碼失敗：', e.message);
  }

  // 收盤靠杯總結
  let roast = [];
  try {
    const prev = days[T - 1].data;
    let up = 0, down = 0, limitUp = 0, limitDown = 0, val = 0;
    for (const [c, q] of Object.entries(today)) {
      const pc = prev[c] && prev[c].close;
      if (q.close == null || !pc) continue;
      const chg = (q.close / pc - 1) * 100;
      if (chg > 0) up++;
      else if (chg < 0) down++;
      if (chg >= 9.5) limitUp++;
      if (chg <= -9.5) limitDown++;
      val += ((q.vol || 0) * q.close) / 1e8;
    }
    const dayVal = (d) => Object.values(d.data).reduce((a, q) => a + ((q.vol || 0) * (q.close || 0)) / 1e8, 0);
    const past = days.slice(Math.max(0, T - 20), T);
    let foreign = 0, trust = 0;
    for (const [c, x] of Object.entries(insti || {})) {
      const q = today[c];
      if (q && q.close) (foreign += (x.foreign * q.close) / 1e8), (trust += (x.trust * q.close) / 1e8);
    }
    // onDate：取指定交易日的收盤（避免盤中執行時拿到今天的即時價）
    const lastChg = (sym, onDate) => {
      const a = topbar && topbar.idx.find((x) => x.sym === sym);
      if (!a || a.pts.length < 2) return null;
      const p = a.pts;
      const tw = (ms) => new Date(ms + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
      let i = p.length - 1;
      if (onDate) {
        i = p.findIndex((x) => tw(x[0]) === onDate);
        if (i < 1) return null;
      }
      return { close: p[i][1], pct: (p[i][1] / p[i - 1][1] - 1) * 100 };
    };
    const tsmc = today['2330'] && prev['2330'] ? { close: today['2330'].close, chg: (today['2330'].close / prev['2330'].close - 1) * 100 } : null;
    const rows = industry ? [...industry.rows].sort((a, b) => b.r1 - a.r1) : [];
    const sox = lastChg('^SOX');
    roast = buildRoast({
      date: tradeDate,
      twii: lastChg('^TWII', tradeDate),
      breadth: { up, down, limitUp, limitDown },
      turnover: { today: val, avg: past.length ? past.reduce((a, d) => a + dayVal(d), 0) / past.length : null },
      flows: insti && Object.keys(insti).length ? { foreign, trust } : null, // 法人資料還沒公布（約 15:00）就不寫這句
      tsmc,
      best: rows[0],
      worst: rows[rows.length - 1],
      sox: sox ? sox.pct : null,
    });
  } catch (e) {
    console.error('靠杯總結失敗：', e.message);
  }

  // 開獎：上一個交易日的投票，看今天（tradeDate）的實際表現，上傳給比賽計分
  try {
    const tw = topbar && topbar.idx.find((x) => x.sym === '^TWII');
    let twPct = null;
    if (tw) {
      const p = tw.pts, key = (ms) => new Date(ms + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
      const i = p.findIndex((x) => key(x[0]) === tradeDate);
      if (i > 0) twPct = (p[i][1] / p[i - 1][1] - 1) * 100;
    }
    const settled = fs.existsSync(path.join(ROOT, 'track', `settled-${tradeDate}.json`)); // 13:35 已收盤開獎就不再覆蓋
    if (resultsKey() && twPct != null && industry && !settled) {
      const themes = {};
      for (const r of [...(industry.official ? industry.official.rows : []), ...industry.rows]) themes[r.name] = +r.r1.toFixed(2);
      const top3 = [...industry.rows].sort((a, b) => b.r1 - a.r1).slice(0, 3).map((r) => r.name);
      const res = await fetch(`${VOTE_API}/api/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Results-Key': resultsKey() },
        body: JSON.stringify({ date: days[T - 1].date, next: tradeDate, tw: +twPct.toFixed(2), themes, top3 }),
      });
      console.log('比賽開獎上傳', res.status, days[T - 1].date, '→', tradeDate, top3.join('、'));
    }
  } catch (e) {
    console.error('比賽開獎上傳失敗：', e.message);
  }

  // 上一個交易日的投票 vs 今天實際表現
  let voteRecap = null;
  try {
    const pd = days[T - 1].date;
    const pr = await (await fetch(`${VOTE_API}/api/poll?date=${pd}`)).json();
    if (pr.total > 0) {
      const top = pr.themes[0];
      const row = top && industry ? [...industry.rows, ...(industry.official ? industry.official.rows : [])].find((x) => x.name === top.theme) : null;
      const tw = topbar && topbar.idx.find((x) => x.sym === '^TWII');
      let twPct = null;
      if (tw) {
        const p = tw.pts, key = (ms) => new Date(ms + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
        const i = p.findIndex((x) => key(x[0]) === tradeDate);
        if (i > 0) twPct = (p[i][1] / p[i - 1][1] - 1) * 100;
      }
      voteRecap = { date: pd, total: pr.total, bullPct: (pr.bull / pr.total) * 100, top: top ? { name: top.theme, n: top.n, r1: row ? row.r1 : null } : null, twPct };
    }
  } catch (e) {
    console.error('投票結果讀取失敗：', e.message);
  }

  // 自選股用：全部個股的精簡資料與所在名單，輸出成 site/stocks.json
  try {
    const tagMap = {};
    const tag = (codes, t) => codes.forEach((c) => (tagMap[c] = tagMap[c] || []).push(t));
    tag([...groupAbove, ...groupBelow].map((r) => r.code), '★選股');
    tag(allCross.map((r) => r.code), '一K站三線');
    tag(latent.map((r) => r.code), '潛伏股');
    tag(threeUp.map((r) => r.code), '三率三升');
    tag(threeUp.filter((r) => r.surge).map((r) => r.code), '爆量上漲');
    tag(threeUp.filter((r) => r.kdSignal).map((r) => r.code), 'KD金叉');
    if (locked) tag([...locked.all, ...locked.near].map((r) => r.code), '主力鎖碼');
    tag((holders.rows || []).map((r) => r.code), '千張大戶增');
    tag(bigLeaders.map((r) => r.code), '千金龍頭');
    tag(cups.filter((r) => /突破/.test(r.status)).map((r) => r.code), '杯柄突破');
    tag(cups.filter((r) => !/突破/.test(r.status)).map((r) => r.code), '杯柄整理中');
    tag(Object.entries(insti || {}).filter(([, x]) => x.trust > 0).map(([c]) => c), '投信買超');
    const themeOf = {};
    for (const [t, list] of Object.entries(THEMES)) list.forEach((c) => (themeOf[c] = themeOf[c] || []).push(t));
    // 外資（分析師共識）預估：只抓有人放進自選股的股票
    let est = {};
    try {
      if (resultsKey()) {
        const { codes } = await (await fetch(`${VOTE_API}/api/watch-codes`, { headers: { 'X-Results-Key': resultsKey() } })).json();
        const want = (codes || []).filter((c) => today[c]).map((c) => ({ code: c, otc: today[c].mkt === '上櫃' }));
        est = await getEstimates(todayStr, want);
        console.log(`外資預估 ${Object.values(est).filter(Boolean).length}/${want.length} 檔`);
      }
    } catch (e) {
      console.error('外資預估失敗：', e.message);
    }
    const list = {};
    const back = (c, k) => (days[T - k] && days[T - k].data[c] ? days[T - k].data[c].close : null);
    for (const [c, q] of Object.entries(today)) {
      if (q.close == null) continue;
      const p1 = back(c, 1), p5 = back(c, 5), p20 = back(c, 20);
      const r = rev[c] || {};
      const pe0 = fund[c] && fund[c].pe > 0 ? fund[c].pe : null;
      const e4 = fund[c] && fund[c].e4 ? fund[c].e4 : pe0 ? q.close / pe0 : null; // 近四季 EPS
      list[c] = {
        pe: e4 > 0 ? +(q.close / e4).toFixed(1) : null, // 目前本益比（用今天收盤）
        e4: e4 ? +e4.toFixed(2) : null,
        es: est[c] || undefined, // 外資預估

        n: q.name, m: q.mkt === '上櫃' ? 1 : 0, c: q.close,
        p: p1 ? +((q.close / p1 - 1) * 100).toFixed(2) : null,
        r5: p5 ? +((q.close / p5 - 1) * 100).toFixed(1) : null,
        r20: p20 ? +((q.close / p20 - 1) * 100).toFixed(1) : null,
        v: Math.round((q.vol || 0) / 1000),
        y: r.yoy != null ? +r.yoy.toFixed(1) : null,
        i: themeOf[c] ? themeOf[c].join('、') : r.industry || '',
        t: tagMap[c] || [],
      };
    }
    fs.mkdirSync(path.join(ROOT, 'site'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'site', 'stocks.json'), JSON.stringify({ date: tradeDate, list }));
    // 開盤推播用的今日焦點
    const uniq = (a) => [...new Set(a)];
    // 盤後推播（14:00 盤後整理、17:00 法人更新）用的摘要
    const hasInsti = Object.keys(insti).length > 0;
    const amt = (k) => Object.entries(insti).reduce((a, [c, x]) => a + (today[c] && today[c].close ? (x[k] * today[c].close) / 1e8 : 0), 0);
    // 加權收盤：先用證交所即時行情（日期要是交易日），否則用 Yahoo 日線裡同一天的那筆
    let twiiNow = null;
    try {
      const m = (await getJSON('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0')).msgArray[0];
      if (m.d === tradeDate && +m.z && +m.y) twiiNow = { close: +(+m.z).toFixed(2), pct: +((m.z / m.y - 1) * 100).toFixed(2) };
    } catch {}
    if (!twiiNow) {
      const tw = topbar && topbar.idx.find((x) => x.sym === '^TWII');
      const key = (ms) => new Date(ms + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
      const i = tw && tw.pts ? tw.pts.findIndex((x) => key(x[0]) === tradeDate) : -1;
      if (i > 0) twiiNow = { close: tw.pts[i][1], pct: +((tw.pts[i][1] / tw.pts[i - 1][1] - 1) * 100).toFixed(2) };
    }
    const themeTop = industry ? [...industry.rows].sort((a, b) => b.r1 - a.r1).slice(0, 3).map((r) => ({ name: r.name, r1: +r.r1.toFixed(2) })) : [];
    fs.writeFileSync(
      path.join(ROOT, 'site', 'brief.json'),
      JSON.stringify({
        date: tradeDate,
        insti: hasInsti,
        twii: twiiNow,
        foreign: hasInsti ? +amt('foreign').toFixed(1) : null,
        trust: hasInsti ? +amt('trust').toFixed(1) : null,
        themes: themeTop,
        n: { cross: allCross.length, cup: cups.length, three: threeUp.length, latent: latent.length, kd: (threeUp.groups.kd || []).length },
        best: uniq([...bestA, ...bestB].map((r) => r.name)),
        cup: cups.map((r) => r.name),
        latent: latentTrust.map((r) => r.name),
        aetfBuy: aetf ? aetf.consensusBuy.slice(0, 3).map((g) => g.name) : [],
        aetfSell: aetf ? aetf.consensusSell.slice(0, 3).map((g) => g.name) : [],
        roast: Array.isArray(roast) && roast.length ? String(roast[0]).replace(/<[^>]+>/g, "") : null,
      })
    );
  } catch (e) {
    console.error('個股資料輸出失敗：', e.message);
  }

  const html = renderHtml(tradeDate, groupAbove, groupBelow, flow, picks, { locked, voteRecap, roast, topbar, industry, ir50, threeGroups: threeUp.groups, macro, holders, breadth, bestA, bestB, latentTrust, cups, cupTracking, aetf, allCross, latent, threeUp, tracking, bigLeaders, crashed, stockNews, industryNews });
  const dated = path.join(REPORTS, `${tradeDate}.html`);
  fs.writeFileSync(dated, html);
  fs.writeFileSync(path.join(ROOT, '最新選股.html'), html);
  fs.writeFileSync(path.join(REPORTS, `${tradeDate}.csv`), '﻿' + renderCsv(groupAbove, groupBelow));
  publishSite(tradeDate, html);

  console.log(`交易日 ${tradeDate}`);
  console.log(`站上季線：${groupAbove.map((r) => r.code + r.name).join('、') || '無'}`);
  console.log(`未站上季線：${groupBelow.map((r) => r.code + r.name).join('、') || '無'}`);
  console.log(`千金龍頭 ${bigLeaders.length} 檔，重挫：${crashed.map((r) => `${r.code}${r.name}(${f2(r.chg)}%)`).join('、') || '無'}`);
  console.log(`報告：${dated}`);
}

// 輸出到 site/（GitHub Pages）：index.html = 最新報告 + 歷史報告列表
function publishSite(tradeDate, html) {
  const site = path.join(ROOT, 'site');
  fs.mkdirSync(path.join(site, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(site, 'reports', `${tradeDate}.html`), html);
  const dates = fs
    .readdirSync(path.join(site, 'reports'))
    .filter((f) => /^\d{8}\.html$/.test(f))
    .map((f) => f.slice(0, 8))
    .sort()
    .reverse();
  const latest = dates[0];
  const latestHtml = fs.readFileSync(path.join(site, 'reports', `${latest}.html`), 'utf8');
  const list = dates
    .map((d) => `<a href="reports/${d}.html">${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6)}</a>`)
    .join('');
  const footer = `<h2>歷史報告</h2><div class="history">${list}</div>
<style>.history{display:flex;flex-wrap:wrap;gap:8px}.history a{background:var(--card);padding:6px 12px;border-radius:6px;font-size:13px;text-decoration:none}</style>`;
  fs.writeFileSync(path.join(site, 'index.html'), latestHtml.replace('</body>', `<div class="page" data-p="main">${footer}</div></body>`));
  fs.writeFileSync(path.join(site, '.nojekyll'), '');
}

const f2 = (v) => (v == null ? '-' : v.toFixed(2));
const f1 = (v) => (v == null ? '-' : v.toFixed(1));

function renderCsv(a, b) {
  const head = '分組,代號,名稱,市場,產業,開盤,收盤,漲跌%,成交量(張),MA5,MA10,MA20,MA60,距季線%,營收YoY%,營收月份,月增%,累計YoY%,EPS,EPS期間,營益率%,毛利率%,本益比,淨值比,基本面標註';
  const line = (g, r) =>
    [g, r.code, r.name, r.mkt, r.industry, r.open, r.close, f2(r.chg), r.lots, f2(r.ma5), f2(r.ma10), f2(r.ma20), f2(r.ma60), f1(r.gap60), f1(r.yoy), r.revMonth, f1(r.mom), f1(r.cumYoy), f2(r.eps), r.period || '', f1(r.opm), f1(r.gm), f1(r.pe), f2(r.pb), fundTags(r).map((t) => t[0]).join(' ')].join(',');
  return [head, ...a.map((r) => line('站上季線', r)), ...b.map((r) => line('未站上季線', r))].join('\n');
}

// 基本面標註：[文字, good|bad|mid]
function fundTags(r) {
  const t = [];
  if (r.yoy == null) t.push(['無營收資料', 'mid']);
  else if (r.yoy >= 50) t.push(['營收高成長', 'good']);
  else if (r.yoy >= 20) t.push(['營收成長', 'good']);
  else if (r.yoy > 0) t.push(['營收溫和成長', 'mid']);
  else t.push(['營收衰退', 'bad']);
  if (r.trustLots > 0) t.push([`投信買超 ${r.trustLots.toLocaleString()} 張`, 'good']);
  if (r.threeUp) t.push(['三率三升', 'good']);
  if (r.yoyPrev != null) t.push(r.yoy >= r.yoyPrev ? ['YoY 加速', 'good'] : ['YoY 放緩', 'bad']);
  if (r.cumYoy != null) t.push(r.cumYoy > 0 ? ['今年累計成長', 'good'] : ['今年累計衰退', 'bad']);
  if (r.mom != null) t.push(r.mom >= 0 ? ['月增', 'good'] : ['月減', 'bad']);
  if (r.eps != null) t.push(r.eps > 0 ? ['獲利', 'good'] : ['虧損', 'bad']);
  if (r.pe) {
    if (r.pe <= 15) t.push(['低本益比', 'good']);
    else if (r.pe >= 40) t.push(['高本益比', 'bad']);
  } else if (r.eps != null && r.eps <= 0) t.push(['本益比無', 'mid']);
  return t;
}

function renderTable(rows) {
  if (!rows.length) return '<p class="empty">今日無符合條件個股</p>';
  const tr = rows
    .map(
      (r) => `<tr>
<td><a href="https://tw.stock.yahoo.com/quote/${r.code}${r.mkt === '上櫃' ? '.TWO' : '.TW'}/technical-analysis" target="_blank">${r.code}</a></td>
<td>${r.name}<span class="tag">${r.mkt}</span></td><td>${r.industry || ''}</td>
<td class="chips">${fundTags(r).map(([t, c]) => `<span class="chip ${c}">${t}</span>`).join('')}</td>
<td>${r.open}</td><td>${r.close}</td><td class="${r.chg >= 0 ? 'up' : 'dn'}">${f2(r.chg)}%</td>
<td>${r.lots.toLocaleString()}</td>
<td>${f2(r.ma5)}</td><td>${f2(r.ma10)}</td><td>${f2(r.ma20)}</td><td>${f2(r.ma60)}</td>
<td class="${r.gap60 >= 0 ? 'up' : 'dn'}">${f1(r.gap60)}%</td>
<td class="up">${f1(r.yoy)}%</td>${pctCell(r.mom)}${pctCell(r.cumYoy)}
<td class="${r.eps == null ? '' : r.eps > 0 ? 'up' : 'dn'}">${f2(r.eps)}</td><td>${r.opm == null ? '-' : f1(r.opm) + '%'}</td><td>${r.gm == null ? '-' : f1(r.gm) + '%'}</td>
<td>${r.pe ? f1(r.pe) : '-'}</td><td>${r.pb ? f2(r.pb) : '-'}</td></tr>`
    )
    .join('');
  return `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>產業</th><th>基本面</th><th>開盤</th><th>收盤</th><th>漲跌</th><th>量(張)</th><th>MA5</th><th>MA10</th><th>MA20</th><th>MA60</th><th>距季線</th><th>營收YoY</th><th>月增</th><th>累計YoY</th><th>EPS</th><th>營益率</th><th>毛利率</th><th>本益比</th><th>淨值比</th></tr></thead><tbody>${tr}</tbody></table></div>`;
}

const quoteLink = (r) =>
  `https://tw.stock.yahoo.com/quote/${r.code}${r.mkt === '上櫃' ? '.TWO' : '.TW'}/institutional-trading`;
const signed = (v, d) => (v > 0 ? '+' : '') + v.toFixed(d);

function renderFlowTable(rows, k, side, picks) {
  if (!rows.length) return '<p class="empty">無資料</p>';
  const extra = k === 'total';
  const tr = rows
    .map(
      (r, i) => `<tr><td>${i + 1}</td>
<td><a href="${quoteLink(r)}" target="_blank">${r.code} ${r.name}</a>${picks.has(r.code) ? '<span class="star" title="今日選股">★</span>' : ''}</td>
<td>${r.close}</td><td class="${r.chg >= 0 ? 'up' : 'dn'}">${r.chg == null ? '-' : f2(r.chg) + '%'}</td>
<td class="${side}">${signed(r[k + 'Lots'], 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</td>
<td class="${side}"><b>${signed(r[k + 'Amt'], 2)}</b></td>
${extra ? INSTI_KINDS.slice(1).map(([kk]) => `<td class="${r[kk + 'Amt'] >= 0 ? 'up' : 'dn'}">${signed(r[kk + 'Amt'], 2)}</td>`).join('') : ''}</tr>`
    )
    .join('');
  const th = extra ? '<th>外資(億)</th><th>投信(億)</th><th>自營(億)</th>' : '';
  return `<div class="scroll"><table class="flow"><thead><tr><th>#</th><th>個股</th><th>收盤</th><th>漲跌</th><th>張數</th><th>金額(億)</th>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}

function renderFlow(flow, picks) {
  const tabs = INSTI_KINDS.map(
    ([k, label], i) => `<button class="tab${i ? '' : ' on'}" data-k="${k}">${label}</button>`
  ).join('');
  const panels = INSTI_KINDS.map(
    ([k, label], i) => `<div class="panel" data-k="${k}"${i ? ' hidden' : ''}>
<div class="cols"><div><h3 class="up">${label} 買超前 ${INSTI_TOP}</h3>${renderFlowTable(flow[k].buy, k, 'up', picks)}</div>
<div><h3 class="dn">${label} 賣超前 ${INSTI_TOP}</h3>${renderFlowTable(flow[k].sell, k, 'dn', picks)}</div></div></div>`
  ).join('');
  return `<h2>三大法人資金流向 <span class="count">依買賣超金額排行（張數 × 收盤價）</span></h2>
<div class="tabs">${tabs}</div>${panels}
<script>document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.dataset.k!==b.dataset.k)})</script>`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pctCell = (v) => `<td class="${v == null ? '' : v >= 0 ? 'up' : 'dn'}">${v == null ? '-' : signed(v, 2) + '%'}</td>`;

function renderLeaderTable(rows) {
  const tr = rows
    .map(
      (r) => `<tr><td><a href="https://tw.stock.yahoo.com/quote/${r.code}${r.mkt === '上櫃' ? '.TWO' : '.TW'}/technical-analysis" target="_blank">${r.code}</a></td>
<td>${r.name}<span class="tag">${r.mkt}</span></td><td>${r.industry} <span class="tag">第${r.rank}大</span></td>
<td>${r.close.toLocaleString()}</td>${pctCell(r.chg)}${pctCell(r.chg5)}${pctCell(r.chg20)}
<td>${r.lots.toLocaleString()}</td>
<td class="${r.instiLots == null ? '' : r.instiLots >= 0 ? 'up' : 'dn'}">${r.instiLots == null ? '-' : signed(r.instiLots, 0)}</td>
<td>${Math.round(r.cap).toLocaleString()}</td></tr>`
    )
    .join('');
  return `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>產業／市值排名</th><th>收盤</th><th>今日</th><th>前5日</th><th>前20日</th><th>量(張)</th><th>法人(張)</th><th>市值(億)</th></tr></thead><tbody>${tr}</tbody></table></div>`;
}

function renderLeaders({ bigLeaders, crashed }) {
  return `<h2>千金股產業龍頭重挫 <span class="count">股價 ≥ ${BIG_PRICE.toLocaleString()}、產業市值前 ${LEADER_RANK} 名、今日跌幅 ≥ ${-CRASH_PCT}%</span></h2>
${crashed.length ? renderLeaderTable(crashed) + '<p class="hint">重挫原因可到「產業新聞」分頁查看個股新聞</p>' : '<p class="empty">今日無千金龍頭重挫</p>'}
<details><summary>全部千金龍頭今日表現（${bigLeaders.length} 檔，依跌幅排序）</summary>${renderLeaderTable(bigLeaders)}</details>`;
}

function renderNewsList(news) {
  if (!news.length) return '<p class="empty">近一天無相關新聞</p>';
  return `<ul class="news">${news
    .map(
      (n) => `<li><a href="${esc(n.link)}" target="_blank">${esc(n.title)}</a><span class="meta">${esc(n.source)}　${n.time.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span></li>`
    )
    .join('')}</ul>`;
}

function renderNews({ stockNews, industryNews }) {
  const stock = stockNews.length
    ? `<h2>重挫個股新聞</h2><div class="cards">${stockNews
        .map((r) => `<div class="card"><h3>${r.code} ${r.name} <span class="dn">${f2(r.chg)}%</span></h3>${renderNewsList(r.news)}</div>`)
        .join('')}</div>`
    : '';
  const ind = `<h2>產業新聞 <span class="count">近一天，千金龍頭與選股所在產業</span></h2><div class="cards">${industryNews
    .map((r) => `<div class="card"><h3>${r.industry} <span class="tag">${r.leaders.join('・')}</span></h3>${renderNewsList(r.news)}</div>`)
    .join('')}</div>`;
  return stock + ind;
}

function renderAllCross(rows, picks) {
  const ok = (v) => (v ? '<td class="ok">✓</td>' : '<td class="no">✗</td>');
  const tr = rows
    .map(
      (r) => `<tr><td><a href="https://tw.stock.yahoo.com/quote/${r.code}${r.mkt === '上櫃' ? '.TWO' : '.TW'}/technical-analysis" target="_blank">${r.code}</a></td>
<td>${r.name}<span class="tag">${r.mkt}</span>${picks.has(r.code) ? '<span class="star" title="符合全部條件">★</span>' : ''}</td><td>${r.industry || '-'}</td>
<td class="chips">${fundTags(r).map(([t, c]) => `<span class="chip ${c}">${t}</span>`).join('')}</td>
${ok(r.okUp)}${ok(r.okVol)}
<td>${r.close}</td>${pctCell(r.chg)}<td>${r.lots.toLocaleString()}</td>
<td class="${r.gap60 == null ? '' : r.gap60 >= 0 ? 'up' : 'dn'}">${r.gap60 == null ? '-' : (r.gap60 >= 0 ? '站上 ' : '未站上 ') + f1(r.gap60) + '%'}</td>
${r.yoy == null ? '<td>-</td>' : pctCell(r.yoy)}<td class="${r.eps == null ? '' : r.eps > 0 ? 'up' : 'dn'}">${f2(r.eps)}</td><td>${r.pe ? f1(r.pe) : '-'}</td></tr>`
    )
    .join('');
  return `<h2>所有一根K棒站上三線 <span class="count">${rows.length} 檔，營收 YoY 為正且未往下；✓✗ 標示是否符合，★ 為符合全部條件</span></h2>
${rows.length ? `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>產業</th><th>基本面</th><th>三線上彎</th><th>量&gt;${MIN_VOLUME_LOTS}</th><th>收盤</th><th>漲跌</th><th>量(張)</th><th>季線</th><th>營收YoY</th><th>EPS</th><th>本益比</th></tr></thead><tbody>${tr}</tbody></table></div>` : '<p class="empty">今日無</p>'}`;
}

const stockLink = (r) => `<a href="https://tw.stock.yahoo.com/quote/${r.code}${r.mkt === '上櫃' ? '.TWO' : '.TW'}/technical-analysis" target="_blank">${r.code}</a>`;
const chipsOf = (r) => `<td class="chips">${fundTags(r).map(([t, c]) => `<span class="chip ${c}">${t}</span>`).join('')}</td>`;

function renderBest({ bestA, bestB, breadth }) {
  const tbl = (rows) =>
    rows.length
      ? `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>產業</th><th>基本面／籌碼</th><th>收盤</th><th>漲跌</th><th>量(張)</th><th>投信(張)</th><th>季線</th></tr></thead><tbody>${rows
          .map((r) => `<tr><td>${stockLink(r)}</td><td>${r.name}<span class="tag">${r.mkt}</span></td><td>${r.industry || '-'}</td>${chipsOf(r)}<td>${r.close}</td>${pctCell(r.chg)}<td>${r.lots.toLocaleString()}</td><td class="up">+${r.trustLots.toLocaleString()}</td><td>${r.ma60 == null ? '-' : r.close > r.ma60 ? '站上' : '未站上'}</td></tr>`)
          .join('')}</tbody></table></div>`
      : '<p class="empty">今日無</p>';
  const strong = breadth > BEST_BREADTH;
  return `<h2>回測勝率最高組合 <span class="count">一根K棒站上三線＋投信買超</span></h2>
<div class="rules">今日大盤寬度：<b class="${strong ? 'up' : 'dn'}">${breadth == null ? '-' : f1(breadth * 100) + '%'}</b> 的個股收盤站上月線（&gt; ${BEST_BREADTH * 100}% 為大盤強）</div>
<h3>A. 一K站三線＋投信買超＋量 ≥ ${BEST_MIN_LOTS.toLocaleString()} 張＋大盤強 <span class="count">回測 5 日勝率 63.4%（41 筆，前半 64.7%／後半 62.5%），平均 5 日 +2.2%</span></h3>
${strong ? tbl(bestA) : '<p class="empty">今日大盤寬度未達標，A 組不成立</p>'}
<h3>B. 一K站三線＋投信買超＋量 ≥ ${BEST_MIN_LOTS.toLocaleString()} 張＋漲幅 &lt; 7% <span class="count">回測 5 日勝率 57.6%（92 筆，前半 62.1%／後半 55.6%），平均 5 日 +1.1%</span></h3>
${tbl(bestB)}
<p class="hint">比較基準：同期間隨機買進量 ≥ 200 張的股票持有 5 日，勝率 47.3%。原本的「一K站三線＋YoY 正」只有 39.1%，因為強勢長紅隔幾天常拉回；加上投信買超後才明顯勝過隨機。樣本僅約半年、且多為多頭期間，請搭配一週追蹤持續驗證。</p>`;
}

function renderIR50({ asOf, conf, members, today }) {
  const wk = '日一二三四五六';
  const dlabel = (d) => `${+d.slice(5, 7)}/${+d.slice(8)}（${wk[new Date(d + 'T00:00:00Z').getUTCDay()]}）`;
  const invited = (c) => /受邀|邀請|受.{0,6}邀/.test(c.desc);
  const confRow = (c) => `<tr${!invited(c) ? ' class="own"' : ''}><td>${dlabel(c.date)}</td><td>${esc(c.time)}</td>
<td><a href="https://tw.stock.yahoo.com/quote/${c.code}.TW" target="_blank">${c.code}</a> ${esc(c.name)}${c.weight ? `<span class="tag">權重 ${c.weight}%</span>` : ''}</td>
<td>${invited(c) ? '<span class="chip mid">受邀</span>' : '<span class="chip hot">自辦</span>'}</td>
<td class="post">${esc(c.desc)}</td><td>${c.files.map((f) => `<a href="${f.url}" target="_blank">${f.lang}文簡報</a>`).join(' ') || '-'}</td></tr>`;
  const head = '<thead><tr><th>日期</th><th>時間</th><th>公司</th><th>類型</th><th>內容</th><th>簡報</th></tr></thead>';
  const upcoming = conf.filter((c) => c.date >= today).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const past14 = new Date(Date.parse(today) - 14 * 86400000).toISOString().slice(0, 10);
  const recent = conf.filter((c) => c.date < today && c.date >= past14).sort((a, b) => (a.date + a.time > b.date + b.time ? -1 : 1));
  const tbl = (l) => (l.length ? `<div class="scroll"><table>${head}<tbody>${l.map(confRow).join('')}</tbody></table></div>` : '<p class="empty">無</p>');

  const trend = (r) => (r.yoyPrev2 != null && r.yoyPrev != null && r.yoy != null ? [r.yoyPrev2, r.yoyPrev, r.yoy].map((v) => Math.round(v) + '%').join(' → ') : '-');
  const revRows = [...members]
    .sort((a, b) => (b.yoy ?? -1e9) - (a.yoy ?? -1e9))
    .map((r) => `<tr><td>${stockLink(r)}</td><td>${esc(r.name)}</td><td>${r.weight ?? '-'}%</td>
<td>${r.amt != null ? (r.amt / 1e5).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '-'}</td>${r.mom == null ? '<td>-</td>' : pctCell(r.mom)}${r.yoy == null ? '<td>-</td>' : pctCell(r.yoy)}${r.cumYoy == null ? '<td>-</td>' : pctCell(r.cumYoy)}
<td>${trend(r)}${r.yoyPrev != null && r.yoy != null ? (r.yoy >= r.yoyPrev ? ' <span class="chip good">加速</span>' : ' <span class="chip bad">放緩</span>') : ''}</td>
<td>${r.close ?? '-'}</td>${r.chg == null ? '<td>-</td>' : pctCell(r.chg)}</tr>`)
    .join('');
  const ym = members.find((r) => r.month);
  return `<h2>0050 成分股：法說會與營收 <span class="count">成分股資料日期 ${asOf || '-'}，共 ${members.length} 檔</span></h2>
<h3>即將召開的法說會 <span class="count">${upcoming.length} 場・紅底為公司自辦（通常公布財報與展望）</span></h3>${tbl(upcoming)}
<details><summary>近 14 天已召開（${recent.length} 場）</summary>${tbl(recent)}</details>
<h3>最新月營收 <span class="count">${ym ? ym.month.slice(0, 3) + ' 年 ' + +ym.month.slice(3) + ' 月' : ''}・依 YoY 由高到低</span></h3>
<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>0050 權重</th><th>營收(億)</th><th>月增</th><th>年增</th><th>累計年增</th><th>YoY 近 3 月</th><th>收盤</th><th>漲跌</th></tr></thead><tbody>${revRows}</tbody></table></div>`;
}

function renderIndustry(x) {
  const P = x.params;
  const pc = (v) => (v == null ? '<td>-</td>' : pctCell(v));
  const leaders = (r) => r.leaders.map((l) => `<a href="https://tw.stock.yahoo.com/quote/${l.code}${l.mkt === '上櫃' ? '.TWO' : '.TW'}" target="_blank">${l.name}</a><span class="${l.chg >= 0 ? 'up' : 'dn'}"> ${l.chg >= 0 ? '+' : ''}${l.chg.toFixed(1)}%</span>`).join('、') || '-';
  const flowCell = (v) => `<td class="${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}</td>`;
  let gid = 0;
  const detail = (r) => `<tr class="det" hidden><td colspan="10"><div class="scroll"><table class="compact inner"><thead><tr><th>股票</th><th>市值(億)</th><th>收盤</th><th>今日</th><th>近5日</th><th>量(張)</th><th>法人(張)</th></tr></thead><tbody>${r.members
    .map((m) => `<tr><td class="nm">${stockLink(m)} ${m.name}${m.mkt === '上櫃' ? '<span class="tag">櫃</span>' : ''}</td><td>${m.cap != null ? Math.round(m.cap).toLocaleString() : '-'}</td><td>${m.close}</td>${pc(m.chg)}${pc(m.r5)}<td>${m.lots.toLocaleString()}</td><td class="${m.inst == null ? '' : m.inst >= 0 ? 'up' : 'dn'}">${m.inst == null ? '-' : (m.inst >= 0 ? '+' : '') + m.inst.toLocaleString()}</td></tr>`)
    .join('')}</tbody></table></div></td></tr>`;
  const row = (r) => `<tr class="grp" title="點一下看全部成分股"><td class="nm"><span class="arrow">▸</span>${r.name}<span class="tag">${r.members.length} 檔</span></td>${pc(r.r1)}<td>${Math.round(r.up * 100)}%</td>${pc(r.prior5)}${pc(r.r5)}${pc(r.r20)}
<td>${r.streak > 0 ? r.streak + ' 天' : '-'}</td><td class="${r.valRatio >= 1.3 ? 'up' : ''}">${r.valRatio ? r.valRatio.toFixed(1) + 'x' : '-'}</td>${flowCell(r.flow)}<td class="nm lead">${leaders(r)}</td></tr>${detail(r)}`;
  const head = '<thead><tr><th>族群</th><th>今日</th><th>上漲家數</th><th>前5日</th><th>近5日</th><th>近20日</th><th>連漲</th><th>成交值比</th><th>法人(億)</th><th>前三大（市值）</th></tr></thead>';
  const table = (l) => (l.length ? `<div class="scroll"><table class="compact">${head}<tbody>${l.map(row).join('')}</tbody></table></div>` : '<p class="empty">今日無</p>');

  const statLine = (t) => {
    const st = x.stats[t];
    return st ? `回測（${st.from.slice(4, 6)}/${st.from.slice(6)} 起，${st.n} 次）：5 日後上漲機率 <b>${f1(st.win)}%</b>、贏大盤 ${f1(st.beat)}%，平均 5 日 <b class="${st.avg >= 0 ? 'up' : 'dn'}">${st.avg >= 0 ? '+' : ''}${st.avg.toFixed(2)}%</b>（同期大盤 ${st.mavg >= 0 ? '+' : ''}${st.mavg.toFixed(2)}%）` : '';
  };
  const md = (d) => +d.slice(4, 6) + '/' + +d.slice(6);
  const trackRows = x.tracking
    .map((sg) => {
      const cells = Array.from({ length: P.HOLD }, (_, k) => (sg.after[k] && sg.after[k].r != null ? pctCell(sg.after[k].r) : '<td class="no">·</td>')).join('');
      const last = sg.after[P.HOLD - 1];
      const res = last && last.r != null ? (last.r > 0 ? '<td class="up"><b>勝</b></td>' : '<td class="dn"><b>敗</b></td>') : `<td class="no">追蹤中 ${sg.after.length}/${P.HOLD}</td>`;
      const beat = last && last.r != null ? (last.r > last.m ? '<td class="up">贏</td>' : '<td class="dn">輸</td>') : '<td class="no">-</td>';
      return `<tr><td>${md(sg.date)}</td><td><span class="chip ${sg.type === '起漲' ? 'hot' : 'good'}">${sg.type}</span></td><td class="nm">${sg.name}</td>${pctCell(sg.r1)}${cells}${res}${beat}</tr>`;
    })
    .join('');

  const tabs = [
    ['ind-start', '今日起漲', x.starts.length, `今日族群漲幅 ≥ ${P.START_MIN}%、贏大盤 ≥ ${P.START_EXCESS} 個百分點、上漲家數 ≥ ${P.START_BREADTH * 100}%，而且前 5 日還沒漲（≤ ${P.START_MAX_PRIOR5}%）。<br>${statLine('起漲')}`, table(x.starts)],
    ['ind-strong', '續強', x.strongs.length, `連續上漲 ≥ ${P.STRONG_STREAK} 天，且近 5 日漲幅贏大盤。依連漲天數、再依 5 日漲幅排序。<br>${statLine('續強')}（剛滿 ${P.STRONG_STREAK} 天那天進場）`, table(x.strongs)],
    ['ind-track', '一週追蹤', x.tracking.length, `近兩週出現的起漲／續強族群，追蹤之後 ${P.HOLD} 個交易日的累計漲跌（產業等權指數）。勝 = 第 ${P.HOLD} 天為正；贏 = 贏過同期大盤。`,
      x.tracking.length ? `<div class="scroll"><table class="compact"><thead><tr><th>訊號日</th><th>類型</th><th>族群</th><th>當日</th>${Array.from({ length: P.HOLD }, (_, k) => `<th>D+${k + 1}</th>`).join('')}<th>結果</th><th>大盤</th></tr></thead><tbody>${trackRows}</tbody></table></div>` : '<p class="empty">無</p>'],
    ['ind-all', '全部族群', x.rows.length, '依今日漲幅排序。族群成分股可在 themes.js 調整。', table(x.rows)],
    ['ind-official', '官方產業別', x.official ? x.official.rows.length : 0, '證交所／櫃買中心的產業分類，依今日漲幅排序。', x.official ? table(x.official.rows) : ''],
  ];
  return `<h2>族群趨勢 <span class="count">大盤（等權）今日 ${x.market.r1 >= 0 ? '+' : ''}${x.market.r1.toFixed(2)}%、近 5 日 ${x.market.r5 >= 0 ? '+' : ''}${x.market.r5.toFixed(2)}%</span></h2>
<p class="hint">點族群名稱可展開全部成分股（依市值排序）。族群漲跌 = 族群內 20 日均量 ≥ ${P.LIQ_LOTS} 張個股的平均漲跌（等權，不會被單一大型股主導）。成交值比 = 今日成交值 ÷ 20 日平均；法人 = 三大法人買賣超金額。</p>
<div class="stabs">${tabs.map(([k, t, n], i) => `<button class="stab${i ? '' : ' on'}" data-s="${k}">${t} <b>${n}</b></button>`).join('')}</div>
${tabs.map(([k, , , desc, html], i) => `<div class="spage" data-s="${k}"${i ? ' hidden' : ''}><p class="hint">${desc}</p>${html}</div>`).join('')}`;
}

function renderLocked({ all, near, params: P, flowFrom }) {
  const ok = (v) => (v ? '<span class="up">✓</span>' : '<span class="no">✗</span>');
  const row = (r) => `<tr><td class="nm">${stockLink(r)} ${r.name}${r.mkt === '上櫃' ? '<span class="tag">櫃</span>' : ''}</td>
<td>${r.close}</td>${pctCell(r.chg)}<td>${r.lots.toLocaleString()}</td>
<td>${r.holderWeeks ? `${r.holderWeeks} 週 <span class="up">+${f2(r.holderPp)}</span>` : '-'}</td>
<td>${r.buyDays}/${P.FLOW_DAYS} 天</td><td class="up"><b>${f1(r.conc)}%</b></td><td class="${r.netLots >= 0 ? 'up' : 'dn'}">${r.netLots >= 0 ? '+' : ''}${r.netLots.toLocaleString()}</td>
<td class="${r.marginChg == null ? '' : r.marginChg < 0 ? 'dn' : 'up'}">${r.marginChg == null ? '-' : (r.marginChg >= 0 ? '+' : '') + f1(r.marginChg) + '%'}</td>${pctCell(r.run20)}
<td class="ck">${ok(r.okHolder)}${ok(r.okFlow)}${ok(r.okMargin)}${ok(r.okPrice)}</td>${chipsOf(r)}</tr>`;
  const head = '<thead><tr><th>股票</th><th>收盤</th><th>漲跌</th><th>量(張)</th><th>千張大戶</th><th>法人買超</th><th>籌碼集中度</th><th>法人淨買(張)</th><th>融資5日</th><th>近20日</th><th title="大戶／法人／融資／股價">條件</th><th>基本面</th></tr></thead>';
  const table = (l) => (l.length ? `<div class="scroll"><table class="compact">${head}<tbody>${l.map(row).join('')}</tbody></table></div>` : '<p class="empty">今日無</p>');
  const tabs = [
    ['lock-all', '四項全符合', all.length, table(all)],
    ['lock-near', '符合三項', near.length, table(near)],
  ];
  return `<h2>主力鎖碼股 <span class="count">依籌碼集中度排序</span></h2>
<div class="rules">① 千張大戶持股連續增加 ≥ ${P.HOLDER_WEEKS} 週（集保）　② 近 ${P.FLOW_DAYS} 個交易日外資＋投信買超 ≥ ${P.FLOW_BUY_DAYS} 天，且累計買超 ≥ 期間成交量 ${P.CONCENTRATION}%（籌碼集中）　③ 融資餘額比 ${P.MARGIN_DAYS} 天前減少（散戶退場）　④ 股價站上月線、近 20 日漲幅 ≤ ${P.MAX_RUN20}%（還沒噴完）　⑤ 當日量 ≥ ${MIN_LOTS_ALL.toLocaleString()} 張</div>
<p class="hint">「籌碼集中度」＝ 外資＋投信近 ${P.FLOW_DAYS} 日累計淨買超 ÷ 同期成交量。條件欄依序為 大戶／法人／融資／股價。②為必要條件；券商分點（真正的主力進出）有驗證碼無法自動取得，這裡用法人與大戶持股代替。</p>
<div class="stabs">${tabs.map(([k, t, n], i) => `<button class="stab${i ? '' : ' on'}" data-s="${k}">${t} <b>${n}</b></button>`).join('')}</div>
${tabs.map(([k, , , html], i) => `<div class="spage" data-s="${k}"${i ? ' hidden' : ''}>${html}</div>`).join('')}`;
}

function renderActiveEtf(x) {
  const md = (d) => (d ? `${+d.slice(4, 6)}/${+d.slice(6)}` : '-');
  const link = (c) => `https://tw.stock.yahoo.com/quote/${c}/technical-analysis`;
  const amt = (v) => (v == null ? '-' : `<span class="${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '+' : ''}${v.toFixed(2)} 億</span>`);
  const tag = { 新進: 'good', 加碼: 'good', 減碼: 'bad', 出清: 'bad' };
  const groupTable = (list, side) =>
    list.length
      ? `<div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>${side === 'buy' ? '加碼' : '減碼'}的 ETF</th><th>合計金額（估）</th></tr></thead><tbody>${list
          .slice(0, 10)
          .map((g) => `<tr><td class="nm"><a href="${link(g.code)}" target="_blank">${g.code}</a> ${g.name}</td><td>${(side === 'buy' ? g.buy : g.sell).length} 檔：${(side === 'buy' ? g.buy : g.sell).join('、')}</td><td>${amt(g.amt)}</td></tr>`)
          .join('')}</tbody></table></div>`
      : '<p class="empty">今日無</p>';
  const chgTable = (list) =>
    list.length
      ? `<div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>動作</th><th>張數</th><th>金額（估）</th><th>權重</th></tr></thead><tbody>${list
          .slice(0, 8)
          .map((c) => `<tr><td class="nm"><a href="${link(c.code)}" target="_blank">${c.code}</a> ${c.name}</td><td><span class="chip ${tag[c.type]}">${c.type}</span></td><td class="${c.lots >= 0 ? 'up' : 'dn'}">${c.lots >= 0 ? '+' : ''}${c.lots.toLocaleString()}</td><td>${amt(c.amt)}</td><td>${f2(c.weightPrev)}% → ${f2(c.weight)}%</td></tr>`)
          .join('')}</tbody></table></div>`
      : '<p class="empty">無</p>';
  const cards = x.etfs
    .map((e) => `<h3>${e.code} ${e.name} <span class="count">規模 ${e.scale ? Math.round(e.scale / 1e8).toLocaleString() + ' 億' : '-'}・持股 ${e.n} 檔・${e.prevDate ? md(e.prevDate) + ' → ' + md(e.date) : md(e.date) + '（明天開始比較）'}</span></h3>
${e.prevDate ? `<div class="cols"><div><div class="aetf-h up">▲ 加碼／新進</div>${chgTable(e.buys)}</div><div><div class="aetf-h dn">▼ 減碼／出清</div>${chgTable(e.sells)}</div></div>` : ''}
<details class="more"><summary>前十大持股</summary><div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>權重</th><th>張數</th></tr></thead><tbody>${e.top.map((r) => `<tr><td class="nm">${r.code} ${r.name}</td><td>${f2(r.weight)}%</td><td>${Math.round(r.shares / 1000).toLocaleString()}</td></tr>`).join('')}</tbody></table></div></details>`)
    .join('');
  return `<h2>主動式 ETF 加碼／減碼 <span class="count">規模最大的 ${x.etfs.length} 檔・各投信每日公告的持股清單</span></h2>
<p class="hint">比較每檔 ETF 最近兩天公告的持股張數：多了＝加碼（原本沒有＝新進），少了＝減碼（全部賣光＝出清）。金額＝張數變化 × 最近收盤價，為估算值。各投信公告時間不同（約傍晚到隔天早上），所以資料日可能差一天。</p>
<div class="cols"><div><h3>🔥 同步加碼 <span class="count">2 檔以上 ETF 一起買</span></h3>${groupTable(x.consensusBuy, 'buy')}</div><div><h3>🧊 同步減碼 <span class="count">2 檔以上 ETF 一起賣</span></h3>${groupTable(x.consensusSell, 'sell')}</div></div>
<div class="cols"><div><h3>合計買超金額 Top 10</h3>${groupTable(x.netBuy, 'buy')}</div><div><h3>合計賣超金額 Top 10</h3>${groupTable(x.netSell, 'sell')}</div></div>
<h2>各檔 ETF 明細</h2>
${cards}`;
}

function renderHolders({ rows }) {
  const table = (mkt) => {
    const list = rows.filter((r) => r.mkt === mkt);
    const tr = list
      .map((r) => `<tr><td>${stockLink(r)}</td><td>${r.name}</td><td class="up"><b>${r.streak} 週</b></td><td>${f2(r.pct)}%</td><td class="up">+${f2(r.pctChg)}</td></tr>`)
      .join('');
    return `<h2>${mkt} <span class="count">${list.length} 檔</span></h2>
${list.length ? `<div class="scroll"><table class="stats"><thead><tr><th>代號</th><th>名稱</th><th>連續增加</th><th>千張大戶持股</th><th>增加（百分點）</th></tr></thead><tbody>${tr}</tbody></table></div>` : '<p class="empty">無</p>'}`;
  };
  return `<h2>上市上櫃千張大戶持續增加的股票 <span class="count">成交量 ≥ ${MIN_LOTS_ALL.toLocaleString()} 張</span></h2>${table('上市')}${table('上櫃')}`;
}

function spark(vals, w = 110, h = 30) {
  const v = vals.filter((x) => x != null);
  if (v.length < 2) return '';
  const lo = Math.min(...v), hi = Math.max(...v), k = (hi - lo) || 1;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * w).toFixed(1)},${(h - 2 - ((x - lo) / k) * (h - 4)).toFixed(1)}`).join(' ');
  const cls = v[v.length - 1] >= v[0] ? 'up' : 'dn';
  return `<svg class="spark ${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
}

// 報價表：最新、1 日、1 週、1 個月、今年、近 3 個月走勢
function assetTable(assets, digits = 2) {
  const chgAt = (pts, days) => {
    if (pts.length < 2) return null;
    const last = pts[pts.length - 1];
    const t = last[0] - days * 86400000;
    let i = pts.length - 1;
    while (i > 0 && pts[i][0] > t) i--;
    return (last[1] / pts[i][1] - 1) * 100;
  };
  const ytd = (pts) => {
    const y = new Date(pts[pts.length - 1][0]).getUTCFullYear();
    const i = pts.findIndex((p) => new Date(p[0]).getUTCFullYear() === y);
    return i > 0 ? (pts[pts.length - 1][1] / pts[i - 1][1] - 1) * 100 : null;
  };
  const cell = (v) => (v == null ? '<td>-</td>' : pctCell(v));
  const rows = assets
    .filter((a) => a.pts.length)
    .map((a) => {
      const p = a.pts;
      return `<tr><td>${a.name}</td><td><b>${p[p.length - 1][1].toLocaleString(undefined, { maximumFractionDigits: digits })}</b>${a.unit && a.unit !== '點' ? `<span class="tag">${a.unit}</span>` : ''}</td>${cell(chgAt(p, 1))}${cell(chgAt(p, 7))}${cell(chgAt(p, 30))}${cell(ytd(p))}<td>${spark(p.slice(-66).map((x) => x[1]))}</td></tr>`;
    })
    .join('');
  return `<div class="scroll"><table class="stats"><thead><tr><th>項目</th><th>最新</th><th>1 日</th><th>1 週</th><th>1 個月</th><th>今年</th><th>近 3 個月</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

const twTimeOf = (ms) => new Date(ms).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

// TradingView 即時報價：切到該分頁時才載入
const tvBox = (symbols) => `<div class="tv-live" data-symbols='${JSON.stringify(symbols).replace(/'/g, '&#39;')}'></div>`;

// 頁面最上方置頂：加權、台指期、日經、KOSPI、費半
// 投票：明天漲最多的族群（填空）＋看多看空（按鈕），資料存在 Cloudflare
function renderVote(dateLabel, extra) {
  const date = dateLabel.replace(/\//g, '');
  const groupNames = Object.keys(THEMES);
  const officialNames = ((extra.industry && extra.industry.official && extra.industry.official.rows.map((r) => r.name)) || []).filter((n) => !groupNames.includes(n));
  const rc = extra.voteRecap;
  let recap = '';
  if (rc) {
    const sign = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
    const bullRight = rc.twPct == null ? '' : (rc.bullPct >= 50) === (rc.twPct >= 0) ? '，<b class="up">多數人猜對方向</b>' : '，<b class="dn">多數人猜錯方向</b>';
    const themeLine = rc.top ? `；最多人看好「${esc(rc.top.name)}」${rc.top.r1 == null ? '' : `，實際 <b class="${rc.top.r1 >= 0 ? 'up' : 'dn'}">${sign(rc.top.r1)}</b>`}` : '';
    recap = `<div class="vote-recap">📊 上次投票（${+rc.date.slice(4, 6)}/${+rc.date.slice(6)}）：看多 ${rc.bullPct.toFixed(0)}%${rc.twPct == null ? '' : `，加權實際 <b class="${rc.twPct >= 0 ? 'up' : 'dn'}">${sign(rc.twPct)}</b>`}${bullRight}${themeLine}</div>`;
  }
  return `<div class="vote" data-date="${date}">
<div class="vote-title">🗳️ 明天怎麼走？大家來猜 <span class="tag">每人每天一票，可改票・猜中可得分，排行榜在「個人檔案」</span></div>
<form class="vote-form">
  <label class="vote-theme">明天漲最多的族群：<select name="theme"><option value="">（選擇族群，可不選）</option><optgroup label="細分族群">${groupNames.map((n) => `<option>${esc(n)}</option>`).join('')}</optgroup>${officialNames.length ? `<optgroup label="官方產業別">${officialNames.map((n) => `<option>${esc(n)}</option>`).join('')}</optgroup>` : ''}</select></label>
  <div class="vote-btns"><button type="button" data-bias="bull">🐂 看多</button><button type="button" data-bias="bear">🐻 看空</button></div>
  <button type="button" class="vote-save" disabled>🔒 鎖定投票</button>
  <div class="vote-saved" hidden></div>
</form>
<div class="lock-card vote-lock"><div class="lock-row"><span class="lock-ic">🔒</span><div><b>登入 Google 才能投票</b><div class="lock-sub">猜明天漲跌和最強族群，猜中得分、上排行榜，開獎還會推播你的得分</div></div></div><div class="gsi-lock"></div></div>
<div class="vote-result" hidden></div>
<div class="vote-msg"></div>
${recap}
</div>
<script>
(function () {
  var API = '${VOTE_API}';
  var box = document.querySelector('.vote');
  if (!box) return;
  var date = box.dataset.date, form = box.querySelector('.vote-form'), res = box.querySelector('.vote-result'), msg = box.querySelector('.vote-msg');
  var vid = null;
  try { vid = localStorage.getItem('shoupan_vid'); if (!vid) { vid = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem('shoupan_vid', vid); } } catch (e) { vid = 'anon-' + String(Math.random()).slice(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function show(p) {
    if (!p || !p.total) return;
    var bull = Math.round(p.bull / p.total * 100), bear = 100 - bull;
    var themes = (p.themes || []).slice(0, 5).map(function (t, i) { return '<li><b>' + (i + 1) + '.</b> ' + esc(t.theme) + '</li>'; }).join('');
    res.innerHTML = '<div class="vote-bar"><span class="b-bull" style="width:' + bull + '%">🐂 看多 ' + bull + '%</span><span class="b-bear" style="width:' + bear + '%">🐻 看空 ' + bear + '%</span></div>' +
      '<div class="vote-sub">' + (p.mine ? '你投了「' + (p.mine.bias === 'bull' ? '看多' : '看空') + (p.mine.theme ? '／' + esc(p.mine.theme) : '') + '」' : '') + '</div>' +
      (themes ? '<div class="vote-sub">大家看好的族群：</div><ol class="vote-themes">' + themes + '</ol>' : '');
    res.hidden = false;
    if (p.mine && typeof setSaved === 'function') setSaved(p.mine);
  }
  function authH() { try { var t = localStorage.getItem('shoupan_token'); return t ? { headers: { Authorization: 'Bearer ' + t } } : {}; } catch (e) { return {}; } }
  function pct(v) { return '<b class="' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '+' : '') + v.toFixed(2) + '%</b>'; }
  // 開盤後截止投票；13:35 收盤開獎後直接在這裡公布結果
  function closedView(p) {
    form.hidden = true;
    var r = p.result;
    if (!r) { msg.innerHTML = '⏰ 投票已截止（開盤後不能再投），<b>今天 13:35 收盤後開獎</b>，14:00 開放投下一個交易日'; if (p.total) show(p); return; }
    var nd = r.next ? (+r.next.slice(4, 6)) + '/' + (+r.next.slice(6)) : '';
    var medal = ['🥇', '🥈', '🥉'];
    var top = r.top3.map(function (t, i) { return medal[i] + ' ' + esc(t) + ' ' + (r.themes[t] != null ? pct(r.themes[t]) : ''); }).join('　');
    var crowd = '';
    if (p.total) {
      var bull = Math.round(p.bull / p.total * 100), ok = (bull >= 50) === (r.tw >= 0);
      crowd = '<div class="vp-row">大家看多 ' + bull + '%，多數人<b class="' + (ok ? 'up' : 'dn') + '">' + (ok ? '猜對方向' : '猜錯方向') + '</b>';
      var fav = p.themes && p.themes[0];
      if (fav && r.themes[fav.theme] != null) crowd += '；最多人看好「' + esc(fav.theme) + '」實際 ' + pct(r.themes[fav.theme]);
      crowd += '</div>';
    }
    var me = '';
    if (p.mine && p.myScore) {
      var s = p.myScore;
      me = '<div class="vp-me">你投「' + (p.mine.bias === 'bull' ? '看多' : '看空') + (p.mine.theme ? '／' + esc(p.mine.theme) : '') + '」：方向 ' + (s.dirOk ? '✅ +1' : '❌ 0') +
        (p.mine.theme ? '、族群 ' + (s.themePts === 3 ? '🏆 前三強 +3' : s.themePts === 1 ? '✅ 漲贏大盤 +1' : '❌ 0') + (s.themeR != null ? '（' + pct(s.themeR) + '）' : '') : '') +
        ' → 這次得 <b>' + s.pts + ' 分</b></div>';
    } else me = '<div class="vp-me">你這次沒有投票，14:00 起可以投下一個交易日</div>';
    res.innerHTML = '<div class="vote-prize"><div class="vp-title">🎉 開獎！' + nd + ' 收盤結果</div><div class="vp-row">加權指數 ' + pct(r.tw) + '</div><div class="vp-row">今天最強族群：' + top + '</div>' + crowd + me + '</div>';
    res.hidden = false;
    msg.textContent = '14:00 開放投下一個交易日・排行榜在「個人檔案」';
  }
  function load() { fetch(API + '/api/poll?date=' + date + '&vid=' + encodeURIComponent(vid), authH()).then(function (r) { return r.json(); }).then(function (p) { if (p.closed) closedView(p); else if (p.mine) show(p); }).catch(function () {}); }
  // 先選看多／看空和族群，按「鎖定投票」才送出；09:00 開盤前都可以改
  var bias = null, saved = null;
  var saveBtn = box.querySelector('.vote-save'), savedBox = box.querySelector('.vote-saved');
  function label(b, t) { return (b === 'bull' ? '🐂 看多' : '🐻 看空') + (t ? '／' + esc(t) : ''); }
  function dirty() {
    var t = form.theme.value.trim();
    var changed = !saved || saved.bias !== bias || (saved.theme || '') !== t;
    saveBtn.disabled = !bias || !changed;
    saveBtn.textContent = !bias ? '🔒 鎖定投票（先選看多或看空）' : changed ? (saved ? '🔒 儲存修改' : '🔒 鎖定投票') : '✅ 已鎖定';
    if (saved && changed) msg.textContent = '有修改還沒儲存，記得按「儲存修改」';
    else if (!saved && bias) msg.textContent = '選好了嗎？按「鎖定投票」才算數';
    else if (!saved) msg.textContent = '';
  }
  function setSaved(m) {
    saved = m; bias = m ? m.bias : bias;
    box.querySelectorAll('[data-bias]').forEach(function (b) { b.classList.toggle('on', b.dataset.bias === bias); });
    if (m) { form.theme.value = m.theme || ''; savedBox.innerHTML = '✅ 你已鎖定：<b>' + label(m.bias, m.theme) + '</b>　明天 09:00 開盤前都可以改'; savedBox.hidden = false; msg.textContent = ''; }
    dirty();
  }
  box.querySelectorAll('[data-bias]').forEach(function (btn) {
    btn.onclick = function () {
      bias = btn.dataset.bias;
      box.querySelectorAll('[data-bias]').forEach(function (b) { b.classList.toggle('on', b === btn); });
      dirty();
    };
  });
  form.theme.addEventListener('change', dirty);
  saveBtn.onclick = function () {
    if (!bias) return;
    saveBtn.disabled = true; saveBtn.textContent = '儲存中…';
    var theme = form.theme.value.trim();
    fetch(API + '/api/vote', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, (function () { try { var t = localStorage.getItem('shoupan_token'); return t ? { Authorization: 'Bearer ' + t } : {}; } catch (e) { return {}; } })()), body: JSON.stringify({ date: date, vid: vid, theme: theme, bias: bias }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) { msg.textContent = j.error; dirty(); return; }
        setSaved({ bias: bias, theme: theme });
        if (window.__reloadProfile) window.__reloadProfile(); // 「我的戰績」馬上多一筆
        return fetch(API + '/api/poll?date=' + date + '&vid=' + encodeURIComponent(vid), authH()).then(function (r) { return r.json(); }).then(show);
      })
      .catch(function () { msg.textContent = '連線失敗，請稍後再試'; dirty(); });
  };
  dirty();
  load();
})();
</script>`;
}

// 自選股：沒登入存在這台裝置；登入後存在雲端，手機電腦同步
function renderProfile() {
  const accents = [['red', '紅', '#d0312d'], ['gold', '芥末金', '#c98a1e'], ['blue', '藍', '#2563eb'], ['green', '綠', '#16a34a'], ['purple', '紫', '#7c3aed'], ['black', '黑', '#222']];
  return `<div class="lock-card pf-lock"><div class="lock-ic big">🔒</div><h3>登入 Google 才能使用個人檔案</h3><p>登入後可以設定暱稱和主題色、查看投票紀錄與排行榜、開啟開盤／收盤推播通知，自選股也會雲端同步。</p><div class="gsi-lock"></div><div class="lock-sub">只會取得你的名字、信箱與大頭照，排行榜只顯示暱稱</div></div>
<div class="pf-head"><img class="pf-pic" alt=""><div><div class="pf-name">情報員</div><div class="pf-mail hint"></div></div></div>
<h2>設定</h2>
<div class="pf-set">
  <label>暱稱（排行榜顯示）<input class="pf-nick" maxlength="12" placeholder="例如 PCB 獵人"></label><div class="pf-nick-hint hint"></div>
  <div><div class="pf-label">主題色</div><div class="pf-accents">${accents.map(([k, t, c]) => `<button type="button" data-accent="${k}" style="--c:${c}"><span></span>${t}</button>`).join('')}</div></div>
  <div><div class="pf-label">外觀</div><div class="pf-themes"><button type="button" data-theme="">跟隨系統</button><button type="button" data-theme="light">淺色</button><button type="button" data-theme="dark">深色</button></div></div>
  <div><button type="button" class="pf-save">儲存設定</button> <span class="pf-msg hint"></span></div>
</div>
<h2>我的戰績</h2>
<div class="pf-stats"></div>
<div class="pf-votes"></div>
<h2>排行榜 <span class="count">猜對大盤方向 +1；押的族群隔天是前 3 強 +3，或漲贏大盤 +1</span></h2>
<div class="stabs pf-periods"><button class="stab on" data-period="week">本週</button><button class="stab" data-period="month">本月</button><button class="stab" data-period="all">總排行</button></div>
<div class="pf-board"></div>
<div class="pf-admin" hidden></div>
<p style="margin-top:22px"><button type="button" class="pf-logout">登出</button></p>`;
}

function renderWatch() {
  return `<div class="lock-card pf-lock"><div class="lock-ic big">🔒</div><h3>登入 Google 才能使用自選股</h3><p>登入後可以把看好的股票加入自選股，依族群自動分組、用 EPS × 本益比算合理價（附外資預估），換手機或電腦也會雲端同步。</p><div class="gsi-lock"></div><div class="lock-sub">只會取得你的名字、信箱與大頭照</div></div>
<h2>自選觀察股 <span class="count watch-where">存在這台裝置</span></h2>
<form class="watch-add" onsubmit="return false">
  <input class="watch-input" list="watch-stocks" placeholder="輸入代號或名稱，例如 2330 或 台積電" autocomplete="off">
  <datalist id="watch-stocks"></datalist>
  <button type="submit">＋ 加入</button>
</form>
<div class="watch-msg hint"></div>
<div class="watch-table"></div>
<div class="home">
  <button class="home-open" type="button">🏠 幫我回家（回報分類錯誤）</button>
  <form class="home-form" hidden onsubmit="return false">
    <p class="hint">發現股票被放錯族群？告訴我們它應該在哪，審核通過後隔天就會搬家。</p>
    <label>股票：<input class="home-stock" list="watch-stocks" placeholder="代號或名稱" autocomplete="off"></label>
    <span class="home-current hint"></span>
    <label>應該在：<input class="home-suggest" list="home-themes" maxlength="20" placeholder="例如 封裝測試" autocomplete="off"></label>
    <datalist id="home-themes">${Object.keys(THEMES).map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <label>補充說明（選填）：<input class="home-note" maxlength="200" placeholder="例如 主要營收來自 DDI 封測"></label>
    <div><button type="submit">送出回報</button> <span class="home-msg hint"></span></div>
  </form>
</div>
<div class="home-admin" hidden></div>
<h2>EPS × 本益比 試算 <span class="count">合理價 ＝ EPS × 本益比倍數</span></h2>
<div class="calc-ctl">
  <div><div class="pf-label">本益比倍數</div><div class="calc-pes">${[10, 12, 15, 20, 25, 30].map((n) => `<button type="button" data-pe="${n}">${n} 倍</button>`).join('')}<input class="calc-pe" type="number" min="1" max="200" step="0.5" value="15"> 倍</div></div>
  <div><div class="pf-label">EPS 用哪個</div><div class="calc-basis"><button type="button" data-b="e4">近四季</button><button type="button" data-b="e0">外資預估今年</button><button type="button" data-b="e1">外資預估明年</button></div></div>
</div>
<div class="calc-table"></div>
<p class="hint">近四季 EPS ＝ 收盤價 ÷ 目前本益比（證交所、櫃買中心）。外資預估為分析師共識（多為外資券商，來源 Yahoo Finance），每天更新一次；剛加入自選股的股票，隔天才會有預估。外資目標價為各家平均。試算結果僅供參考，不構成投資建議。</p>
<p class="hint">標籤代表這檔股票今天出現在哪些名單裡。登入 Google 帳號後，自選股會存在雲端，手機和電腦同步；沒登入則只存在目前這台裝置的瀏覽器。</p>`;
}

// 登入與自選股的前端程式（每頁共用）
function clientScript() {
  return `<script src="https://accounts.google.com/gsi/client" async></script>
<script>
(function () {
  var API = '${VOTE_API}';
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var token = LS.get('shoupan_token');
  var user = null;
  try { user = JSON.parse(LS.get('shoupan_user') || 'null'); } catch (e) {}
  var stocks = null, codes = [];
  try { codes = JSON.parse(LS.get('shoupan_watch') || '[]'); } catch (e) { codes = []; }
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function api(path, opt) { opt = opt || {}; opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {}, token ? { Authorization: 'Bearer ' + token } : {}); return fetch(API + path, opt).then(function (r) { return r.json().then(function (j) { if (r.status === 401) { logoutLocal(); } return j; }); }); }

  // ---- 登入 ----
  function showUser() {
    var u = $('.auth-user'), out = $('.auth-out'), gb = $('#gsi-btn');
    if (user && token) { u.innerHTML = (user.picture ? '<img src="' + esc(user.picture) + '" alt="">' : '') + esc(user.name || user.email); u.hidden = false; out.hidden = false; gb.style.display = 'none'; }
    else { u.hidden = true; out.hidden = true; gb.style.display = ''; }
    var guest = false; try { guest = !!localStorage.getItem('shoupan_guest'); } catch (e) {}
    document.documentElement.classList.toggle('anon', !(user && token));
    document.documentElement.classList.toggle('gated', !(user && token) && !guest);
    var w = $('.watch-where'); if (w) w.textContent = token ? '已登入，雲端同步' : '存在這台裝置（登入可同步）';
  }
  // 訪客統計：每台裝置每天記一次（只看介紹頁 < 訪客 < 會員），不記錄個人資料
  window.__track = function (kind) {
    var vid = LS.get('shoupan_vid'); if (!vid) { vid = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); LS.set('shoupan_vid', vid); }
    try { fetch(API + '/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: vid, kind: kind }), keepalive: true }); } catch (e) {}
  };
  window.__track(token ? 'member' : LS.get('shoupan_guest') ? 'guest' : 'landing');
  function logoutLocal() { token = null; user = null; LS.del('shoupan_token'); LS.del('shoupan_user'); LS.del('shoupan_guest'); showUser(); }
  window.__shoupanLogin = function (resp) {
    api('/api/login', { method: 'POST', body: JSON.stringify({ credential: resp.credential }) }).then(function (j) {
      if (j.error) { $('.auth-note').textContent = j.error; var ge = $('.gate-err'); if (ge) ge.textContent = j.error; return; }
      window.__track('member');
      token = j.token; user = j.user; LS.set('shoupan_token', token); LS.set('shoupan_user', JSON.stringify(user)); showUser(); loadAdmin(); loadProfile(); loadBoard('week');
      // 把這台裝置的自選股合併到雲端
      api('/api/watchlist').then(function (w) { var merged = (w.codes || []).concat(codes.filter(function (c) { return (w.codes || []).indexOf(c) < 0; })); codes = merged; saveCodes(); renderWatch(); });
    });
  };
  $('.auth-out').onclick = function () { api('/api/logout', { method: 'POST' }).finally(logoutLocal); };
  function initGoogle() {
    fetch(API + '/api/config').then(function (r) { return r.json(); }).then(function (c) {
      if (!c.googleClientId) { $('.auth-note').textContent = '登入功能設定中'; return; }
      var tries = 0;
      (function wait() {
        if (!(window.google && google.accounts && google.accounts.id)) { if (tries++ < 50) return setTimeout(wait, 200); return; }
        google.accounts.id.initialize({ client_id: c.googleClientId, callback: window.__shoupanLogin });
        google.accounts.id.renderButton($('#gsi-btn'), { theme: 'outline', size: 'medium', text: 'signin', shape: 'pill', locale: 'zh-TW' });
        if ($('#gsi-gate')) google.accounts.id.renderButton($('#gsi-gate'), { theme: 'filled_blue', size: 'large', text: 'signup_with', shape: 'pill', locale: 'zh-TW', width: 280 });
        // 訪客看到的「登入才能用」鎖定卡片裡的 Google 按鈕
        document.querySelectorAll('.gsi-lock').forEach(function (el) { google.accounts.id.renderButton(el, { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', locale: 'zh-TW', width: 260 }); });
        if (!token) google.accounts.id.prompt();
      })();
    }).catch(function () {});
  }

  // ---- 自選股 ----
  function saveCodes() { LS.set('shoupan_watch', JSON.stringify(codes)); if (token) api('/api/watchlist', { method: 'PUT', body: JSON.stringify({ codes: codes }) }); }
  function pc(v) { return v == null ? '<td>-</td>' : '<td class="' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '+' : '') + v + '%</td>'; }
  function renderWatch() {
    var box = $('.watch-table'); if (!box) return;
    if (!stocks) { box.innerHTML = '<p class="empty">載入中…</p>'; return; }
    if (!codes.length) { box.innerHTML = '<p class="empty">還沒有自選股，從上面輸入代號或名稱加入</p>'; return; }
    function row(c) {
      var s = stocks.list[c];
      if (!s) return '<tr><td class="nm">' + esc(c) + '</td><td colspan="7" class="no">今日無資料</td><td><button class="watch-del" data-c="' + esc(c) + '">✕</button></td></tr>';
      var link = 'https://tw.stock.yahoo.com/quote/' + c + (s.m ? '.TWO' : '.TW') + '/technical-analysis';
      // 一K站三線、★選股是「當天」的訊號：資料不是今天的（例如隔天早上還沒更新）就不顯示
      var fresh = stocks.date === new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
      var tags = s.t.filter(function (t) { return fresh || (t !== '一K站三線' && t !== '★選股'); }).map(function (t) { return '<span class="chip good">' + esc(t) + '</span>'; }).join('');
      return '<tr><td class="nm"><a href="' + link + '" target="_blank">' + c + '</a> ' + esc(s.n) + (s.m ? '<span class="tag">櫃</span>' : '') + '</td><td>' + s.c + '</td>' + pc(s.p) + pc(s.r5) + pc(s.r20) + '<td>' + (s.v || 0).toLocaleString() + '</td>' + pc(s.y) +
        '<td class="chips">' + (tags || '<span class="chip mid">無</span>') + '</td><td><button class="watch-del" data-c="' + c + '" title="移除">✕</button></td></tr>';
    }
    // 依族群分組（族群優先，沒有族群的用官方產業），只列有自選股的組
    var groups = {}, order = [];
    codes.forEach(function (c) {
      var s = stocks.list[c];
      var g = s ? (s.i || '其他').split('、')[0] : '查無資料';
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(c);
    });
    var body = order.map(function (g) {
      var list = groups[g];
      var ps = list.map(function (c) { return stocks.list[c] && stocks.list[c].p; }).filter(function (v) { return v != null; });
      var avg = ps.length ? ps.reduce(function (a, b) { return a + b; }, 0) / ps.length : null;
      return '<tr class="watch-gh"><td colspan="9">' + esc(g) + '<span class="tag">' + list.length + ' 檔</span>' + (avg == null ? '' : ' <span class="' + (avg >= 0 ? 'up' : 'dn') + '">平均 ' + (avg >= 0 ? '+' : '') + avg.toFixed(2) + '%</span>') + '</td></tr>' + list.map(row).join('');
    }).join('');
    box.innerHTML = '<div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>收盤</th><th>今日</th><th>近5日</th><th>近20日</th><th>量(張)</th><th>營收YoY</th><th>今日名單</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>';
    if (typeof renderCalc === 'function') renderCalc();
    box.querySelectorAll('.watch-del').forEach(function (b) { b.onclick = function () { codes = codes.filter(function (x) { return x !== b.dataset.c; }); saveCodes(); renderWatch(); }; });
  }
  var form = $('.watch-add');
  if (form) form.onsubmit = function () {
    var v = $('.watch-input').value.trim(); if (!v || !stocks) return false;
    var code = (v.match(/^\\d{4,6}/) || [])[0];
    if (!code) { for (var k in stocks.list) if (stocks.list[k].n === v) { code = k; break; } }
    if (!code || !stocks.list[code]) { $('.watch-msg').textContent = '找不到「' + v + '」'; return false; }
    if (codes.indexOf(code) < 0) codes.unshift(code);
    $('.watch-input').value = ''; $('.watch-msg').textContent = '已加入 ' + code + ' ' + stocks.list[code].n;
    saveCodes(); renderWatch(); return false;
  };
  fetch('/TW-STOCK-/stocks.json').then(function (r) { return r.json(); }).then(function (j) {
    stocks = j;
    var dl = $('#watch-stocks');
    if (dl) dl.innerHTML = Object.keys(j.list).map(function (c) { return '<option value="' + c + ' ' + esc(j.list[c].n) + '">'; }).join('');
    renderWatch();
  }).catch(function () { var b = $('.watch-table'); if (b) b.innerHTML = '<p class="empty">個股資料載入失敗</p>'; });
  // ---- EPS × 本益比 試算 ----
  var calc = { pe: 15, basis: 'e4' };
  try { var cs = JSON.parse(LS.get('shoupan_calc') || '{}'); if (cs.pe) calc.pe = cs.pe; if (cs.basis) calc.basis = cs.basis; } catch (e) {}
  function fmtN(v, d) { return v == null ? '-' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d == null ? 2 : d }); }
  function upCell(target, price) { if (target == null || !price) return '<td>-</td>'; var u = (target / price - 1) * 100; return '<td class="' + (u >= 0 ? 'up' : 'dn') + '">' + (u >= 0 ? '+' : '') + u.toFixed(1) + '%</td>'; }
  function renderCalc() {
    var box = $('.calc-table'); if (!box) return;
    LS.set('shoupan_calc', JSON.stringify(calc));
    var inp = $('.calc-pe'); if (inp && +inp.value !== calc.pe) inp.value = calc.pe;
    document.querySelectorAll('.calc-pes button').forEach(function (b) { b.classList.toggle('on', +b.dataset.pe === calc.pe); });
    document.querySelectorAll('.calc-basis button').forEach(function (b) { b.classList.toggle('on', b.dataset.b === calc.basis); });
    if (!stocks || !codes.length) { box.innerHTML = '<p class="empty">先在上面加入自選股</p>'; return; }
    var label = { e4: '近四季', e0: '今年預估', e1: '明年預估' }[calc.basis];
    var rows = codes.map(function (c) {
      var s = stocks.list[c]; if (!s) return '';
      var es = s.es || {};
      var eps = calc.basis === 'e4' ? s.e4 : es[calc.basis];
      var fair = eps != null ? eps * calc.pe : null;
      var link = 'https://tw.stock.yahoo.com/quote/' + c + (s.m ? '.TWO' : '.TW');
      return '<tr><td class="nm"><a href="' + link + '" target="_blank">' + c + '</a> ' + esc(s.n) + '</td><td>' + s.c + '</td><td>' + fmtN(s.pe, 1) + '</td><td>' + fmtN(s.e4) + '</td><td>' + fmtN(es.e0) + '</td><td>' + fmtN(es.e1) + (es.n ? '<span class="tag">' + es.n + '家</span>' : '') + '</td>' +
        '<td class="calc-fair"><b>' + fmtN(fair, 1) + '</b></td>' + upCell(fair, s.c) + '<td>' + fmtN(es.tp, 1) + (es.tpN ? '<span class="tag">' + es.tpN + '家</span>' : '') + '</td>' + upCell(es.tp, s.c) + '</tr>';
    }).join('');
    box.innerHTML = '<div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>收盤</th><th>目前本益比</th><th>近四季EPS</th><th>外資今年EPS</th><th>外資明年EPS</th><th>合理價（' + label + '×' + calc.pe + '倍）</th><th>空間</th><th>外資目標價</th><th>空間</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  document.querySelectorAll('.calc-pes button').forEach(function (b) { b.onclick = function () { calc.pe = +b.dataset.pe; renderCalc(); }; });
  document.querySelectorAll('.calc-basis button').forEach(function (b) { b.onclick = function () { calc.basis = b.dataset.b; renderCalc(); }; });
  var peIn = $('.calc-pe'); if (peIn) peIn.oninput = function () { var v = parseFloat(peIn.value); if (v > 0) { calc.pe = v; renderCalc(); } };

  // ---- 幫我回家 ----
  function stockOf(v) {
    if (!stocks || !v) return null;
    var code = (v.match(/^\\d{4,6}/) || [])[0];
    if (!code) for (var k in stocks.list) if (stocks.list[k].n === v) { code = k; break; }
    return code && stocks.list[code] ? { code: code, s: stocks.list[code] } : null;
  }
  var hOpen = $('.home-open'), hForm = $('.home-form');
  if (hOpen) {
    hOpen.onclick = function () { hForm.hidden = !hForm.hidden; };
    $('.home-stock').oninput = function () { var x = stockOf(this.value.trim()); $('.home-current').textContent = x ? '目前在：' + ((x.s.i || '其他').split('、')[0]) : ''; };
    hForm.onsubmit = function () {
      var x = stockOf($('.home-stock').value.trim()), sug = $('.home-suggest').value.trim(), m = $('.home-msg');
      if (!x) { m.textContent = '找不到這檔股票'; return false; }
      if (!sug) { m.textContent = '請填寫應該在的族群'; return false; }
      m.textContent = '送出中…';
      api('/api/report', { method: 'POST', body: JSON.stringify({ code: x.code, name: x.s.n, current: (x.s.i || '').split('、')[0], suggest: sug, note: $('.home-note').value.trim() }) }).then(function (j) {
        if (j.error) { m.textContent = j.error; return; }
        m.textContent = '已收到！謝謝你幫 ' + x.s.n + ' 找到回家的路 🏠';
        $('.home-stock').value = ''; $('.home-suggest').value = ''; $('.home-note').value = ''; $('.home-current').textContent = '';
        loadAdmin();
      }).catch(function () { m.textContent = '連線失敗，請稍後再試'; });
      return false;
    };
  }
  // 管理員：審核回報
  function loadAdmin() {
    var box = $('.home-admin'); if (!box || !token) return;
    api('/api/reports').then(function (j) {
      if (!j.reports) { box.hidden = true; return; }
      var st = { pending: '待審核', approved: '已採納', rejected: '已忽略' };
      var rows = j.reports.map(function (r) {
        return '<tr><td>' + new Date(r.ts).toLocaleDateString('zh-TW') + '</td><td class="nm">' + esc(r.code) + ' ' + esc(r.name) + '</td><td>' + esc(r.current || '-') + ' → <b>' + esc(r.suggest) + '</b></td><td class="post">' + esc(r.note || '') + '</td><td class="hint">' + esc(r.email) + '</td><td>' +
          (r.status === 'pending' ? '<button data-id="' + r.id + '" data-s="approved">採納</button> <button data-id="' + r.id + '" data-s="rejected">忽略</button>' : st[r.status] + ' <button data-id="' + r.id + '" data-s="pending">復原</button>') + '</td></tr>';
      }).join('');
      var pend = j.reports.filter(function (r) { return r.status === 'pending'; }).length;
      box.innerHTML = '<h2>回報審核 <span class="count">待審核 ' + pend + ' 筆・只有管理員看得到・採納後下一次報告更新時生效</span></h2>' +
        (rows ? '<div class="scroll"><table class="compact"><thead><tr><th>日期</th><th>股票</th><th>分類調整</th><th>說明</th><th>回報者</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty">目前沒有回報</p>');
      box.hidden = false;
      box.querySelectorAll('button[data-id]').forEach(function (b) { b.onclick = function () { api('/api/reports/' + b.dataset.id, { method: 'POST', body: JSON.stringify({ status: b.dataset.s }) }).then(loadAdmin); }; });
    });
  }
  loadAdmin();

  // ---- 個人檔案 ----
  var prefs = {};
  try { prefs = JSON.parse(LS.get('shoupan_prefs') || '{}'); } catch (e) {}
  function applyPrefs() {
    var h = document.documentElement;
    if (prefs.accent) h.setAttribute('data-accent', prefs.accent); else h.removeAttribute('data-accent');
    if (prefs.theme) h.setAttribute('data-theme', prefs.theme); else h.removeAttribute('data-theme');
    document.querySelectorAll('.pf-accents button').forEach(function (b) { b.classList.toggle('on', b.dataset.accent === (prefs.accent || 'red')); });
    document.querySelectorAll('.pf-themes button').forEach(function (b) { b.classList.toggle('on', b.dataset.theme === (prefs.theme || '')); });
  }
  document.querySelectorAll('.pf-accents button').forEach(function (b) { b.onclick = function () { prefs.accent = b.dataset.accent; applyPrefs(); }; });
  document.querySelectorAll('.pf-themes button').forEach(function (b) { b.onclick = function () { prefs.theme = b.dataset.theme; applyPrefs(); }; });
  var pfSave = $('.pf-save');
  if (pfSave) pfSave.onclick = function () {
    LS.set('shoupan_prefs', JSON.stringify(prefs));
    if (!token) { $('.pf-msg').textContent = '已儲存在這台裝置'; return; }
    var body = { prefs: prefs }; if (!$('.pf-nick').disabled) body.nickname = $('.pf-nick').value.trim();
    api('/api/profile', { method: 'PUT', body: JSON.stringify(body) }).then(function (j) { $('.pf-msg').textContent = j.error ? j.error : '已儲存'; if (!j.error) { loadProfile(); loadBoard(curPeriod); } });
  };
  var pfOut = $('.pf-logout'); if (pfOut) pfOut.onclick = function () { $('.auth-out').click(); };
  var curPeriod = 'week';
  function askNick() {
    var m = $('#nick-modal'); if (!m || !token) return;
    m.hidden = false; setTimeout(function () { var i = $('.nm-input'); if (i) i.focus(); }, 50);
    var ok = $('.nm-ok');
    var go = function () {
      var v = $('.nm-input').value.trim(), err = $('.nm-err');
      if (v.length < 2) { err.textContent = '暱稱至少 2 個字'; return; }
      err.textContent = '儲存中…';
      api('/api/profile', { method: 'PUT', body: JSON.stringify({ nickname: v }) }).then(function (j) {
        if (j.error) { err.textContent = j.error; return; }
        m.hidden = true; loadProfile(); loadBoard(curPeriod);
      }).catch(function () { err.textContent = '連線失敗，請再試一次'; });
    };
    ok.onclick = go;
    $('.nm-input').onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }
  window.__reloadProfile = function () { loadProfile(); };
  function loadProfile() {
    if (!token) return;
    api('/api/profile').then(function (j) {
      var p = j.profile; if (!p) return;
      if (p.picture) $('.pf-pic').src = p.picture;
      $('.pf-name').textContent = p.nickname || p.name || '情報員';
      $('.pf-mail').textContent = (p.email || '') + (p.created ? '・' + new Date(p.created).toLocaleDateString('zh-TW') + ' 加入' : '');
      $('.pf-nick').value = p.nickname || '';
      var nh = $('.pf-nick-hint');
      if (p.nickNext) { $('.pf-nick').disabled = true; nh.textContent = '暱稱每 30 天可改一次，下次可修改：' + new Date(p.nickNext).toLocaleDateString('zh-TW'); }
      else { $('.pf-nick').disabled = false; nh.textContent = '暱稱每 30 天可改一次'; }
      if (!p.nickname) askNick();
      if (p.prefs && (p.prefs.accent || p.prefs.theme)) { prefs = p.prefs; LS.set('shoupan_prefs', JSON.stringify(prefs)); }
      applyPrefs();
      if (p.admin) loadAdminVotes();
    });
    api('/api/myvotes').then(function (j) {
      if (!j.votes) return;
      var s = j.summary;
      $('.pf-stats').innerHTML = '<div class="pf-cards"><div><b>' + s.votes + '</b><span>投票次數</span></div><div><b>' + (s.scored ? Math.round(s.dir / s.scored * 100) + '%' : '-') + '</b><span>方向命中率</span></div><div><b>' + s.pts + '</b><span>總得分</span></div><div><b class="pf-rank">-</b><span>本週排名</span></div></div>';
      var bias = { bull: '🐂 看多', bear: '🐻 看空' };
      var rows = j.votes.map(function (v) {
        var d = v.date.slice(4, 6) + '/' + v.date.slice(6), sc = v.score;
        // 還沒開獎：顯示預計開獎時間（投票日的下一個平日 13:35）
        var nx = new Date(Date.UTC(+v.date.slice(0, 4), +v.date.slice(4, 6) - 1, +v.date.slice(6)));
        do nx.setUTCDate(nx.getUTCDate() + 1); while (nx.getUTCDay() === 0 || nx.getUTCDay() === 6);
        var wk = '日一二三四五六'.charAt(nx.getUTCDay());
        // 顯示「猜的是哪一天」：已開獎用實際開獎日，還沒開獎用下一個平日
        if (v.next) { nx = new Date(Date.UTC(+v.next.slice(0, 4), +v.next.slice(4, 6) - 1, +v.next.slice(6))); wk = '日一二三四五六'.charAt(nx.getUTCDay()); }
        d = (nx.getUTCMonth() + 1) + '/' + nx.getUTCDate() + '（' + wk + '）';
        var res = !sc ? '<td class="no" colspan="3">⏳ 等待開獎（' + (nx.getUTCMonth() + 1) + '/' + nx.getUTCDate() + ' 週' + wk + ' 13:35 收盤後）</td>' :
          '<td class="' + (sc.tw >= 0 ? 'up' : 'dn') + '">' + (sc.tw >= 0 ? '+' : '') + sc.tw.toFixed(2) + '% ' + (sc.dirOk ? '✓' : '✗') + '</td>' +
          '<td>' + (sc.themeR == null ? '-' : '<span class="' + (sc.themeR >= 0 ? 'up' : 'dn') + '">' + (sc.themeR >= 0 ? '+' : '') + sc.themeR.toFixed(2) + '%</span>' + (sc.themePts === 3 ? ' 🏆' : sc.themePts ? ' ✓' : '')) + '</td><td><b>+' + sc.pts + '</b></td>';
        return '<tr><td>' + d + '</td><td>' + bias[v.bias] + '</td><td>' + esc(v.theme || '-') + '</td>' + res + '</tr>';
      }).join('');
      $('.pf-votes').innerHTML = rows ? '<div class="scroll"><table class="compact"><thead><tr><th>猜哪一天</th><th>多空</th><th>押的族群</th><th>當天大盤</th><th>族群表現</th><th>得分</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty">還沒有投票紀錄，到上方「明天怎麼走？」投第一票吧</p>';
    });
  }
  function loadBoard(period) {
    curPeriod = period;
    api('/api/leaderboard?period=' + period).then(function (j) {
      var medal = ['🥇', '🥈', '🥉'];
      var rows = (j.top || []).map(function (u) { return '<tr' + (u.me ? ' class="me"' : '') + '><td>' + (medal[u.rank - 1] || u.rank) + '</td><td class="nm">' + esc(u.name) + (u.me ? ' <span class="tag">我</span>' : '') + '</td><td><b>' + u.pts + '</b></td><td>' + u.hit + '%</td><td>' + u.votes + '</td></tr>'; }).join('');
      $('.pf-board').innerHTML = rows ? '<div class="scroll"><table class="compact"><thead><tr><th>#</th><th>情報員</th><th>得分</th><th>方向命中</th><th>投票數</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + (j.mine && j.mine.rank > 20 ? '<p class="hint">你目前第 ' + j.mine.rank + ' 名（共 ' + j.players + ' 人）</p>' : '') : '<p class="empty">還沒有人開獎，投票後隔天收盤就會開始計分</p>';
      if (period === 'week') { var r = $('.pf-rank'); if (r) r.textContent = j.mine ? '#' + j.mine.rank : '-'; }
    });
  }
  document.querySelectorAll('.pf-periods .stab').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('.pf-periods .stab').forEach(function (x) { x.classList.toggle('on', x === b); }); loadBoard(b.dataset.period); }); });
  function loadAdminVotes() {
    api('/api/admin/votes').then(function (j) {
      if (!j.days) return;
      var bias = { bull: '看多', bear: '看空' };
      var days = j.days.map(function (d) { return '<tr><td>' + d.date.slice(4, 6) + '/' + d.date.slice(6) + '</td><td>' + d.n + '</td><td>' + d.members + '</td><td>' + Math.round(d.bull / d.n * 100) + '%</td></tr>'; }).join('');
      var recent = j.recent.map(function (v) { return '<tr><td>' + new Date(v.ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + '</td><td class="nm">' + esc(v.nickname || v.name || '未登入') + '</td><td class="hint">' + esc(v.email || '') + '</td><td>' + bias[v.bias] + '</td><td>' + esc(v.theme || '-') + '</td></tr>'; }).join('');
      var box = $('.pf-admin');
      var tf = function (ms) { return ms ? new Date(ms).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'; };
      var sign = (j.signups || []).map(function (d) { return '<tr><td>' + d.date.slice(4, 6) + '/' + d.date.slice(6) + '</td><td><b>+' + d.n + '</b></td></tr>'; }).join('');
      var mem = (j.members || []).map(function (m) { return '<tr><td>' + tf(m.created) + '</td><td class="nm">' + esc(m.nickname || '（未取暱稱）') + '</td><td>' + esc(m.name || '') + '</td><td class="hint">' + esc(m.email || '') + '</td><td>' + tf(m.last_login) + '</td></tr>'; }).join('');
      var todayKey = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
      var todayN = ((j.signups || []).filter(function (d) { return d.date === todayKey; })[0] || { n: 0 }).n;
      var vis = (j.visits || []).map(function (d) { return '<tr><td>' + d.date.slice(4, 6) + '/' + d.date.slice(6) + '</td><td><b>' + d.total + '</b></td><td>' + d.members + '</td><td>' + d.guests + '</td><td>' + d.landing + '</td></tr>'; }).join('');
      var tv = (j.visits || []).filter(function (d) { return d.date === todayKey; })[0];
      box.innerHTML = '<h2>管理員後台 <span class="count">只有你看得到・會員 ' + j.users + ' 人・今天新加入 ' + todayN + ' 人・開啟通知 ' + (j.pushSubs || 0) + ' 台裝置</span></h2>' +
        '<h3>每日訪客 <span class="count">今天 ' + (tv ? tv.total : 0) + ' 人（會員 ' + (tv ? tv.members : 0) + '・訪客 ' + (tv ? tv.guests : 0) + '・只看介紹頁 ' + (tv ? tv.landing : 0) + '）</span></h3>' +
        (vis ? '<div class="scroll"><table class="compact"><thead><tr><th>日期</th><th>總人數</th><th>會員</th><th>訪客</th><th>只看介紹頁</th></tr></thead><tbody>' + vis + '</tbody></table></div><p class="hint">以「裝置」計算，同一台裝置一天只算一次；同一天先當訪客、後來登入，算會員。</p>' : '<p class="empty">還沒有訪客資料</p>') +
        '<h3>每日新會員</h3>' + (sign ? '<div class="scroll"><table class="compact"><thead><tr><th>日期</th><th>新會員</th></tr></thead><tbody>' + sign + '</tbody></table></div>' : '<p class="empty">尚無會員</p>') +
        '<h3>最新加入的會員</h3>' + (mem ? '<details><summary>展開名單（最新 100 人）</summary><div class="scroll"><table class="compact"><thead><tr><th>加入時間</th><th>暱稱</th><th>Google 名字</th><th>信箱</th><th>最近上線</th></tr></thead><tbody>' + mem + '</tbody></table></div></details>' : '') +
        '<h3>每日投票總覽</h3>' +
        (days ? '<div class="scroll"><table class="compact"><thead><tr><th>投票日</th><th>票數</th><th>登入會員</th><th>看多</th></tr></thead><tbody>' + days + '</tbody></table></div>' : '<p class="empty">尚無投票</p>') +
        '<h3>最新投票明細</h3>' + (recent ? '<div class="scroll"><table class="compact"><thead><tr><th>時間</th><th>情報員</th><th>信箱</th><th>多空</th><th>族群</th></tr></thead><tbody>' + recent + '</tbody></table></div>' : '<p class="empty">尚無投票</p>');
      box.hidden = false;
    });
  }
  applyPrefs();
  loadProfile();
  loadBoard('week');

  if (token) api('/api/me').then(function (j) { if (j.user) { user = j.user; LS.set('shoupan_user', JSON.stringify(user)); showUser(); } });
  if (token) api('/api/watchlist').then(function (w) { if (w.codes) { codes = w.codes; LS.set('shoupan_watch', JSON.stringify(codes)); renderWatch(); } });
  showUser();
  initGoogle();
})();
</script>`;
}

// 分頁導覽：上排 6 大類，下排是該類的小分頁（單一頁的類別不顯示下排）
const NAV = [
  ['pick', '選股', [['main', '一K站三線'], ['latent', '潛伏股'], ['three', '三率三升'], ['cup', '杯柄型態'], ['track', '一週追蹤']]],
  ['watch', '自選股', [['watch', '自選股']]],
  ['chips', '籌碼', [['locked', '主力鎖碼'], ['flow', '三大法人'], ['holders', '千張大戶'], ['aetf', '主動ETF']]],
  ['sector', '產業', [['industry', '產業趨勢'], ['news', '產業新聞'], ['ir50', '0050法說營收']]],
  ['macro', '總經', [['macro', '總經']]],
  ['me', '個人檔案', [['profile', '個人檔案']]],
];
function renderNav() {
  return `<div class="ptabs">
<div class="gtabs">${NAV.map(([g, t], i) => `<button class="gtab${i ? '' : ' on'}" data-g="${g}">${t}</button>`).join('')}</div>
${NAV.map(([g, , pages], i) => `<div class="subtabs${pages.length === 1 ? ' single' : ''}" data-g="${g}"${i ? ' hidden' : ''}>${pages.map(([k, t], j) => `<button class="ptab${i === 0 && j === 0 ? ' on' : ''}" data-p="${k}">${t}</button>`).join('')}</div>`).join('')}
</div>`;
}

function renderTopBar({ idx, txf }) {
  const fmt = (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const sign = (v, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d);
  const cell = (name, last, chg, pct, note) => `<div class="tb-item"><div class="tb-name">${name}</div><div class="tb-val">${fmt(last)}</div>
<div class="tb-chg ${chg >= 0 ? 'up' : 'dn'}">${chg >= 0 ? '▲' : '▼'} ${fmt(Math.abs(chg))}（${sign(pct)}%）</div>${note ? `<div class="tb-note">${note}</div>` : ''}</div>`;
  const fromAsset = (a) => {
    if (a.live) return cell(a.name, a.live.last, a.live.chg, a.live.pct, twTimeOf(a.live.time)); // 盤中即時（期交所）
    const p = a.pts;
    if (!p || p.length < 2) return '';
    const last = p[p.length - 1][1], prev = p[p.length - 2][1];
    return cell(a.name, last, last - prev, (last / prev - 1) * 100, a.time ? twTimeOf(a.time) : '');
  };
  const [twii, ...others] = idx;
  let tx = '';
  if (txf && txf.main) {
    const m = txf.main, o = txf.other;
    tx = cell(`台指期近月・${m.session}`, m.last, m.chg, m.pct,
      twTimeOf(m.time) + (o ? `<br>${o.session} ${fmt(o.last)}（<span class="${o.chg >= 0 ? 'up' : 'dn'}">${sign(o.pct)}%</span>）` : ''));
  }
  // 註解標記讓 quotes.js 只替換這一段
  return `<!--TOPBAR--><div class="topbar">${twii ? fromAsset(twii) : ''}${tx}${others.map(fromAsset).join('')}</div><!--/TOPBAR-->`;
}

function renderUSIndexes(idx) {
  const at = idx.filter((a) => a.time).map((a) => a.time).sort().pop();
  return `<h2>美國主要指數 <span class="count">即時報價（打開此頁時更新）</span></h2>
${tvBox([
    { proName: 'FOREXCOM:DJI', title: '道瓊' },
    { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
    { proName: 'FOREXCOM:NSXUSD', title: '那斯達克 100' },
    { proName: 'NASDAQ:SOXX', title: '費半ETF（SOXX）' }, // 費半指數本身不開放嵌入，用追蹤費半的 ETF 代替
  ])}
<h2>收盤與漲跌 <span class="count">報表產生時（${at ? twTimeOf(at) : '-'}）</span></h2>
${idx.length ? assetTable(idx) : '<p class="empty">指數資料下載失敗</p>'}
<p class="hint">即時報價：道瓊、S&P 500、那斯達克 100 為 TradingView 指數差價合約（休市時段也會跳動，可當期貨盤參考）；費半指數不開放嵌入，改用追蹤費半的 ETF「SOXX」，只在美股交易時段跳動。下方表格為正式指數。</p>`;
}

function renderMacro(m) {
  const Y = m.yields;
  const cols = [['3 Mo', '3 個月'], ['2 Yr', '2 年'], ['5 Yr', '5 年'], ['10 Yr', '10 年'], ['30 Yr', '30 年']];
  const ago = (days) => {
    if (!Y.length) return null;
    const t = new Date(Y[Y.length - 1].date).getTime() - days * 86400000;
    let i = Y.length - 1;
    while (i > 0 && new Date(Y[i].date).getTime() > t) i--;
    return Y[i];
  };
  const yStart = Y.find((r) => r.date.slice(0, 4) === (Y.length ? Y[Y.length - 1].date.slice(0, 4) : ''));
  const bp = (a, b) => (a == null || b == null ? '<td>-</td>' : `<td class="${a - b >= 0 ? 'up' : 'dn'}">${a - b >= 0 ? '+' : ''}${Math.round((a - b) * 100)} bp</td>`);
  const last = Y[Y.length - 1] || {};
  const yieldRows = cols
    .map(([k, label]) => `<tr><td>${label}</td><td><b>${last[k] != null ? last[k].toFixed(2) + '%' : '-'}</b></td>${bp(last[k], (ago(1) || {})[k])}${bp(last[k], (ago(7) || {})[k])}${bp(last[k], (ago(30) || {})[k])}${bp(last[k], (yStart || {})[k])}<td>${spark(Y.slice(-66).map((r) => r[k]))}</td></tr>`)
    .join('');
  const spread = last['10 Yr'] != null && last['2 Yr'] != null ? last['10 Yr'] - last['2 Yr'] : null;

  const ymLabel = (ym) => (ym ? `${ym.slice(0, 4)}/${+ym.slice(5)} 月` : '');
  const twTime = (iso) => (iso ? new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-');
  const num = (v) => (v == null ? NaN : parseFloat(String(v).replace(/[%K,]/g, '')));
  const now = Date.now();
  const thisMonth = new Date(now + 8 * 3600000).toISOString().slice(0, 7);
  const eco = m.indicators
    .filter((x) => x.actual != null || x.next)
    .map((x) => {
      const a = num(x.actual), c = num(x.consensus);
      let vs = '<td>-</td>';
      if (!isNaN(a) && !isNaN(c)) vs = a > c ? '<td class="up">高於預期</td>' : a < c ? '<td class="dn">低於預期</td>' : '<td>符合預期</td>';
      const n = x.next;
      const soon = n && new Date(n.at).getTime() > now && new Date(n.at).getTime() - now < 14 * 86400000; // 14 天內公布
      const pmiTag = /PMI/.test(x.name) && !isNaN(a) ? (a >= 50 ? ' <span class="chip good">擴張</span>' : ' <span class="chip bad">收縮</span>') : '';
      return `<tr${soon ? ' class="soon"' : ''}><td>${x.name}${pmiTag}</td><td>${ymLabel(x.ym)}</td><td><b>${x.actual ?? '-'}</b></td><td>${x.consensus ?? '-'}</td>${vs}<td>${x.previous ?? '-'}</td>
<td>${n ? twTime(n.at) + (soon ? ' <span class="chip good">即將公布</span>' : '') : '-'}</td><td><b>${n ? n.consensus ?? '-' : '-'}</b></td><td>${n ? n.teForecast ?? '-' : '-'}</td></tr>`;
    })
    .join('');
  const notes = m.indicators
    .filter((x) => x.text)
    .map((x) => `<li><b>${x.name}</b>：${esc(x.text)}</li>`)
    .join('');
  const liveAt = m.assets.filter((a) => a.time).map((a) => a.time).sort().pop();
  return `<h2>即時報價 <span class="count">打開此頁時即時更新（TradingView）</span></h2>
${tvBox([
    { proName: 'TVC:USOIL', title: 'WTI 原油' }, { proName: 'TVC:UKOIL', title: '布蘭特原油' },
    { proName: 'TVC:GOLD', title: '黃金' }, { proName: 'TVC:SILVER', title: '白銀' },
    { proName: 'TVC:DXY', title: '美元指數' }, { proName: 'TVC:US10Y', title: '美債10年' }, { proName: 'TVC:US02Y', title: '美債2年' },
  ])}
<h2>油價・金價・美元 <span class="count">報表產生時的報價（${liveAt ? twTime(new Date(liveAt).toISOString()) : '-'}）</span></h2>
${assetTable(m.assets)}
<p class="hint">期貨為近月合約，月底換月時單日漲跌可能失真。</p>
<h2>美國公債殖利率 <span class="count">${last.date || ''}・10 年減 2 年利差 ${spread == null ? '-' : (spread >= 0 ? '+' : '') + Math.round(spread * 100) + ' bp'}${spread != null && spread < 0 ? '（倒掛）' : ''}</span></h2>
<div class="scroll"><table class="stats"><thead><tr><th>天期</th><th>殖利率</th><th>1 日</th><th>1 週</th><th>1 個月</th><th>今年</th><th>近 3 個月</th></tr></thead><tbody>${yieldRows}</tbody></table></div>
<h2>經濟數據與市場預期 <span class="count">PMI 50 以上為擴張；時間為台灣時間</span></h2>
<div class="scroll"><table class="stats"><thead><tr><th>項目</th><th>資料月份</th><th>實際</th><th>市場預期</th><th>結果</th><th>前期</th><th>下次公布</th><th>下次市場預期</th><th>TE 預測</th></tr></thead><tbody>${eco}</tbody></table></div>
<p class="hint">資料來源：Trading Economics。「下次市場預期」通常在公布前一週左右才會出現，空白代表還沒有共識數字；TE 預測為該網站的模型預估。</p>
<details><summary>各項數據摘要（英文原文）</summary><ul class="notes">${notes}</ul></details>`;
}

function renderUS(u) {
  const tw = (iso) => new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const rate = (r) => (r ? `<td class="${r.win >= 50 ? 'up' : 'dn'}"><b>${f1(r.win)}%</b><span class="tag">${r.n}筆</span></td>` : '<td class="no">累積中</td>');
  const avg = (r) => (r ? pctCell(r.avg) : '<td>-</td>');
  const beat = (v) => (v == null ? '<td>-</td>' : `<td class="${v >= 50 ? 'up' : 'dn'}">${f1(v)}%</td>`);
  const yf = (t) => `https://finance.yahoo.com/quote/${encodeURIComponent(t)}`;
  const statRow = (label, st) => `<tr><td>${label}</td><td>${st.n}</td>${rate(st.r1)}${rate(st.r5)}${avg(st.r5)}${beat(st.beat)}</tr>`;

  const recent = u.trumpRecent
    .map((e) => {
      const res = !e.entry ? '<td class="no">等待收盤</td>' : e.done ? (e.rets[u.hold - 1] > 0 ? '<td class="up"><b>勝</b></td>' : '<td class="dn"><b>敗</b></td>') : `<td class="no">追蹤中 ${e.rets.length}/${u.hold}</td>`;
      return `<tr><td>${tw(e.time)}</td><td><a href="${yf(e.ticker)}" target="_blank"><b>${e.ticker}</b></a><span class="tag">${esc(e.name)}</span></td>
<td class="post"><a href="${esc(e.url)}" target="_blank">${esc(e.snippet)}</a></td>${e.sinceNow == null ? '<td>-</td>' : pctCell(e.sinceNow)}${e.rets[u.hold - 1] == null ? '<td>-</td>' : pctCell(e.rets[u.hold - 1])}${res}</tr>`;
    })
    .join('');
  const tickers = u.trumpTickers
    .map((t) => `<tr><td><a href="${yf(t.ticker)}" target="_blank"><b>${t.ticker}</b></a></td><td>${esc(t.name)}</td><td>${t.count}</td>${rate(t.r1)}${rate(t.r5)}${avg(t.r5)}${beat(t.beat)}<td>${t.last.slice(5, 10).replace('-', '/')}</td></tr>`)
    .join('');
  const reddit = u.redditToday
    .map((r) => {
      const p = r.px && r.px.length > 1 ? (r.px[r.px.length - 1].c / r.px[r.px.length - 2].c - 1) * 100 : null;
      const delta = r.mentions_24h_ago ? ((r.mentions / r.mentions_24h_ago - 1) * 100) : null;
      return `<tr><td>${r.rank}</td><td><a href="${yf(r.ticker)}" target="_blank"><b>${r.ticker}</b></a>${r.isNew ? '<span class="chip good">新上榜</span>' : ''}</td><td>${esc(r.name)}</td>
<td>${r.mentions}</td>${delta == null ? '<td>-</td>' : pctCell(delta)}${p == null ? '<td>-</td>' : pctCell(p)}</tr>`;
    })
    .join('');
  return `<h2>勝率統計 <span class="count">勝 = 提到後第 ${u.hold} 個交易日收盤 &gt; 提到後第一個收盤；贏大盤 = 報酬高於同期 SPY</span></h2>
<div class="scroll"><table class="stats"><thead><tr><th>來源</th><th>提到次數</th><th>1 日勝率</th><th>${u.hold} 日勝率</th><th>平均${u.hold}日報酬</th><th>贏大盤</th></tr></thead><tbody>
${statRow('川普（Truth Social）', u.trumpStats)}${statRow('網友熱門・新上榜', u.redditStats)}${statRow('網友熱門・全部', u.redditAllStats)}</tbody></table></div>
<p class="hint">川普貼文自 ${u.postsFrom ? u.postsFrom.slice(0, 10) : '-'} 起共 ${u.postsCount.toLocaleString()} 則，同一檔同一天只算一次。網友資料（Reddit 熱門前 10 名，ETF 除外）沒有歷史可回補，從開始記錄那天起每天累積，目前 ${u.redditDays} 天。</p>
<h2>川普最近提到 <span class="count">最新 25 筆</span></h2>
<div class="scroll"><table><thead><tr><th>時間（台灣）</th><th>股票</th><th>貼文摘錄</th><th>提到後至今</th><th>${u.hold}日報酬</th><th>結果</th></tr></thead><tbody>${recent}</tbody></table></div>
<h2>川普提到個股排行</h2>
<div class="scroll"><table class="stats"><thead><tr><th>代號</th><th>公司</th><th>次數</th><th>1 日勝率</th><th>${u.hold} 日勝率</th><th>平均${u.hold}日</th><th>贏大盤</th><th>最近提到</th></tr></thead><tbody>${tickers}</tbody></table></div>
<h2>網友今日熱門 <span class="count">Reddit 提及次數排行（ApeWisdom）</span></h2>
<div class="scroll"><table><thead><tr><th>#</th><th>代號</th><th>名稱</th><th>提及數</th><th>較 24h 前</th><th>最近漲跌</th></tr></thead><tbody>${reddit}</tbody></table></div>`;
}

function renderThreeUp({ g1, g2, g3, label, kd }) {
  const SHOW = 15; // 每個子分頁先顯示幾檔，其餘收合
  const dpp = (v) => `<span class="${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}</span>`;
  const stock = (r) => `${stockLink(r)} ${r.name}${r.mkt === '上櫃' ? '<span class="tag">櫃</span>' : ''}${r.surge ? `<span class="chip hot">爆量 ${r.volRatio.toFixed(1)}x</span>` : ''}`;
  const row = (r) => `<tr${r.surge ? ' class="surge"' : ''}><td class="nm">${stock(r)}</td><td>${r.streak} 天</td>
<td>${r.tech ? `<span class="chip good">${r.tech}</span>` : '<span class="chip mid">整理</span>'}</td>
<td>${r.close}</td>${pctCell(r.chg)}<td>${r.lots.toLocaleString()}</td><td class="${r.volRatio >= SURGE_RATIO ? 'up' : ''}">${r.volRatio ? r.volRatio.toFixed(1) + 'x' : '-'}</td>
<td class="rates">${dpp(r.rates.cur.gm - r.rates.prev.gm)} / ${dpp(r.rates.cur.om - r.rates.prev.om)} / ${dpp(r.rates.cur.nm - r.rates.prev.nm)}</td>
${pctCell(r.yoy)}<td class="${r.eps == null ? '' : r.eps > 0 ? 'up' : 'dn'}">${f2(r.eps)}</td></tr>`;
  const head = '<thead><tr><th>股票</th><th>連續在榜</th><th>技術面</th><th>收盤</th><th>漲跌</th><th>量(張)</th><th>量比</th><th title="單季較上季增加的百分點">三率增加（毛/營/淨）</th><th>營收YoY</th><th>EPS</th></tr></thead>';
  const table = (l) => {
    if (!l.length) return '<p class="empty">今日無</p>';
    const first = `<div class="scroll"><table class="compact">${head}<tbody>${l.slice(0, SHOW).map(row).join('')}</tbody></table></div>`;
    const rest = l.length > SHOW ? `<details class="more"><summary>展開其餘 ${l.length - SHOW} 檔</summary><div class="scroll"><table class="compact">${head}<tbody>${l.slice(SHOW).map(row).join('')}</tbody></table></div></details>` : '';
    return first + rest;
  };

  const kdRow = (r) => `<tr${r.surge ? ' class="surge"' : ''}><td class="nm">${stock(r)}</td>
<td>${f1(r.ind.kPrev)} → <b class="up">${f1(r.ind.k)}</b></td><td>${f1(r.ind.dPrev)} → ${f1(r.ind.d)}</td>
<td>${r.ind.oscPrev.toFixed(2)} → <b>${r.ind.osc.toFixed(2)}</b></td>
<td>${r.close}</td>${pctCell(r.chg)}<td>${r.lots.toLocaleString()}</td>${pctCell(r.yoy)}</tr>`;
  const kdTable = kd.length
    ? `<div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>K 值</th><th>D 值</th><th>MACD 柱</th><th>收盤</th><th>漲跌</th><th>量(張)</th><th>營收YoY</th></tr></thead><tbody>${kd.map(kdRow).join('')}</tbody></table></div>`
    : '<p class="empty">今日無符合個股</p>';

  const all = [...g1, ...g2, ...g3];
  const surge = all.filter((r) => r.surge).sort((x, y) => y.volRatio - x.volRatio);
  const tabs = [
    ['three-g1', '連續在榜', g1.length, '昨天、今天都在榜，連續越久越前面（同天數依成交量）', table(g1)],
    ['three-g2', '今日一K站三線', g2.length, '今天剛進榜、而且一根K棒站上 5/10/20 日均線', table(g2)],
    ['three-surge', '爆量上漲', surge.length, `今日量 ≥ 前 20 日均量 ${SURGE_RATIO} 倍且收紅，依量比由高到低`, table(surge)],
    ['three-g3', '其他', g3.length, '今天剛進榜的其他個股，依成交量由高到低', table(g3)],
    ['three-kd', 'KD金叉＋MACD將翻紅', kd.length, '今天 KD 黃金交叉第一天、K 值上彎，且 MACD 柱狀體仍為負但明天就會翻正（KD 9,3,3；MACD 12,26,9）', kdTable],
  ];
  return `<h2>三率三升 <span class="count">${all.length} 檔${label ? '・' + label : ''}</span></h2>
<p class="hint">單季毛利率、營益率、淨利率皆較上季提升，營收 YoY 為正且未往下，當日量 ≥ ${MIN_LOTS_ALL.toLocaleString()} 張。</p>
<div class="stabs">${tabs.map(([k, t, n], i) => `<button class="stab${i ? '' : ' on'}" data-s="${k}">${t} <b>${n}</b></button>`).join('')}</div>
${tabs.map(([k, , , desc, html], i) => `<div class="spage" data-s="${k}"${i ? ' hidden' : ''}><p class="hint">${desc}</p>${html}</div>`).join('')}`;
}

function renderCups(rows) {
  const P = CUP_PARAMS;
  const md = (d) => `${+d.slice(4, 6)}/${+d.slice(6)}`;
  const tr = rows
    .map((r) => {
      const st = r.status.includes('帶量突破') ? 'up' : r.status.includes('突破') ? 'mid' : '';
      return `<tr><td><a href="https://tw.stock.yahoo.com/quote/${r.code}${r.mkt === '上櫃' ? '.TWO' : '.TW'}/technical-analysis" target="_blank">${r.code}</a></td>
<td>${r.name}<span class="tag">${r.mkt}</span></td><td>${r.industry || '-'}</td>
<td><span class="chip ${st ? (st === 'up' ? 'good' : 'mid') : 'mid'}">${r.status}</span></td>
<td>${spark(r.path)}</td>
<td>${r.close}</td>${pctCell(r.chg)}<td>${r.pivot}</td><td class="${r.toPivot >= 0 ? 'up' : ''}">${signed(r.toPivot, 1)}%</td>
<td>${r.baseLen} 天（約 ${Math.round(r.baseLen / 5)} 週）<div class="sub">${md(r.leftDate)} 起</div></td>
<td class="dn">-${f1(r.depth)}%</td>
<td class="${r.tight ? 'up' : ''}">${r.cons.length} 次<div class="sub">${r.cons.map((v) => Math.round(v) + '%').join(' → ')}${r.tight ? ' 收斂' : ''}</div></td>
<td>${r.hLen} 天 / -${f1(r.handleDepth)}%</td>
<td class="${r.handleDry < 1 ? 'up' : 'dn'}">${r.handleDry == null ? '-' : f2(r.handleDry) + ' 倍'}</td>
<td class="${r.volRatio >= P.BREAK_VOL ? 'up' : ''}">${f1(r.volRatio)} 倍</td>
<td>+${Math.round(r.priorUp)}%</td><td>${r.rs}</td><td>${r.lots.toLocaleString()}</td>
<td class="up">${f1(r.yoy)}%</td><td class="${r.eps == null ? '' : r.eps > 0 ? 'up' : 'dn'}">${f2(r.eps)}</td><td>${r.pe ? f1(r.pe) : '-'}</td></tr>`;
    })
    .join('');
  return `<h2>杯柄型態（超級績效 VCP） <span class="count">${rows.length} 檔</span></h2>
<div class="rules">① 趨勢樣板：收盤 &gt; 50 日線 &gt; 150 日線，150 日線上彎，距低點 ≥ 30%、距高點 ≤ 25%　② 相對強度（近 6 個月漲幅全市場百分位）≥ ${P.RS_MIN}　③ 杯子：創高後回檔 ${P.DEPTH_MIN}～${P.DEPTH_MAX}%、整理 ${P.CUP_MIN}～${P.CUP_MAX} 個交易日、U 型底、右杯緣回到左杯緣 ${Math.round(P.RIGHT_MIN * 100)}% 以上、杯前漲幅 ≥ ${P.PRIOR_UP}%　④ 柄：${P.HANDLE_MIN}～${P.HANDLE_MAX} 天、回檔 ≤ ${P.HANDLE_DEPTH_MAX}%、在杯子上半部　⑤ 收盤距突破價 ${P.NEAR_PIVOT}% 內，或近 ${P.RECENT_BREAK} 天帶量突破（量 ≥ 50 日均量 ${P.BREAK_VOL} 倍）且未追高超過 ${P.MAX_EXTENDED}%　⑥ 營收 YoY 為正且未放緩、成交量 ≥ ${MIN_LOTS_ALL.toLocaleString()} 張</div>
<p class="hint">「整理多久」從左杯緣（創高那天）算到今天；「最大回檔」是創高後跌最深的幅度；「回檔次數」是整理期間每一波回檔（反轉 ${P.ZIGZAG}% 以上才算一次），幅度一次比一次小＝「收斂」，代表賣壓越來越輕，是書中最理想的 VCP。「柄量縮」&lt; 1 倍代表柄的成交量比杯子期間少，籌碼沉澱。突破價＝右杯緣高點，帶量站上才算有效突破。排序：今日帶量突破 → 其他突破 → 柄整理中，同組收斂優先、再看相對強度。※ 股價未還原除權息，遇大額配息或減資可能失真。</p>
${rows.length ? `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>產業</th><th>狀態</th><th>走勢</th><th>收盤</th><th>漲跌</th><th>突破價</th><th>距突破價</th><th>整理多久</th><th>創高後最大回檔</th><th>回檔次數</th><th>柄（天/深）</th><th>柄量縮</th><th>今日量比</th><th>杯前漲幅</th><th>相對強度</th><th>量(張)</th><th>營收YoY</th><th>EPS</th><th>本益比</th></tr></thead><tbody>${tr}</tbody></table></div>` : '<p class="empty">今日無符合杯柄型態的個股</p>'}`;
}

function renderLatent(rows, bare) {
  const trend = (r) => [r.yoyPrev2, r.yoyPrev, r.yoy].map((v) => Math.round(v) + '%').join(' → ');
  const tr = rows
    .map(
      (r) => `<tr><td><a href="https://tw.stock.yahoo.com/quote/${r.code}${r.mkt === '上櫃' ? '.TWO' : '.TW'}/technical-analysis" target="_blank">${r.code}</a></td>
<td>${r.name}<span class="tag">${r.mkt}</span></td><td>${r.industry || '-'}</td>
<td class="chips">${fundTags(r).map(([t, c]) => `<span class="chip ${c}">${t}</span>`).join('')}</td>
<td class="up">${trend(r)}</td><td>${r.close}</td>${pctCell(r.chg)}
<td>+${f1(r.fromLow)}%</td>${pctCell(r.run20)}<td>${f1(r.spread)}%</td>
<td>${r.avgLots.toLocaleString()}</td><td class="${r.volNow >= 1.5 ? 'up' : ''}">${r.volNow.toFixed(1)} 倍</td>
<td>${r.ma60 == null ? '-' : r.close > r.ma60 ? '站上' : '未站上'}</td>
<td class="${r.eps == null ? '' : r.eps > 0 ? 'up' : 'dn'}">${f2(r.eps)}</td><td>${r.pe ? f1(r.pe) : '-'}</td></tr>`
    )
    .join('');
  const table = rows.length ? `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>產業</th><th>基本面</th><th>YoY 近3月</th><th>收盤</th><th>漲跌</th><th>距60日低</th><th>近20日</th><th>均線差距</th><th>20日均量</th><th>今日量比</th><th>季線</th><th>EPS</th><th>本益比</th></tr></thead><tbody>${tr}</tbody></table></div>` : '<p class="empty">今日無符合個股</p>';
  if (bare) return table;
  return `<h2>全部潛伏股：營收加速、股價還沒起漲 <span class="count">${rows.length} 檔</span></h2>
<div class="rules">① 月營收 YoY 連 3 個月往上，最新 ≥ ${LT_MIN_YOY}%　② 距 60 日低點 ≤ ${LT_MAX_FROM_LOW}%　③ 近 20 日漲幅 ≤ ${LT_MAX_RUN20}%　④ 5/10/20 日均線糾結（差距 ≤ ${LT_MAX_MA_SPREAD}%）　⑤ 20 日均量 ≥ ${LT_MIN_AVG_LOTS} 張</div>
<p class="hint">排序：三率三升優先，再依營收加速幅度。「今日量比」≥ 1.5 倍標紅，代表可能開始有資金進場，值得優先注意。</p>
${rows.length ? `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>產業</th><th>基本面</th><th>YoY 近3月</th><th>收盤</th><th>漲跌</th><th>距60日低</th><th>近20日</th><th>均線差距</th><th>20日均量</th><th>今日量比</th><th>季線</th><th>EPS</th><th>本益比</th></tr></thead><tbody>${tr}</tbody></table></div>` : '<p class="empty">今日無符合個股</p>'}`;
}

function renderTracking({ signals, stats }, opt = {}) {
  const rateCell = (r) => (r ? `<td class="${r.win >= 50 ? 'up' : 'dn'}"><b>${f1(r.win)}%</b><span class="tag">${r.n}筆</span></td>` : '<td>-</td>');
  const statRows = stats
    .map(
      (st) => `<tr><td>${st.label}</td>${rateCell(st.r1)}${rateCell(st.r3)}${rateCell(st.r5)}${st.avg5 == null ? '<td>-</td>' : pctCell(st.avg5)}${st.avgMax == null ? '<td>-</td>' : pctCell(st.avgMax)}</tr>`
    )
    .join('');
  const sigTable = (sg) => {
    const tr = sg.picks
      .map((p) => {
        const cells = Array.from({ length: TRACK_DAYS }, (_, k) => (p.rets[k] == null ? '<td class="no">·</td>' : pctCell(p.rets[k]))).join('');
        const res = p.done ? (p.win ? '<td class="up"><b>勝</b></td>' : '<td class="dn"><b>敗</b></td>') : `<td class="no">追蹤中 ${p.rets.length}/${TRACK_DAYS}</td>`;
        return `<tr><td><a href="https://tw.stock.yahoo.com/quote/${p.code}${p.mkt === '上櫃' ? '.TWO' : '.TW'}/technical-analysis" target="_blank">${p.code}</a></td>
<td>${p.name}${p.star ? '<span class="star">★</span>' : ''}</td><td>${opt.cell ? opt.cell(p) : p.above60 == null ? '-' : p.above60 ? '站上' : '未站上'}</td>
<td>${p.close}</td>${cells}${p.max == null ? '<td>-</td>' : pctCell(p.max)}${res}</tr>`;
      })
      .join('');
    const md = (x) => x.slice(4, 6) + '/' + x.slice(6);
    const head = Array.from({ length: TRACK_DAYS }, (_, k) => `<th>D+${k + 1}${sg.after[k] ? `<span class="tag">${md(sg.after[k])}</span>` : ''}</th>`).join('');
    const done = sg.picks.filter((p) => p.done);
    const wins = done.filter((p) => p.win).length;
    const summary = done.length ? `勝率 ${f1((wins / done.length) * 100)}%（${wins}/${done.length}）` : '追蹤中';
    return {
      done: sg.after.length >= TRACK_DAYS,
      html: `<h3>${md(sg.date)} 訊號 <span class="count">${sg.picks.length} 檔・${summary}</span></h3>${sg.picks.length ? `<div class="scroll"><table><thead><tr><th>代號</th><th>名稱</th><th>${opt.col || '季線'}</th><th>訊號日收盤</th>${head}<th>期間最高</th><th>結果</th></tr></thead><tbody>${tr}</tbody></table></div>` : '<p class="empty">當日無訊號</p>'}`,
    };
  };
  const tables = signals.map(sigTable);
  const active = tables.filter((t) => !t.done).map((t) => t.html).join('');
  const past = tables.filter((t) => t.done).map((t) => t.html).join('');
  return `<h2>勝率統計 <span class="count">勝 = 訊號後第 N 個交易日收盤 &gt; 訊號日收盤</span></h2>
<div class="scroll"><table class="stats"><thead><tr><th>分組</th><th>1 日勝率</th><th>3 日勝率</th><th>${TRACK_DAYS} 日勝率</th><th>平均${TRACK_DAYS}日報酬</th><th>平均期間最高</th></tr></thead><tbody>${statRows}</tbody></table></div>
<p class="hint">統計對象：${opt.hint || `每天「一根K棒站上三線、營收 YoY 為正」的所有個股，自 ${TRACK_START.slice(4, 6)}/${TRACK_START.slice(6)} 起。`}樣本數少時勝率僅供參考，每天累積後會越來越有參考價值。</p>
<h2>追蹤中 <span class="count">訊號後未滿 ${TRACK_DAYS} 個交易日</span></h2>${active || '<p class="empty">無</p>'}
<h2>已完成追蹤</h2>${past ? `<details open><summary>展開／收合</summary>${past}</details>` : '<p class="empty">尚無</p>'}`;
}

function renderHtml(date, a, b, flow, picks, extra) {
  const d = `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6)}`;
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>飆股情報局</title>
<link rel="icon" type="image/png" sizes="32x32" href="/TW-STOCK-/favicon-32.png?v=2"><link rel="apple-touch-icon" href="/TW-STOCK-/apple-touch-icon.png?v=2"><link rel="manifest" href="/TW-STOCK-/manifest.webmanifest?v=2">
<meta name="description" content="每天收盤後的台股整理：選股、族群趨勢、主力籌碼、三大法人、總經數據，還能猜明天漲跌拚排行榜。">
<meta property="og:type" content="website"><meta property="og:site_name" content="飆股情報局"><meta property="og:title" content="飆股情報局｜每天收盤後的台股整理">
<meta property="og:description" content="選股・族群趨勢・主力籌碼・三大法人・總經，還能猜明天漲跌拚排行榜。">
<meta property="og:url" content="https://nicklin1020104-beep.github.io/TW-STOCK-/"><meta property="og:image" content="https://nicklin1020104-beep.github.io/TW-STOCK-/og-image.png?v=2">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://nicklin1020104-beep.github.io/TW-STOCK-/og-image.png?v=2">
<meta name="apple-mobile-web-app-title" content="飆股情報局"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#0b1733">
<script>try{var pf=JSON.parse(localStorage.getItem('shoupan_prefs')||'{}');if(pf.accent)document.documentElement.setAttribute('data-accent',pf.accent);if(pf.theme)document.documentElement.setAttribute('data-theme',pf.theme)}catch(e){}</script>
<script>try{if(!localStorage.getItem('shoupan_token')){document.documentElement.classList.add('anon');if(!localStorage.getItem('shoupan_guest'))document.documentElement.classList.add('gated')}}catch(e){document.documentElement.classList.add('gated','anon')}</script><style>
:root{--bg:#fff;--fg:#1a1a1a;--mute:#666;--line:#e5e5e5;--up:#d0312d;--dn:#1a8a3a;--card:#f7f7f7;--accent:#d0312d}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#eee;--mute:#999;--line:#333;--up:#ff6b64;--dn:#4cc36b;--card:#202020;--accent:#ff6b64}}
html[data-theme=light]{--bg:#fff;--fg:#1a1a1a;--mute:#666;--line:#e5e5e5;--up:#d0312d;--dn:#1a8a3a;--card:#f7f7f7;color-scheme:light}
html[data-theme=dark]{--bg:#161616;--fg:#eee;--mute:#999;--line:#333;--up:#ff6b64;--dn:#4cc36b;--card:#202020;color-scheme:dark}
html[data-accent=red]{--accent:#d0312d}html[data-accent=gold]{--accent:#c98a1e}html[data-accent=blue]{--accent:#2563eb}html[data-accent=green]{--accent:#16a34a}html[data-accent=purple]{--accent:#7c3aed}html[data-accent=black]{--accent:#222}
html[data-theme=dark][data-accent=black]{--accent:#e5e5e5}
body{background:var(--bg);color:var(--fg);font-family:system-ui,"Microsoft JhengHei",sans-serif;margin:0;padding:0 16px 24px;max-width:1100px;margin:auto}.topbar{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:1px;background:var(--line);border-bottom:1px solid var(--line);margin:0 -16px 16px;overflow-x:auto;scrollbar-width:none}.topbar::-webkit-scrollbar{display:none}.tb-item{background:var(--bg);padding:8px 12px;font-variant-numeric:tabular-nums;white-space:nowrap}.tb-name{font-size:12px;color:var(--mute)}.tb-val{font-size:18px;font-weight:700;line-height:1.3}.tb-chg{font-size:12.5px;font-weight:600}.tb-note{font-size:11px;color:var(--mute);margin-top:1px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px}.sub{color:var(--mute);font-size:13px}
.rules{background:var(--card);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--mute);margin-top:12px}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}th:nth-child(-n+3),td:nth-child(-n+3){text-align:left}
th{color:var(--mute);font-weight:500}.up{color:var(--up)}.dn{color:var(--dn)}a{color:inherit}
.tag{font-size:11px;color:var(--mute);margin-left:4px}.empty{color:var(--mute)}.count{font-weight:400;color:var(--mute);font-size:14px}
h3{font-size:14px;margin:14px 0 6px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media (max-width:900px){.cols{grid-template-columns:1fr}}
table.flow td:first-child,table.flow th:first-child{color:var(--mute);text-align:right;width:1em}table.flow td:nth-child(2),table.flow th:nth-child(2){text-align:left}table.flow td:nth-child(3),table.flow th:nth-child(3){text-align:right}
.tabs{display:flex;gap:6px;flex-wrap:wrap}.tab{border:1px solid var(--line);background:var(--card);color:var(--fg);padding:6px 14px;border-radius:999px;cursor:pointer;font:inherit;font-size:13px}.tab.on{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.star{color:#e6a700;margin-left:4px}.ok{color:var(--up);text-align:center!important}.no{color:var(--mute);text-align:center!important}table.stats td:first-child{text-align:left;font-weight:500}td.post{white-space:normal;min-width:280px;max-width:520px;text-align:left!important;font-size:12.5px;line-height:1.4}td.post a{text-decoration:none;color:var(--mute)}td.post a:hover{color:var(--fg)}.spark{display:block}.tv-live{min-height:80px}tr.soon td{background:color-mix(in srgb,var(--up) 6%,transparent)}ul.notes{font-size:12.5px;color:var(--mute);line-height:1.5;padding-left:18px}.spark.up{color:var(--up)}.spark.dn{color:var(--dn)}tr.surge td{background:color-mix(in srgb,var(--up) 7%,transparent)}.chip.hot{background:var(--up);color:#fff;margin-left:6px;font-weight:600}tr.own td{background:color-mix(in srgb,var(--up) 6%,transparent)}.stabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 12px}.stab{border:1px solid var(--line);background:var(--card);color:var(--fg);padding:6px 14px;border-radius:999px;cursor:pointer;font:inherit;font-size:13px}.stab.on{background:var(--fg);color:var(--bg);border-color:var(--fg)}table.compact td,table.compact th{padding:5px 7px}td.nm{text-align:left!important;white-space:nowrap}td.nm a{font-weight:600;margin-right:2px}td.rates{font-size:12.5px}details.more{margin-top:4px}details.more summary{font-size:13px}.stab b{font-weight:600;margin-left:2px}td.lead{font-size:12.5px;white-space:normal;min-width:200px}td.lead a{font-weight:400;text-decoration:none}tr.grp{cursor:pointer}tr.grp:hover td{background:var(--card)}tr.grp .arrow{display:inline-block;width:14px;color:var(--mute);transition:transform .15s}tr.grp.open .arrow{transform:rotate(90deg)}tr.grp.open td{background:var(--card);font-weight:600}tr.det>td{padding:4px 0 12px 18px;background:var(--card)}table.inner{font-size:12.5px}.roast{margin:14px 0 6px;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,color-mix(in srgb,#ffd166 16%,var(--card)),var(--card));border:1px solid color-mix(in srgb,#ffd166 35%,var(--line))}.roast-title{font-weight:700;font-size:15px;margin-bottom:4px}.roast ul{margin:0;padding-left:18px;font-size:14px;line-height:1.65}.vote{margin:8px 0 6px;padding:12px 16px;border-radius:12px;background:var(--card);border:1px solid var(--line)}.vote-title{font-weight:700;font-size:15px;margin-bottom:8px}.vote-form{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:14px}.vote-form input,.vote-form select{font:inherit;font-size:16px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);width:220px;max-width:100%}.vote-save{font:inherit;font-size:15px;font-weight:800;padding:9px 20px;border-radius:999px;border:0;background:var(--accent);color:var(--bg);cursor:pointer}.vote-save:disabled{opacity:.55;cursor:default}.vote-saved{margin-top:8px;font-size:13.5px;padding:8px 12px;border-radius:10px;background:color-mix(in srgb,var(--accent) 8%,transparent)}.vote-theme{display:flex;flex-wrap:wrap;align-items:center;gap:6px;max-width:100%}.vote-btns{display:flex;gap:8px}.vote-btns button{font:inherit;font-size:14px;padding:6px 16px;border-radius:999px;border:1px solid var(--line);background:var(--bg);color:var(--fg);cursor:pointer}.vote-btns button[data-bias=bull].on,.vote-btns button[data-bias=bull]:hover{background:var(--up);color:#fff;border-color:var(--up)}.vote-btns button[data-bias=bear].on,.vote-btns button[data-bias=bear]:hover{background:var(--dn);color:#fff;border-color:var(--dn)}.vote-msg{font-size:12.5px;color:var(--mute);margin-top:6px}.vote-result{margin-top:10px}.vote-bar{display:flex;border-radius:8px;overflow:hidden;font-size:12.5px;font-weight:600;color:#fff}.vote-bar span{padding:5px 8px;white-space:nowrap;min-width:fit-content}.b-bull{background:var(--up)}.b-bear{background:var(--dn);text-align:right}.vote-sub{font-size:13px;color:var(--mute);margin-top:6px}ol.vote-themes{margin:4px 0 0;padding-left:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13.5px}.vote-recap{font-size:13px;margin-top:10px;padding-top:8px;border-top:1px dashed var(--line)}td.ck{letter-spacing:2px;text-align:center!important}.head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.auth{display:flex;align-items:center;gap:8px;font-size:13px}.auth-user{display:flex;align-items:center;gap:6px}.auth-user img{width:24px;height:24px;border-radius:50%}.auth-out{font:inherit;font-size:12px;padding:3px 10px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);cursor:pointer}.auth-note{color:var(--mute);font-size:12px}.watch-add{display:flex;gap:8px;margin:8px 0}.watch-add input{flex:1;max-width:360px;font:inherit;padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}.watch-add button{font:inherit;padding:7px 16px;border-radius:8px;border:0;background:var(--accent);color:var(--bg);cursor:pointer}.watch-del{border:0;background:none;color:var(--mute);cursor:pointer;font-size:14px}.watch-del:hover{color:var(--up)}td.watch-ind{font-size:12px;color:var(--mute);white-space:normal;min-width:110px;text-align:left!important}.gate-name{font-size:28px;font-weight:800;margin:16px 0 6px}.gate-sub{color:var(--mute);font-size:14px;line-height:1.6;margin-bottom:22px}tr.watch-gh td{background:var(--card);font-weight:700;font-size:13.5px;text-align:left!important;padding-top:10px}.home{margin-top:14px}.home-open{font:inherit;font-size:13.5px;padding:7px 14px;border-radius:999px;border:1px dashed var(--line);background:var(--card);color:var(--fg);cursor:pointer}.home-form{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:14px;max-width:520px}.home-form input{font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);width:220px;max-width:70vw}.home-form button,.home-admin button{font:inherit;font-size:13px;padding:5px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);cursor:pointer}.home-form button[type=submit]{background:var(--up);color:#fff;border-color:var(--up)}.scroll>table td.stk,.scroll>table th.stk{position:sticky;z-index:2;background:var(--bg)}.scroll>table thead th.stk{z-index:3}.scroll>table td.stk-last,.scroll>table th.stk-last{box-shadow:6px 0 6px -6px rgba(0,0,0,.35)}tr.watch-gh td.stk,tr.det td.stk{background:var(--card)}tr.surge td.stk{background:color-mix(in srgb,var(--up) 7%,var(--bg))}tr.own td.stk{background:color-mix(in srgb,var(--up) 6%,var(--bg))}tr.grp.open td.stk{background:var(--card)}html{overflow-x:hidden}.cols>*,.cards>*,.page,.spage,.panel{min-width:0;max-width:100%}.scroll{max-width:100%;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}.pf-head{display:flex;align-items:center;gap:14px;margin:6px 0 4px}.pf-pic{width:56px;height:56px;border-radius:50%;background:var(--card)}.pf-name{font-size:20px;font-weight:800}.pf-set{display:flex;flex-direction:column;gap:14px;font-size:14px}.pf-set input{font:inherit;display:block;margin-top:6px;padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);width:220px}.pf-label{margin-bottom:6px}.pf-accents,.pf-themes{display:flex;flex-wrap:wrap;gap:8px}.pf-accents button,.pf-themes button,.pf-save,.pf-logout{font:inherit;font-size:13px;padding:6px 12px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;display:inline-flex;align-items:center;gap:6px}.pf-accents button span{width:14px;height:14px;border-radius:50%;background:var(--c)}.pf-accents button.on,.pf-themes button.on{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent)}.pf-save{background:var(--accent);color:var(--bg);border-color:var(--accent)}.pf-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.pf-cards div{background:var(--card);border-radius:12px;padding:12px;text-align:center}.pf-cards b{display:block;font-size:22px}.pf-cards span{font-size:12px;color:var(--mute)}@media (max-width:520px){.pf-cards{grid-template-columns:repeat(2,1fr)}}tr.me td{background:color-mix(in srgb,var(--accent) 10%,var(--bg))}.site-foot{margin:40px -16px 0;padding:22px 16px 28px;border-top:1px solid var(--line);background:var(--card);font-size:12.5px;line-height:1.7;color:var(--mute)}.site-foot b{color:var(--fg)}.foot-warn{margin-bottom:12px}.foot-meta{margin-top:10px;font-size:11.5px}.calc-ctl{display:flex;flex-wrap:wrap;gap:16px 28px;margin:6px 0 12px;font-size:14px}.calc-pes,.calc-basis{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.calc-pes button,.calc-basis button{font:inherit;font-size:13px;padding:5px 12px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.calc-pes button.on,.calc-basis button.on{background:var(--accent);border-color:var(--accent);color:var(--bg)}.calc-pe{width:70px;font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}td.calc-fair{background:color-mix(in srgb,var(--accent) 8%,transparent)}#nick-modal{position:fixed;inset:0;z-index:1100;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px}#nick-modal[hidden]{display:none}.nm-box{text-align:center;max-width:340px;width:100%}.nm-input{font:inherit;font-size:16px;width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);text-align:center}.nm-ok{font:inherit;font-size:16px;font-weight:700;margin-top:12px;width:100%;padding:11px;border:0;border-radius:12px;background:var(--accent);color:var(--bg);cursor:pointer}.gate-note a{color:inherit}.foot-meta a{color:inherit}.pf-nick:disabled{opacity:.6}.chips{white-space:normal;min-width:170px;text-align:left!important}.chip{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;margin:1px 2px 1px 0}.chip.good{background:color-mix(in srgb,var(--up) 14%,transparent);color:var(--up)}.chip.bad{background:color-mix(in srgb,var(--dn) 14%,transparent);color:var(--dn)}.chip.mid{background:var(--card);color:var(--mute)}h2{border-top:1px solid var(--line);padding-top:20px}${GATE_CSS}
.ptabs{position:sticky;top:var(--tbh,0px);z-index:15;margin:12px -16px 4px;padding:10px 16px 8px;background:var(--bg);border-bottom:1px solid var(--line);box-shadow:0 6px 10px -8px rgba(0,0,0,.25)}.gtabs{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}.gtab{font:inherit;font-size:15px;font-weight:700;padding:9px 4px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;white-space:nowrap}.gtab:hover{border-color:var(--accent)}.gtab.on{background:var(--accent);border-color:var(--accent);color:var(--bg);box-shadow:0 2px 8px color-mix(in srgb,var(--accent) 40%,transparent)}@media (max-width:520px){.gtabs{grid-template-columns:repeat(3,1fr)}.gtab{font-size:14px;padding:8px 2px}}.subtabs{display:flex;gap:6px;margin-top:8px;overflow-x:auto;scrollbar-width:none}.subtabs::-webkit-scrollbar{display:none}.subtabs.single,.subtabs[hidden]{display:none}.ptab{white-space:nowrap;font:inherit;font-size:13.5px;font-weight:600;padding:6px 14px;border-radius:999px;border:1px solid transparent;background:none;color:var(--mute);cursor:pointer}.ptab:hover{color:var(--fg)}.ptab.on{color:var(--accent);border-color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent)}
.page>h2:first-child,.page>.rules:first-child+h2{border-top:0}.page{padding-top:4px}details{margin-top:10px;font-size:13px}summary{cursor:pointer;color:var(--mute);padding:6px 0}.hint{font-size:13px;color:var(--mute)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}.card{background:var(--card);border-radius:10px;padding:4px 14px 10px}.card h3{margin:12px 0 6px}
ul.news{list-style:none;padding:0;margin:0;font-size:13.5px}ul.news li{padding:7px 0;border-bottom:1px solid var(--line);line-height:1.45}ul.news li:last-child{border-bottom:0}ul.news a{text-decoration:none}ul.news a:hover{text-decoration:underline}.meta{display:block;color:var(--mute);font-size:12px;margin-top:2px}
</style></head><body>
<div id="nick-modal" hidden><div class="nm-box"><img src="/TW-STOCK-/icon-192.png?v=2" alt="" class="gate-logo"><div class="gate-name">歡迎加入飆股情報局</div><div class="gate-sub">先幫自己取一個暱稱吧！<br>排行榜和投票會顯示暱稱，不會公開你的信箱。</div><input class="nm-input" maxlength="12" placeholder="2～12 個字，例如 PCB 獵人" autocomplete="off"><button type="button" class="nm-ok">開始使用</button><div class="gate-err nm-err"></div><div class="gate-note">之後可以在「個人檔案」修改，每 30 天一次</div></div></div>
${renderGate()}
${extra.topbar ? renderTopBar(extra.topbar) : ''}
<div class="head"><h1>飆股情報局</h1><div class="auth"><span class="auth-user" hidden></span><button class="auth-out" hidden>登出</button><div id="gsi-btn"></div><span class="auth-note"></span></div></div><div class="sub">交易日 ${d}　產出時間 ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>
${renderNav()}
${extra.roast && extra.roast.length ? `<div class="roast"><div class="roast-title">🎤 收盤總結 <span class="tag">${d}</span></div><ul>${extra.roast.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>` : ''}
${renderVote(d, extra)}
<div class="hint" style="margin-top:6px">除「千金龍頭」外，所有台股頁面只列當日成交量 ≥ ${MIN_LOTS_ALL.toLocaleString()} 張的股票</div>
<div class="page" data-p="main">
${renderBest(extra)}
<h2>一根K棒站上三線（原始條件）</h2>
<div class="rules">① MA5 / MA10 / MA20 皆上彎　② 開盤 ≤ 三線最低、收盤 &gt; 三線最高　③ 成交量 &gt; ${MIN_VOLUME_LOTS.toLocaleString()} 張　④ 最新月營收 YoY 為正，且不低於上個月　⑤ 依收盤是否站上季線(MA60)分組</div>
<h2>站上季線 <span class="count">${a.length} 檔</span></h2>${renderTable(a)}
<h2>未站上季線 <span class="count">${b.length} 檔</span></h2>${renderTable(b)}
${renderAllCross(extra.allCross, picks)}
</div>
<div class="page" data-p="watch" hidden>${renderWatch()}</div>
<div class="page" data-p="profile" hidden>${renderProfile()}</div>
<div class="page" data-p="latent" hidden>
<h2>潛伏股＋投信買超 <span class="count">${extra.latentTrust.length} 檔・回測 20 日勝率 72.8%、平均 20 日報酬 +7.6%（隨機持有 +2.7%）</span></h2>
<p class="hint">營收加速、股價還在低檔，而且投信今天開始買。回測期間（2026/3～9 月，含當日量 ≥ 3,000 張條件，401 筆）前半 81.9%、後半 66.4%，是目前最穩定的組合。大甲在 7/29～8/12 起漲前就出現在潛伏股名單。</p>
${extra.latentTrust.length ? renderLatent(extra.latentTrust, true) : '<p class="empty">今日無</p>'}
${renderLatent(extra.latent)}</div>
<div class="page" data-p="cup" hidden>${renderCups(extra.cups)}</div>
<div class="page" data-p="three" hidden>${renderThreeUp(extra.threeGroups)}</div>
<div class="page" data-p="ir50" hidden>${extra.ir50 ? renderIR50(extra.ir50) : '<p class="empty">0050 資料更新失敗</p>'}</div>
<div class="page" data-p="industry" hidden>${extra.crashed && extra.crashed.length ? renderLeaders(extra) : ''}${extra.industry ? renderIndustry(extra.industry) : '<p class="empty">產業趨勢計算失敗</p>'}${extra.crashed && extra.crashed.length ? '' : renderLeaders(extra)}</div>
<div class="page" data-p="locked" hidden>${extra.locked ? renderLocked(extra.locked) : '<p class="empty">主力鎖碼資料更新失敗</p>'}</div>
<div class="page" data-p="holders" hidden>${renderHolders(extra.holders)}</div>
<div class="page" data-p="aetf" hidden>${extra.aetf && extra.aetf.etfs.length ? renderActiveEtf(extra.aetf) : '<p class="empty">主動式 ETF 資料更新失敗</p>'}</div>
<div class="page" data-p="flow" hidden>${renderFlow(flow, picks)}</div>
<div class="page" data-p="track" hidden><div><div class="stabs"><button class="stab on" data-s="tk-cross">一K站三線</button><button class="stab" data-s="tk-cup">杯柄型態</button></div><div class="spage" data-s="tk-cross">${renderTracking(extra.tracking)}</div><div class="spage" data-s="tk-cup" hidden>${extra.cupTracking ? renderTracking(extra.cupTracking, { col: "狀態", cell: (p) => p.status + (p.tight ? "・收斂" : ""), hint: "每天「杯柄型態」頁上榜的股票（柄整理中或近期帶量突破），自 " + TRACK_START.slice(4, 6) + "/" + TRACK_START.slice(6) + " 起；之前的日子是用當時的行情回推（營收用最新一期）。" }) : '<p class="empty">杯柄追蹤計算失敗</p>'}</div></div></div>
<div class="page" data-p="news" hidden>${renderNews(extra)}</div>
<div class="page" data-p="macro" hidden>${extra.macro ? renderMacro(extra.macro) : '<p class="empty">總經資料更新失敗</p>'}</div>
<footer class="site-foot">
  <div class="foot-warn"><b>⚠️ 投資警語</b><br>本網站所有內容（包含選股名單、族群趨勢、籌碼分析、回測勝率、收盤總結與投票結果）皆由程式依公開資料自動整理，<b>僅供參考與研究交流，不構成任何投資建議、買賣推薦、要約或招攬</b>，亦非證券投資顧問服務。投資人應獨立判斷、審慎評估並自負投資風險。資料可能有延遲、遺漏或錯誤，本站不保證其正確性與完整性，對使用本站資訊所生之任何損失不負任何責任。回測與歷史績效不代表未來表現。</div>
  <div class="foot-src"><b>資料來源</b>：臺灣證券交易所、證券櫃檯買賣中心、臺灣期貨交易所、臺灣集中保管結算所、公開資訊觀測站、MoneyDJ、Yahoo Finance、Trading Economics、美國財政部、TradingView、Google 新聞。各資料之著作權歸原提供單位所有。</div>
  <div class="foot-meta"><a href="/TW-STOCK-/privacy.html">隱私權政策與服務條款</a>・飆股情報局・資料更新時間 ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>
</footer>
<script>
(function () {
  function load(page) {
    page.querySelectorAll('.tv-live:not([data-done])').forEach(function (box) {
      box.setAttribute('data-done', '1');
      var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
      box.innerHTML = '<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>';
      var sc = document.createElement('script');
      sc.src = 'https://s3.tradingview.com/external-embedding/embed-widget-tickers.js';
      sc.async = true;
      sc.text = JSON.stringify({ symbols: JSON.parse(box.getAttribute('data-symbols')), colorTheme: dark ? 'dark' : 'light', isTransparent: true, showSymbolLogo: false, locale: 'zh_TW' });
      box.firstChild.appendChild(sc);
    });
  }
  document.querySelectorAll('.ptab').forEach(function (t) {
    t.addEventListener('click', function () {
      var p = document.querySelector('.page[data-p="' + t.dataset.p + '"]');
      if (p) setTimeout(function () { load(p); }, 0);
    });
  });
})();
</script>
${clientScript()}
<script>
(function () {
  // 表頭是這些字的欄位算「名稱欄」，它和它左邊的欄位都固定
  var NAME = ['名稱', '股票', '個股', '族群', '產業', '公司', '項目', '分組', '天期', '來源'];
  function apply(root) {
    (root || document).querySelectorAll('.scroll > table').forEach(function (t) {
      if (!t.offsetParent) return; // 隱藏中的表格量不到寬度，切換分頁時再算
      var head = t.tHead && t.tHead.rows[0];
      if (!head) return;
      var ths = [].slice.call(head.cells), n = 1;
      for (var i = 0; i < Math.min(3, ths.length); i++) if (NAME.indexOf(ths[i].textContent.trim().split(/\\s/)[0]) >= 0) { n = i + 1; break; }
      var lefts = [], x = 0;
      for (var j = 0; j < n; j++) { lefts.push(x); x += ths[j].getBoundingClientRect().width; }
      [].forEach.call(t.rows, function (tr) {
        var cells = tr.cells;
        if (cells.length === 1 && cells[0].colSpan > 1) { cells[0].classList.add('stk'); cells[0].style.left = '0px'; return; } // 分組標題列
        for (var k = 0; k < n && k < cells.length; k++) { cells[k].classList.add('stk'); cells[k].style.left = lefts[k] + 'px'; cells[k].classList.toggle('stk-last', k === n - 1); }
      });
    });
  }
  window.__applySticky = apply;
  function later(root) { setTimeout(function () { apply(root); }, 30); }
  // 置頂指數列高度：分頁列黏在它下面
  function tbh() { var tb = document.querySelector('.topbar'); document.documentElement.style.setProperty('--tbh', (tb ? tb.offsetHeight : 0) + 'px'); }
  tbh(); window.addEventListener('resize', function () { tbh(); apply(); });
  document.addEventListener('click', function (e) { if (e.target.closest('.ptab,.stab,tr.grp,summary,.watch-add button,.watch-del')) later(); });
  document.addEventListener('toggle', function () { later(); }, true);
  new MutationObserver(function () { later(document.querySelector('.watch-table')); }).observe(document.querySelector('.watch-table') || document.body, { childList: true });
  apply();
})();
</script>
<script>document.querySelectorAll('tr.grp').forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest('a')) return; var d = tr.nextElementSibling; d.hidden = !d.hidden; tr.classList.toggle('open', !d.hidden); }; });</script>
<script>document.querySelectorAll('.stab').forEach(function (b) { b.onclick = function () { var box = b.parentNode.parentNode; box.querySelectorAll('.stab').forEach(function (x) { x.classList.toggle('on', x === b); }); box.querySelectorAll('.spage').forEach(function (p) { p.hidden = p.dataset.s !== b.dataset.s; }); }; });</script>
<script>
(function () {
  var last = {};
  try { last = JSON.parse(localStorage.getItem('shoupan_nav') || '{}'); } catch (e) {}
  document.querySelectorAll('.subtabs .ptab').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = b.parentNode.dataset.g; last[g] = b.dataset.p;
      try { localStorage.setItem('shoupan_nav', JSON.stringify(last)); } catch (e) {}
    });
  });
  document.querySelectorAll('.gtab').forEach(function (gb) {
    gb.onclick = function () {
      var g = gb.dataset.g;
      document.querySelectorAll('.gtab').forEach(function (x) { x.classList.toggle('on', x === gb); });
      document.querySelectorAll('.subtabs').forEach(function (r) { r.hidden = r.dataset.g !== g; });
      var row = document.querySelector('.subtabs[data-g="' + g + '"]');
      var target = (last[g] && row.querySelector('.ptab[data-p="' + last[g] + '"]')) || row.querySelector('.ptab');
      target.click();
    };
  });
})();
</script>
<script>document.querySelectorAll('.ptab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.ptab').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.page').forEach(p=>p.hidden=p.dataset.p!==b.dataset.p);scrollTo(0,0)})</script>
${shareScript()}
${pushScript(VOTE_API)}
</body></html>`;
}

if (require.main === module) {
  main().catch((e) => {
    console.error('執行失敗：', e.stack || e.message);
    process.exit(1);
  });
}

module.exports = { resultsKey, getRevenue, getShares, renderTopBar, fetchTwse, fetchTpex, getRevenueMonth, prevYM, getDay, getInsti, getJSON, ma, num, sleep, ymd, CACHE };
