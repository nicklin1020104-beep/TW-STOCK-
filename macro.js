// 總經：油價、金價、美元、公債殖利率、美國 CPI／PPI／就業、ISM PMI
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cache', 'macro');
const UA = { 'User-Agent': 'Mozilla/5.0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, opt = {}) {
  const res = await fetch(url, { ...opt, headers: { ...UA, ...(opt.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// 同一天只抓一次（BLS 免金鑰版每天有次數限制）
async function cachedDaily(name, dateStr, fn) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${name}_${dateStr}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = await fn();
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

// ---------- 商品與美元（Yahoo） ----------
const ASSETS = [
  ['CL=F', 'WTI 原油', '美元/桶'],
  ['BZ=F', '布蘭特原油', '美元/桶'],
  ['GC=F', '黃金', '美元/盎司'],
  ['SI=F', '白銀', '美元/盎司'],
  ['DX-Y.NYB', '美元指數', ''],
  ['^VIX', 'VIX 恐慌指數', ''],
];
async function getAssets(list = ASSETS) {
  const out = [];
  for (const [sym, name, unit] of list) {
    try {
      const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d`));
      const r = j.chart.result[0];
      const pts = r.timestamp.map((t, i) => [t * 1000, r.indicators.quote[0].close[i]]).filter((p) => p[1] != null);
      // 最後一根日 K 常是前一日收盤，改用即時報價
      const live = r.meta.regularMarketPrice, liveT = r.meta.regularMarketTime * 1000;
      if (live != null && pts.length) {
        const off = (r.meta.gmtoffset || 0) * 1000; // 用該市場自己的時區判斷日期（台股、日股不是美東時間）
        const day = (t) => new Date(t + off).toISOString().slice(0, 10);
        if (day(pts[pts.length - 1][0]) === day(liveT)) pts[pts.length - 1] = [liveT, live];
        else if (liveT > pts[pts.length - 1][0]) pts.push([liveT, live]);
      }
      out.push({ sym, name, unit, pts, time: liveT });
    } catch (e) {
      out.push({ sym, name, unit, pts: [], error: e.message });
    }
    await sleep(300);
  }
  return out;
}

// ---------- 美國公債殖利率（財政部每日殖利率曲線） ----------
async function getYields() {
  const y = new Date().getUTCFullYear();
  const rows = [];
  for (const yr of [y - 1, y]) {
    const csv = await get(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${yr}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${yr}&page&_format=csv`);
    const lines = csv.trim().split(/\r?\n/);
    const head = lines[0].split(',').map((h) => h.replace(/"/g, ''));
    for (const l of lines.slice(1)) {
      const c = l.split(',');
      const [m, d, yy] = c[0].split('/');
      const o = { date: `${yy}-${m}-${d}` };
      head.forEach((h, i) => i && c[i] !== '' && (o[h] = +c[i]));
      rows.push(o);
    }
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ---------- 經濟數據：Trading Economics 行事曆（實際、前期、市場預期、下次公布） ----------
// [名稱, 網址, 行事曆事件名稱（沒有行事曆表的頁面用摘要文字解析）]
const INDICATORS = [
  ['美國 ISM 製造業 PMI', 'united-states/business-confidence', 'ISM Manufacturing PMI'],
  ['美國 ISM 服務業 PMI', 'united-states/non-manufacturing-pmi', null],
  ['台灣製造業 PMI', 'taiwan/manufacturing-pmi', null],
  ['CPI 年增率', 'united-states/inflation-cpi', 'Inflation Rate YoY'],
  ['CPI 月增率', 'united-states/inflation-rate-mom', 'Inflation Rate MoM'],
  ['核心 CPI 年增率', 'united-states/core-inflation-rate', 'Core Inflation Rate YoY'],
  ['核心 CPI 月增率', 'united-states/core-inflation-rate-mom', 'Core Inflation Rate MoM'],
  ['PPI 年增率', 'united-states/producer-prices-change', 'PPI YoY'],
  ['PPI 月增率', 'united-states/producer-price-inflation-mom', 'PPI MoM'],
  ['核心 PPI 年增率', 'united-states/core-producer-prices-yoy', 'Core PPI YoY'],
  ['PCE 年增率', 'united-states/pce-price-index-annual-change', 'PCE Price Index YoY'],
  ['核心 PCE 年增率', 'united-states/core-pce-price-index-annual-change', 'Core PCE Price Index YoY'],
  ['核心 PCE 月增率', 'united-states/core-pce-price-index-mom', 'Core PCE Price Index MoM'],
  ['個人消費支出月增率', 'united-states/personal-spending', 'Personal Spending MoM'],
  ['失業率', 'united-states/unemployment-rate', 'Unemployment Rate'],
  ['非農就業人數', 'united-states/non-farm-payrolls', 'Non Farm Payrolls'],
  ['聯準會利率決策', 'united-states/interest-rate', 'Fed Interest Rate Decision'],
];
const MONTHS = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
const MON3 = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

// 'YYYY-MM-DD' + '12:30 PM'（GMT）→ Date
const gmt = (d, t) => {
  const [hm, ap] = t.split(' ');
  let [h, mi] = hm.split(':').map(Number);
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return new Date(`${d}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00Z`);
};

async function getIndicator([name, slug, event]) {
  const html = await get(`https://tradingeconomics.com/${slug}`);
  const desc = ((html.match(/id="description"[^>]*>([\s\S]*?)<\/(?:div|h2|p)>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/&#39;|&rsquo;|’/g, "'").trim();
  const text = desc.split(/(?<=\.)\s/).slice(0, 2).join(' ');
  const i = html.indexOf('id="calendar"');
  if (event && i > 0) {
    const t = html.slice(i, html.indexOf('</table>', i));
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
      .map((x) => [...x[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()))
      .filter((r) => r.length >= 8 && r[2] === event);
    const lastIdx = rows.map((r) => !!r[4]).lastIndexOf(true);
    const last = rows[lastIdx], next = rows.slice(lastIdx + 1).find((r) => !r[4]);
    if (last) {
      const refYM = (r, date) => {
        if (!r[3] || !MON3[r[3]]) return null;
        let y = +date.slice(0, 4), mo = MON3[r[3]];
        if (mo > +date.slice(5, 7)) y--; // 1 月公布 12 月資料
        return `${y}-${String(mo).padStart(2, '0')}`;
      };
      return {
        name, slug, text,
        ym: refYM(last, last[0]),
        released: gmt(last[0], last[1]).toISOString(),
        actual: last[4], previous: last[5], consensus: last[6] || null, teForecast: last[7] || null,
        next: next ? { at: gmt(next[0], next[1]).toISOString(), ym: refYM(next, next[0]), consensus: next[6] || null, teForecast: next[7] || null, previous: next[5] || null } : null,
      };
    }
  }
  // 沒有行事曆：從摘要解析「rose to 55.4 in August 2026 from 54.1 ..., beating forecasts of 54.3」
  const mm = desc.match(/([\d.]+) in (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})/);
  const prev = desc.match(/from (?:[^0-9]{0,60}?)([\d.]+)/);
  const exp = desc.match(/(?:expectations|forecasts?|consensus|estimates?) (?:of|for) ([\d.]+)/);
  return {
    name, slug, text,
    ym: mm ? `${mm[3]}-${String(MONTHS[mm[2]]).padStart(2, '0')}` : null,
    actual: mm ? mm[1].replace(/\.$/, '') : null, previous: prev ? prev[1].replace(/\.$/, '') : null, consensus: exp ? exp[1].replace(/\.$/, '') : null, next: null,
  };
}

async function getIndicators() {
  const out = [];
  for (const ind of INDICATORS) {
    try {
      out.push(await getIndicator(ind));
    } catch (e) {
      out.push({ name: ind[0], error: e.message });
    }
    await sleep(700);
  }
  return out;
}

async function buildMacro(dateStr) {
  const safe = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      console.error('總經資料失敗：', e.message);
      return null;
    }
  };
  const [assets, yields, indicators] = [
    await safe(getAssets),
    await safe(getYields),
    await safe(() => cachedDaily('indicators', dateStr, getIndicators)),
  ];
  return { assets: assets || [], yields: yields || [], indicators: indicators || [] };
}

const US_INDEXES = [
  ['^DJI', '道瓊工業指數', '點'],
  ['^GSPC', 'S&P 500', '點'],
  ['^IXIC', '那斯達克', '點'],
  ['^SOX', '費城半導體', '點'],
];
const getUSIndexes = () => getAssets(US_INDEXES);

// 頁面置頂：加權、台指期、日經、KOSPI、費半
const TOP = [
  ['^TWII', '加權指數'],
  ['^N225', '日經 225'],
  ['^KS11', '韓國 KOSPI'],
  ['^SOX', '費城半導體'],
];
// 期交所盤中行情（mis.taifex.com.tw）：MarketType 0 = 日盤、1 = 夜盤
async function getMIS(marketType) {
  const j = JSON.parse(
    await get('https://mis.taifex.com.tw/futures/api/getQuoteList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MarketType: marketType, SymbolType: 'F', KindID: '1', CID: 'TXF', ExpireMonth: '', RowSize: '全部', PageNo: '', SortColumn: '', AscDesc: 'A' }),
    })
  );
  return (j.RtData && j.RtData.QuoteList) || [];
}
const misQuote = (q, session) => {
  if (!q || !q.CLastPrice) return null;
  const t = q.CTime ? q.CTime.padStart(6, '0') : '000000';
  // 夜盤凌晨的成交，日期算前一天開盤日，時間要換到隔天
  let ms = Date.parse(`${q.CDate.slice(0, 4)}-${q.CDate.slice(4, 6)}-${q.CDate.slice(6)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4)}+08:00`);
  if (session === '夜盤' && +t.slice(0, 2) < 15) ms += 86400000;
  return { session, last: +q.CLastPrice, chg: +q.CDiff, pct: +q.CDiffRate, ref: +q.CRefPrice, time: ms, name: q.DispCName };
};
// 台指期近月：取日盤、夜盤中時間較新的為主，另一個當參考
async function getTXF() {
  const [d, n] = await Promise.all([getMIS('0'), getMIS('1')]);
  const near = (l) => l.filter((q) => /-[FM]$/.test(q.SymbolID))[0]; // 清單第一筆期貨就是近月
  const day = misQuote(near(d), '日盤'), night = misQuote(near(n), '夜盤');
  const spot = misQuote(d.find((q) => /-S$/.test(q.SymbolID)), '現貨');
  const main = [day, night].filter(Boolean).sort((a, b) => b.time - a.time)[0] || null;
  return { main, other: main === day ? night : day, spot };
}
async function getTopBar() {
  const idx = await getAssets(TOP.map(([s, n]) => [s, n, '']));
  // 昨收用 range=1d 的 chartPreviousClose（日 K 有時會缺一天，拿前一根當昨收會算錯漲跌）
  for (const a of idx) {
    try { a.prevClose = JSON.parse(await get('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(a.sym) + '?range=1d&interval=1d')).chart.result[0].meta.chartPreviousClose || null; } catch {}
  }
  let txf = null;
  try {
    txf = await getTXF();
    // 加權指數盤中改用期交所的即時現貨（比 Yahoo 即時）
    const tw = idx.find((a) => a.sym === '^TWII');
    if (tw && txf.spot && txf.spot.time > (tw.time || 0)) {
      tw.live = { last: txf.spot.last, chg: txf.spot.last - txf.spot.ref, pct: (txf.spot.last / txf.spot.ref - 1) * 100, time: txf.spot.time };
    }
  } catch (e) {
    console.error('台指期失敗：', e.message);
  }
  return { idx, txf };
}

module.exports = { buildMacro, getUSIndexes, getTopBar };
