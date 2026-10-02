// 主動式 ETF 每日持股與加碼／減碼（資料來自各投信官網每日公告的申購買回清單 PCF）
// 只追蹤規模最大、最熱門的幾檔；每天存一份持股快照，和上一份比較算出加減碼
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cache', 'activeetf');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' };
const ETFS = [
  { code: '00981A', name: '主動統一台股增長', issuer: 'president' },
  { code: '00403A', name: '主動統一升級50', issuer: 'president' },
  { code: '00991A', name: '主動復華未來50', issuer: 'fuhhwa' },
  { code: '00406A', name: '主動中信台灣收益', issuer: 'ctbc' },
  { code: '00982A', name: '主動群益台灣強棒', issuer: 'capital' },
  { code: '00980A', name: '主動野村臺灣優選', issuer: 'nomura' },
];

const num = (v) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[,%NT$\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const twToday = () => new Date(Date.now() + 8 * 3600000);
const dash = (s) => String(s).replace(/[-/]/g, '').slice(0, 8); // '2026-08-04' / '2026/08/04' → '20260804'
const slashDate = (d) => `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
const rocDate = (d) => `${d.getUTCFullYear() - 1911}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
const isStockCode = (c) => /^\d{4}$/.test(c);

async function http(url, opt = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { ...opt, headers: { ...UA, ...(opt.headers || {}) }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    } catch (e) {
      if (i === 2) throw e;
      await sleep(3000);
    }
  }
}
const postJSON = (url, body, headers = {}) => http(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
// 有些投信回「JSON 字串」（雙層編碼）
const parse2 = (t) => {
  const d = JSON.parse(t);
  return typeof d === 'string' ? JSON.parse(d) : d;
};

// ---- 各投信 ----
const issuers = {
  // 統一投信：PCF 頁建立 cookie 並取得代碼對照，再 POST GetPCF（給未來日期＝最新一份）
  async president(code, at) {
    // 這個網站會先設 cookie 再轉址，要自己帶著 cookie 跟轉址
    const jar = {};
    let url = 'https://www.ezmoney.com.tw/ETF/Transaction/PCF', page;
    for (let i = 0; i < 6; i++) {
      page = await fetch(url, { headers: { ...UA, Cookie: Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ') }, redirect: 'manual', signal: AbortSignal.timeout(60000) });
      for (const c of page.headers.getSetCookie()) { const [kv] = c.split(';'); const i2 = kv.indexOf('='); jar[kv.slice(0, i2).trim()] = kv.slice(i2 + 1); }
      if (page.status < 300 || page.status >= 400) break;
      url = new URL(page.headers.get('location'), url).href;
    }
    const cookie = Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
    const html = await page.text();
    const m = html.match(/id=['"]DataFundList['"][^>]*data-content=['"]([\s\S]*?)['"]/);
    if (!m) throw new Error('統一：找不到基金對照');
    const raw = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const fund = JSON.parse(raw).find((f) => (f.sStockNo || '').trim() === code);
    if (!fund) throw new Error('統一：找不到 ' + code);
    const q = at || new Date(twToday().getTime() + 3 * 86400000);
    const r = await postJSON('https://www.ezmoney.com.tw/ETF/Transaction/GetPCF', { fundCode: fund.sFundCode, date: rocDate(q), specificDate: !!at }, { Referer: 'https://www.ezmoney.com.tw/ETF/Transaction/PCF', Cookie: cookie });
    const d = parse2(await r.text());
    const st = (d.asset || []).find((a) => a.AssetCode === 'ST');
    const pcf = (d.pcf || [])[0];
    if (!st || !pcf) throw new Error('統一：沒有持股明細');
    const td = String(pcf.TranDate);
    const dm = td.match(/Date\((\d+)\)/);
    const date = dm ? ymd(new Date(+dm[1] + 8 * 3600000)) : dash(td);
    const amt = Object.fromEntries((d.pcf || []).map((x) => [x.PCFCode, x.Amount]));
    return { date, scale: num(amt.NAV), rows: st.Details.map((x) => ({ code: String(x.DetailCode).trim(), name: String(x.DetailName).trim(), shares: num(x.Share), weight: num(x.NavRate) })) };
  },
  // 復華投信：fundList 取 fundID，assets?qDate= 往回找最近有資料的一天
  async fuhhwa(code, at) {
    const list = await (await http('https://www.fhtrust.com.tw/api/fundList?ec001=3')).json();
    const f = (list.result || []).find((x) => (x.etf002 || '').trim() === code);
    if (!f) throw new Error('復華：找不到 ' + code);
    for (let back = 0; back < 8; back++) {
      const q = slashDate(new Date((at || twToday()).getTime() - back * 86400000));
      const d = await (await http(`https://www.fhtrust.com.tw/api/assets?fundID=${f.fundID}&qDate=${encodeURIComponent(q)}`)).json();
      const r = (d.result || [])[0];
      const rows = r && (r.detail || []).filter((x) => x.ftype === '股票' && (x.stockid || '').trim());
      if (rows && rows.length && r.dDate) return { date: dash(r.dDate), scale: num(r.pcf_FundNav), rows: rows.map((x) => ({ code: x.stockid.trim(), name: x.stockname.trim(), shares: num(x.qshare), weight: num(x.prate_addaccint) })) };
    }
    throw new Error('復華：近 8 天沒有資料');
  },
  // 中信投信：先拿 token，ETFList 取 FID，ETFHoldingWeight 往回找
  async ctbc(code, at) {
    const B = 'https://www.ctbcinvestments.com.tw/API';
    // token 要搭配同一個 cookie session 使用
    const auth = await postJSON(`${B}/home/AuthToken?token=www.ctbcinvestments.com`, {});
    const ck = { Cookie: auth.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ') };
    const tk = parse2(await auth.text()).Data.token;
    const list = parse2(await (await postJSON(`${B}/etf/ETFList?token=${tk}`, {}, ck)).text());
    const rowsL = Array.isArray(list.Data) ? list.Data : (list.Data && list.Data.Data) || [];
    const f = rowsL.find((x) => x.ETF_ID === code);
    if (!f) throw new Error('中信：找不到 ' + code);
    for (let back = 0; back < 8; back++) {
      const q = slashDate(new Date((at || twToday()).getTime() - back * 86400000));
      const d = parse2(await (await postJSON(`${B}/etf/ETFHoldingWeight?token=${tk}`, { FID: f.FID, StartDate: q }, ck)).text());
      if (d.ResultCode !== 0 || !d.Data) continue;
      const a = (d.Data.FundAssets || [])[0];
      const g = (d.Data.FundAssetsDetail || []).find((x) => x.Code === 'STOCK');
      if (a && g && g.Data && g.Data.length) return { date: dash(a['資料日期']), scale: num(a['基金淨資產']), rows: g.Data.map((x) => ({ code: String(x.code_).trim(), name: String(x.name_).trim(), shares: num(x.qty_), weight: num(x.weights_) })) };
    }
    throw new Error('中信：近 8 天沒有資料');
  },
  // 群益投信：items 取 fundNo，buyback 回最新一份
  async capital(code, at) {
    if (at) throw new Error('群益：不提供歷史持股');
    const items = await (await postJSON('https://www.capitalfund.com.tw/CFWeb/api/etf/items', {})).json();
    const f = (items.data || []).find((x) => (x.stockNo || '').trim() === code);
    if (!f) throw new Error('群益：找不到 ' + code);
    const d = (await (await postJSON('https://www.capitalfund.com.tw/CFWeb/api/etf/buyback', { fundId: f.fundNo })).json()).data || {};
    if (!d.stocks || !d.pcf) throw new Error('群益：沒有持股明細');
    return { date: dash(d.pcf.date2), scale: num(d.pcf.nav), rows: d.stocks.map((x) => ({ code: String(x.stocNo).trim(), name: String(x.stocName).trim(), shares: num(x.share), weight: num(x.weight) })) };
  },
  // 野村投信：GetFundTradeInfo 往回找
  async nomura(code, at) {
    for (let back = 0; back < 8; back++) {
      const q = slashDate(new Date((at || twToday()).getTime() - back * 86400000));
      const r = await postJSON('https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundTradeInfo', { Type: 1, Keyword: '', FundNo: code, Date: q });
      const e = (await r.json()).Entries;
      if (e && e.Stocks && e.Stocks.length && e.CNavDtStr) return { date: dash(e.CNavDtStr), scale: num(e.CAnceTotalAv), rows: e.Stocks.map((x) => ({ code: String(x.CStockCode).trim(), name: String(x.CStockName || '').trim(), shares: num(x.CQuantity), weight: num(x.CWeightsPct) })) };
    }
    throw new Error('野村：近 8 天沒有資料');
  },
};

// 抓最新持股並存檔：cache/activeetf/<代號>/<資料日>.json
async function updateAll() {
  const out = [];
  for (const e of ETFS) {
    try {
      let h, lastErr;
      for (let t = 0; t < 3 && !h; t++) {
        try {
          h = await issuers[e.issuer](e.code);
        } catch (er) {
          lastErr = er;
          await sleep(20000);
        }
      }
      if (!h) throw lastErr;
      const rows = h.rows.filter((r) => isStockCode(r.code) && r.shares != null);
      if (!rows.length) throw new Error('沒有台股持股');
      const dir = path.join(DIR, e.code);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${h.date}.json`), JSON.stringify({ date: h.date, scale: h.scale, rows }));
      // 第一次追蹤：補抓前一個交易日，才能馬上比較加減碼
      if (fs.readdirSync(dir).filter((f) => /^\d{8}\.json$/.test(f)).length < 2 && e.issuer !== 'capital') {
        try {
          // 統一、野村：查 X 日回傳 X 的前一個交易日；復華、中信：回傳 X 當天（或之前最近一天）
          const before = e.issuer === 'president' || e.issuer === 'nomura';
          const d0 = new Date(Date.UTC(+h.date.slice(0, 4), +h.date.slice(4, 6) - 1, +h.date.slice(6)) - (before ? 0 : 86400000));
          const p = await issuers[e.issuer](e.code, d0);
          const pr = p.rows.filter((r) => isStockCode(r.code) && r.shares != null);
          if (p.date < h.date && pr.length) fs.writeFileSync(path.join(dir, `${p.date}.json`), JSON.stringify({ date: p.date, scale: p.scale, rows: pr }));
        } catch (er) {
          console.error(`主動式ETF ${e.code} 回補前一日失敗：`, er.message);
        }
      }
      out.push({ code: e.code, ok: true, date: h.date, n: rows.length });
    } catch (err) {
      console.error(`主動式ETF ${e.code} 抓取失敗：`, err.message);
      out.push({ code: e.code, ok: false, error: err.message });
    }
    await sleep(1500);
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, 'status.json'), JSON.stringify({ at: new Date().toISOString(), list: out }, null, 1)); // 最近一次抓取結果（除錯用）
  return out;
}

// 比較最近兩份快照 → 加碼、減碼、新進、出清；closeOf(code) 給收盤價估金額
function analyze(closeOf) {
  const etfs = [];
  for (const e of ETFS) {
    const dir = path.join(DIR, e.code);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{8}\.json$/.test(f)).sort() : [];
    if (!files.length) continue;
    const cur = JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
    const prev = files.length > 1 ? JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 2]), 'utf8')) : null;
    const changes = [];
    if (prev) {
      const pm = Object.fromEntries(prev.rows.map((r) => [r.code, r]));
      const cm = Object.fromEntries(cur.rows.map((r) => [r.code, r]));
      for (const code of new Set([...Object.keys(pm), ...Object.keys(cm)])) {
        const a = pm[code], b = cm[code];
        const d = (b ? b.shares : 0) - (a ? a.shares : 0);
        if (!d) continue;
        const px = closeOf(code);
        changes.push({
          code, name: (b || a).name, lots: Math.round(d / 1000), amt: px ? (d * px) / 1e8 : null, // 億
          type: !a ? '新進' : !b ? '出清' : d > 0 ? '加碼' : '減碼',
          weight: b ? b.weight : 0, weightPrev: a ? a.weight : 0,
        });
      }
    }
    const byAmt = (x, y) => Math.abs(y.amt ?? y.lots) - Math.abs(x.amt ?? x.lots);
    etfs.push({
      ...e, date: cur.date, prevDate: prev ? prev.date : null, scale: cur.scale, n: cur.rows.length,
      top: [...cur.rows].sort((a, b) => b.weight - a.weight).slice(0, 10),
      buys: changes.filter((c) => c.lots > 0).sort(byAmt),
      sells: changes.filter((c) => c.lots < 0).sort(byAmt),
    });
  }
  // 同步加碼／減碼：多檔主動 ETF 同方向操作的股票
  const agg = {};
  for (const e of etfs) {
    for (const c of [...e.buys, ...e.sells]) {
      const g = (agg[c.code] = agg[c.code] || { code: c.code, name: c.name, buy: [], sell: [], amt: 0 });
      (c.lots > 0 ? g.buy : g.sell).push(e.code);
      g.amt += c.amt || 0;
    }
  }
  const all = Object.values(agg);
  return {
    etfs,
    consensusBuy: all.filter((g) => g.buy.length >= 2).sort((a, b) => b.buy.length - a.buy.length || b.amt - a.amt),
    consensusSell: all.filter((g) => g.sell.length >= 2).sort((a, b) => b.sell.length - a.sell.length || a.amt - b.amt),
    netBuy: [...all].sort((a, b) => b.amt - a.amt).filter((g) => g.amt > 0).slice(0, 10),
    netSell: [...all].sort((a, b) => a.amt - b.amt).filter((g) => g.amt < 0).slice(0, 10),
  };
}

module.exports = { ETFS, updateAll, analyze, issuers };

if (require.main === module) {
  (async () => {
    console.log(await updateAll());
  })();
}
