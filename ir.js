// 0050 成分股：法說會行事曆（公開資訊觀測站）
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cache', 'ir');
const UA = { 'User-Agent': 'Mozilla/5.0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) =>
  s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

// 0050 成分股與權重（MoneyDJ 持股明細），每天快取一次
async function get0050(dateStr) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `0050_${dateStr}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = await fetch('https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid=0050.TW', { headers: UA });
  const html = await res.text();
  const asOf = (html.match(/資料日期：(\d{4}\/\d{2}\/\d{2})/) || [])[1] || null;
  const out = [];
  for (const tr of html.split(/<tr/i)) {
    const m = tr.match(/>([^<>]{1,20})\((\d{4})\.TW\)</);
    if (!m) continue;
    const nums = [...tr.matchAll(/<td[^>]*>\s*([\d,.]+)\s*<\/td>/g)].map((x) => parseFloat(x[1].replace(/,/g, '')));
    out.push({ code: m[2], name: m[1].trim(), weight: nums.length ? nums[0] : null }); // 欄位：投資比例(%)、持有股數
  }
  if (out.length < 40) throw new Error(`0050 成分股只抓到 ${out.length} 檔`);
  const data = { asOf, list: out };
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

// 某月法說會（上市）：[{ code, name, date, time, place, desc, files }]
async function getMonth(rocYear, month, useCache) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `conf_${rocYear}${String(month).padStart(2, '0')}.json`);
  if (useCache && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = await fetch('https://mopsov.twse.com.tw/mops/web/ajax_t100sb02_1', {
    method: 'POST',
    headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `encodeURIComponent=1&step=1&firstin=1&off=1&TYPEK=sii&year=${rocYear}&month=${String(month).padStart(2, '0')}&co_id=`,
  });
  const html = await res.text();
  const out = [];
  for (const tr of html.split(/<tr/i)) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 6 || !/^\s*\d{4}\s*$/.test(strip(cells[0]))) continue;
    const d = (strip(cells[2]).match(/(\d{2,3})\/(\d{2})\/(\d{2})/) || []);
    const files = cells.slice(6).map(strip).filter((f) => /\.pdf$/i.test(f));
    out.push({
      code: strip(cells[0]),
      name: strip(cells[1]),
      date: d.length ? `${+d[1] + 1911}-${d[2]}-${d[3]}` : null,
      time: strip(cells[3]),
      place: strip(cells[4]),
      desc: strip(cells[5]),
      files: files.map((f) => ({ name: f, url: `https://mopsov.twse.com.tw/nas/STR/${f}`, lang: /E\d+\.pdf$/i.test(f) ? '英' : '中' })),
    });
  }
  fs.writeFileSync(file, JSON.stringify(out));
  return out;
}

// 上個月到下個月的法說會，只留 0050 成分股
async function getConferences(codes, todayStr) {
  const set = new Set(codes);
  const y = +todayStr.slice(0, 4), m = +todayStr.slice(4, 6);
  const months = [-1, 0, 1].map((k) => {
    const d = new Date(Date.UTC(y, m - 1 + k, 1));
    return [d.getUTCFullYear() - 1911, d.getUTCMonth() + 1, k < 0];
  });
  const all = [];
  for (const [ry, mo, past] of months) {
    all.push(...(await getMonth(ry, mo, past)));
    await sleep(1500);
  }
  const seen = new Set();
  return all.filter((c) => set.has(c.code) && c.date && !seen.has(c.code + c.date + c.time) && seen.add(c.code + c.date + c.time));
}

module.exports = { get0050, getConferences };
