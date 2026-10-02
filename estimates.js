// 外資（分析師共識）預估：今年、明年 EPS 與目標價，來源 Yahoo Finance
// 台股分析師多為外資券商。每天抓一次，存 cache/est/YYYYMMDD.json
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cache', 'est');
const UA = 'Mozilla/5.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Yahoo 需要 cookie + crumb
async function session() {
  const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
  const cookie = (r1.headers.getSetCookie ? r1.headers.getSetCookie() : [r1.headers.get('set-cookie') || '']).map((c) => c.split(';')[0]).join('; ');
  const crumb = await (await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, Cookie: cookie } })).text();
  if (!crumb || crumb.length > 40) throw new Error('取得 Yahoo crumb 失敗');
  return { cookie, crumb };
}

async function one(sess, symbol) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=earningsTrend,financialData&crumb=${encodeURIComponent(sess.crumb)}`;
  const j = await (await fetch(url, { headers: { 'User-Agent': UA, Cookie: sess.cookie } })).json();
  const r = j.quoteSummary && j.quoteSummary.result && j.quoteSummary.result[0];
  if (!r) return null;
  const v = (x) => (x && typeof x.raw === 'number' ? x.raw : null);
  const trend = (r.earningsTrend && r.earningsTrend.trend) || [];
  const y0 = trend.find((t) => t.period === '0y'), y1 = trend.find((t) => t.period === '+1y');
  const f = r.financialData || {};
  const out = {
    e0: y0 ? v(y0.earningsEstimate.avg) : null, // 今年預估 EPS
    e1: y1 ? v(y1.earningsEstimate.avg) : null, // 明年預估 EPS
    n: y0 ? v(y0.earningsEstimate.numberOfAnalysts) : null,
    tp: v(f.targetMeanPrice), // 平均目標價
    tpH: v(f.targetHighPrice),
    tpL: v(f.targetLowPrice),
    tpN: v(f.numberOfAnalystOpinions),
    rec: f.recommendationKey || null,
  };
  return out.e0 == null && out.tp == null ? null : out;
}

// codes: [{ code, otc }]
async function getEstimates(dateStr, codes) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${dateStr}.json`);
  const have = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const todo = codes.filter((c) => !(c.code in have));
  if (todo.length) {
    const sess = await session();
    for (const c of todo) {
      try {
        have[c.code] = await one(sess, `${c.code}.${c.otc ? 'TWO' : 'TW'}`);
      } catch {
        have[c.code] = null;
      }
      await sleep(350);
    }
    fs.writeFileSync(file, JSON.stringify(have));
  }
  return have;
}

module.exports = { getEstimates };
