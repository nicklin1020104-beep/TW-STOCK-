// 主力鎖碼股：大戶持續增加、法人連續買超且籌碼集中、融資退場、股價站上月線但還沒噴出
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cache', 'margin');
const UA = { 'User-Agent': 'Mozilla/5.0' };
const num = (s) => {
  const v = parseFloat(String(s).replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
};

const P = {
  HOLDER_WEEKS: 2, // 千張大戶持股連續增加至少幾週
  FLOW_DAYS: 10, // 觀察近幾個交易日的法人
  FLOW_BUY_DAYS: 6, // 其中外資＋投信買超至少幾天
  CONCENTRATION: 5, // 法人累計買超 ÷ 期間成交量 至少 %
  MARGIN_DAYS: 5, // 融資餘額比幾天前減少
  MAX_RUN20: 25, // 近 20 日漲幅不超過 %（還沒噴完）
};

// 融資餘額（張）：{ code: balance }
async function getMargin(date) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${date}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = {};
  const tw = await (await fetch(`https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?date=${date}&selectType=ALL&response=json`, { headers: UA })).json();
  const t = tw.tables && tw.tables.find((x) => x.data && x.data.length > 100);
  if (t) for (const r of t.data) if (/^[1-9]\d{3}$/.test(r[0].trim())) out[r[0].trim()] = num(r[6]); // 融資今日餘額
  await new Promise((r) => setTimeout(r, 2000));
  const q = `${date.slice(0, 4)}%2F${date.slice(4, 6)}%2F${date.slice(6)}`;
  const tp = await (await fetch(`https://www.tpex.org.tw/www/zh-tw/margin/balance?date=${q}&id=&response=json`, { headers: UA })).json();
  const o = tp.tables && tp.tables[0];
  if (o) for (const r of o.data) if (/^[1-9]\d{3}$/.test(String(r[0]).trim())) out[String(r[0]).trim()] = num(r[6]); // 資餘額
  if (Object.keys(out).length > 500) fs.writeFileSync(file, JSON.stringify(out));
  return out;
}

// days：由舊到新的每日行情；instiOf(date) 回傳該日三大法人；holders：tdcc.analyze 的結果
async function buildLocked({ days, T, instiOf, holders, minLots }) {
  const today = days[T].data;
  const flowDates = days.slice(T - P.FLOW_DAYS + 1, T + 1).map((d) => d.date);
  const flows = [];
  for (const d of flowDates) flows.push(await instiOf(d));
  const [mNow, mPrev] = [await getMargin(days[T].date), await getMargin(days[T - P.MARGIN_DAYS].date)];
  const holderMap = Object.fromEntries((holders.rows || []).map((h) => [h.code, h]));

  const rows = [];
  for (const [code, q] of Object.entries(today)) {
    if (q.close == null || (q.vol || 0) / 1000 < minLots) continue;
    // ① 千張大戶
    const h = holderMap[code];
    const okHolder = !!h && h.streak >= P.HOLDER_WEEKS;
    // ② 法人：外資＋投信
    let buyDays = 0, net = 0, vol = 0;
    flowDates.forEach((d, i) => {
      const x = flows[i] && flows[i][code];
      const dayVol = days[T - P.FLOW_DAYS + 1 + i].data[code];
      if (x) {
        const n = (x.foreign || 0) + (x.trust || 0);
        net += n;
        if (n > 0) buyDays++;
      }
      if (dayVol) vol += dayVol.vol || 0;
    });
    const conc = vol ? (net / vol) * 100 : 0;
    const okFlow = buyDays >= P.FLOW_BUY_DAYS && conc >= P.CONCENTRATION;
    // ③ 融資
    const mN = mNow[code], mP = mPrev[code];
    const marginChg = mN != null && mP ? ((mN - mP) / mP) * 100 : null;
    const okMargin = marginChg != null && mN < mP;
    // ④ 價格
    const closes = days.slice(T - 19, T + 1).map((d) => (d.data[code] ? d.data[code].close : null));
    if (closes.some((v) => v == null)) continue;
    const ma20 = closes.reduce((a, b) => a + b, 0) / 20;
    const run20 = (q.close / closes[0] - 1) * 100;
    const okPrice = q.close > ma20 && run20 <= P.MAX_RUN20;

    const score = okHolder + okFlow + okMargin + okPrice;
    if (score < 3 || !okFlow) continue; // 法人集中是核心條件
    const pc = days[T - 1].data[code] && days[T - 1].data[code].close;
    rows.push({
      code, name: q.name, mkt: q.mkt, close: q.close, chg: pc ? (q.close / pc - 1) * 100 : null, lots: Math.round(q.vol / 1000),
      holderWeeks: h ? h.streak : 0, holderPp: h ? h.pctChg : null, holderPct: h ? h.pct : null,
      buyDays, netLots: Math.round(net / 1000), conc, marginChg, run20, ma20,
      okHolder, okFlow, okMargin, okPrice, score,
    });
  }
  rows.sort((a, b) => b.score - a.score || b.conc - a.conc);
  return { all: rows.filter((r) => r.score === 4), near: rows.filter((r) => r.score === 3), params: P, flowFrom: flowDates[0] };
}

module.exports = { buildLocked, getMargin };
