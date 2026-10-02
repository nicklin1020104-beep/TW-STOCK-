// 美股：川普（Truth Social）與網友（Reddit，ApeWisdom）提到的個股，追蹤提到後的勝率
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'cache', 'us');
const TRUMP_FILE = path.join(DIR, 'trump_posts.json');
const REDDIT_DIR = path.join(DIR, 'reddit');
const BACKFILL_FROM = '2026-01-01T00:00:00Z';
const REDDIT_TOP = 10; // 每天網友熱門前 N 名算「提到」
const HOLD = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0' };

// 公司名稱 → 代號（區分大小寫；刻意不收容易誤判的字，如 Target、Visa、United、Delta、Carrier）
const COMPANIES = [
  [/\bApple\b|\biPhones?\b/, 'AAPL', 'Apple'], [/\bMicrosoft\b/, 'MSFT', 'Microsoft'], [/\bNvidia\b|\bNVIDIA\b/, 'NVDA', 'Nvidia'],
  [/\bIntel\b/, 'INTC', 'Intel'], [/\bAMD\b/, 'AMD', 'AMD'], [/\bMicron\b/, 'MU', 'Micron'], [/\bQualcomm\b/, 'QCOM', 'Qualcomm'],
  [/\bBroadcom\b/, 'AVGO', 'Broadcom'], [/\bTSMC\b|\bTaiwan Semiconductor\b/, 'TSM', 'TSMC'], [/\bTesla\b/, 'TSLA', 'Tesla'],
  [/\bAmazon\b/, 'AMZN', 'Amazon'], [/\bGoogle\b|\bAlphabet\b/, 'GOOGL', 'Google'], [/\bFacebook\b|\bMeta\b(?! Platforms? of)/, 'META', 'Meta'],
  [/\bOracle\b/, 'ORCL', 'Oracle'], [/\bIBM\b/, 'IBM', 'IBM'], [/\bCisco\b/, 'CSCO', 'Cisco'], [/\bPalantir\b/, 'PLTR', 'Palantir'],
  [/\bNetflix\b/, 'NFLX', 'Netflix'], [/\bDisney\b/, 'DIS', 'Disney'], [/\bComcast\b/, 'CMCSA', 'Comcast'], [/\bParamount\b/, 'PSKY', 'Paramount'],
  [/\bWarner Bros/, 'WBD', 'Warner Bros'], [/\bBoeing\b/, 'BA', 'Boeing'], [/\bLockheed\b/, 'LMT', 'Lockheed Martin'],
  [/\bRaytheon\b|\bRTX\b/, 'RTX', 'RTX'], [/\bNorthrop\b/, 'NOC', 'Northrop Grumman'], [/\bGeneral Dynamics\b/, 'GD', 'General Dynamics'],
  [/\bGeneral Motors\b|\bGM\b/, 'GM', 'General Motors'], [/(?<!Gerald )\bFord\b(?!-class| class|['’]s Theat)/, 'F', 'Ford'],
  [/\bStellantis\b|\bChrysler\b/, 'STLA', 'Stellantis'], [/\bToyota\b/, 'TM', 'Toyota'], [/\bHonda\b/, 'HMC', 'Honda'],
  [/\bHarley[- ]Davidson\b/, 'HOG', 'Harley-Davidson'], [/\bExxon\b/, 'XOM', 'Exxon'], [/\bChevron\b/, 'CVX', 'Chevron'],
  [/\bConocoPhillips\b/, 'COP', 'ConocoPhillips'], [/\bWalmart\b/, 'WMT', 'Walmart'], [/\bCostco\b/, 'COST', 'Costco'],
  [/\bHome Depot\b/, 'HD', 'Home Depot'], [/\bCoca[- ]Cola\b|\bCoke\b/, 'KO', 'Coca-Cola'], [/\bPepsi/, 'PEP', 'PepsiCo'],
  [/\bMcDonald'?s\b/, 'MCD', "McDonald's"], [/\bStarbucks\b/, 'SBUX', 'Starbucks'], [/\bNike\b/, 'NKE', 'Nike'],
  [/\bPfizer\b/, 'PFE', 'Pfizer'], [/\bModerna\b/, 'MRNA', 'Moderna'], [/\bEli Lilly\b|\bLilly\b/, 'LLY', 'Eli Lilly'],
  [/\bNovo Nordisk\b/, 'NVO', 'Novo Nordisk'], [/\bJohnson (&|and) Johnson\b/, 'JNJ', 'J&J'], [/\bMerck\b/, 'MRK', 'Merck'],
  [/\bAstraZeneca\b/, 'AZN', 'AstraZeneca'], [/\bUnitedHealth\b/, 'UNH', 'UnitedHealth'], [/\bCVS\b/, 'CVS', 'CVS'],
  [/\bJPMorgan\b|\bJP Morgan\b|\bJ\.P\. Morgan\b/, 'JPM', 'JPMorgan'], [/\bGoldman Sachs\b/, 'GS', 'Goldman Sachs'],
  [/\bBank of America\b/, 'BAC', 'Bank of America'], [/\bCitigroup\b|\bCitibank\b/, 'C', 'Citigroup'], [/\bWells Fargo\b/, 'WFC', 'Wells Fargo'],
  [/\bMorgan Stanley\b/, 'MS', 'Morgan Stanley'], [/\bBlackRock\b/, 'BLK', 'BlackRock'], [/\bMastercard\b/, 'MA', 'Mastercard'],
  [/\bCoinbase\b/, 'COIN', 'Coinbase'], [/\bMicroStrategy\b/, 'MSTR', 'Strategy'], [/\bTrump Media\b/, 'DJT', 'Trump Media'], // 「President DJT」是簽名、Truth Social 是平台名，都不算
  [/\bRumble\b/, 'RUMB', 'Rumble'], [/\bCaterpillar\b/, 'CAT', 'Caterpillar'], [/\bJohn Deere\b|\bDeere\b/, 'DE', 'Deere'],
  [/\b3M\b/, 'MMM', '3M'], [/\bGeneral Electric\b|\bGE Aerospace\b/, 'GE', 'GE'], [/\bHoneywell\b/, 'HON', 'Honeywell'],
  [/\bNucor\b/, 'NUE', 'Nucor'], [/\bCleveland[- ]Cliffs\b/, 'CLF', 'Cleveland-Cliffs'], [/\bAlcoa\b/, 'AA', 'Alcoa'],
  [/\bAnheuser[- ]Busch\b|\bBud Light\b/, 'BUD', 'AB InBev'], [/\bTyson\b/, 'TSN', 'Tyson'], [/\bKraft\b|\bHeinz\b/, 'KHC', 'Kraft Heinz'],
  [/\bCampbell'?s\b/, 'CPB', "Campbell's"], [/\bMattel\b/, 'MAT', 'Mattel'], [/\bHasbro\b/, 'HAS', 'Hasbro'], [/\bGoodyear\b/, 'GT', 'Goodyear'],
  [/\bCracker Barrel\b/, 'CBRL', 'Cracker Barrel'], [/\bVerizon\b/, 'VZ', 'Verizon'], [/\bAT&(amp;)?T\b/, 'T', 'AT&T'], [/\bT-Mobile\b/, 'TMUS', 'T-Mobile'],
  [/\bSoftBank\b/, 'SFTBY', 'SoftBank'], [/\bUber\b/, 'UBER', 'Uber'], [/\bSalesforce\b/, 'CRM', 'Salesforce'], [/\bDell\b/, 'DELL', 'Dell'],
  [/\bSuper Micro\b/, 'SMCI', 'Super Micro'], [/\bCoreWeave\b/, 'CRWV', 'CoreWeave'], [/\bLucid\b/, 'LCID', 'Lucid'], [/\bRivian\b/, 'RIVN', 'Rivian'],
  [/\bMP Materials\b/, 'MP', 'MP Materials'], [/\bLithium Americas\b/, 'LAC', 'Lithium Americas'], [/\bTrilogy Metals\b/, 'TMQ', 'Trilogy Metals'],
  [/\bUSA Rare Earth\b/, 'USAR', 'USA Rare Earth'], [/\bNewsmax\b/, 'NMAX', 'Newsmax'], [/\bSpirit Airlines\b/, 'FLYY', 'Spirit'],
];
const ETF = new Set(['SPY', 'QQQ', 'IWM', 'VOO', 'VTI', 'DIA', 'TQQQ', 'SQQQ', 'SPXU', 'UVXY', 'VIX', 'GLD', 'SLV', 'TLT', 'SOXL', 'SOXS', 'ARKK', 'SMH', 'XLE', 'XLF']);

async function getText(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// ---------- 川普貼文 ----------
const decode = (s) =>
  s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();

async function fetchTrumpPage(beforeUtc) {
  // cursor 為 base64 JSON：{"status_created_at":"YYYY-MM-DD HH:MM:SS","_pointsToNextItems":true}
  const cursor = Buffer.from(JSON.stringify({ status_created_at: beforeUtc.replace('T', ' ').slice(0, 19), _pointsToNextItems: true })).toString('base64');
  const html = await getText(`https://www.trumpstruth.org/?sort=desc&per_page=100&cursor=${cursor}`);
  const posts = [];
  for (const block of html.split('<div class="status" data-status-url="').slice(1)) {
    const url = block.slice(0, block.indexOf('"'));
    const time = (block.match(/<time datetime="([^"]+)"/) || [])[1];
    const content = (block.match(/<div class="status__content"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
    if (url && time) posts.push({ id: url.split('/').pop(), url, time: new Date(time).toISOString(), text: decode(content) });
  }
  return posts;
}

async function updateTrumpPosts() {
  fs.mkdirSync(DIR, { recursive: true });
  let posts = [];
  try {
    posts = JSON.parse(fs.readFileSync(TRUMP_FILE, 'utf8'));
  } catch {}
  const have = new Set(posts.map((p) => p.id));
  const newest = posts.length ? posts[0].time : BACKFILL_FROM;
  const oldest = posts.length ? posts[posts.length - 1].time : new Date().toISOString();

  // 1) 往前抓新貼文，直到接上已有資料
  let before = new Date(Date.now() + 86400000).toISOString();
  for (let i = 0; i < 30; i++) {
    const page = await fetchTrumpPage(before);
    if (!page.length) break;
    page.forEach((p) => !have.has(p.id) && (posts.push(p), have.add(p.id)));
    const last = page[page.length - 1].time;
    if (last <= newest || last >= before) break;
    before = last;
    await sleep(1500);
  }
  // 2) 回補到 BACKFILL_FROM
  before = oldest;
  for (let i = 0; i < 300 && before > BACKFILL_FROM; i++) {
    const page = await fetchTrumpPage(before);
    if (!page.length) break;
    page.forEach((p) => !have.has(p.id) && (posts.push(p), have.add(p.id)));
    const last = page[page.length - 1].time;
    if (last >= before) break;
    before = last;
    if (i % 10 === 0) process.stdout.write(`\r川普貼文回補至 ${before.slice(0, 10)}   `);
    await sleep(1500);
  }
  posts.sort((a, b) => (a.time < b.time ? 1 : -1));
  fs.writeFileSync(TRUMP_FILE, JSON.stringify(posts));
  return posts;
}

function trumpMentions(posts) {
  const out = [];
  for (const p of posts) {
    const text = p.text.replace(/https?:\/\/\S+/g, ' '); // 網址不算提到（例如轉貼 newsmax.com 文章）
    const seen = new Set();
    const hit = (ticker, name, idx, len) => {
      if (seen.has(ticker)) return;
      seen.add(ticker);
      const a = Math.max(0, idx - 90), b = Math.min(text.length, idx + len + 110);
      out.push({ source: 'trump', ticker, name, time: p.time, url: p.url, snippet: (a ? '…' : '') + text.slice(a, b).trim() + (b < text.length ? '…' : '') });
    };
    for (const [re, ticker, name] of COMPANIES) {
      const m = text.match(re);
      if (m) hit(ticker, name, m.index, m[0].length);
    }
    for (const m of text.matchAll(/\$([A-Z]{1,5})\b/g)) hit(m[1], '$' + m[1], m.index, m[0].length);
  }
  return out;
}

// ---------- 網友（Reddit）熱門 ----------
async function updateReddit(dateStr) {
  fs.mkdirSync(REDDIT_DIR, { recursive: true });
  const file = path.join(REDDIT_DIR, `${dateStr}.json`);
  if (!fs.existsSync(file)) {
    const j = JSON.parse(await getText('https://apewisdom.io/api/v1.0/filter/all-stocks/page/1'));
    fs.writeFileSync(file, JSON.stringify(j.results.map((r) => ({ ...r, name: decode(r.name) }))));
  }
  const snaps = fs.readdirSync(REDDIT_DIR).filter((f) => f.endsWith('.json')).sort().map((f) => ({ date: f.slice(0, 10), list: JSON.parse(fs.readFileSync(path.join(REDDIT_DIR, f), 'utf8')) }));
  const mentions = [];
  let prevTop = new Set();
  for (const s of snaps) {
    const top = s.list.filter((r) => !ETF.has(r.ticker)).slice(0, REDDIT_TOP);
    for (const r of top) {
      // 以台灣時間 snapshot 日的美東前一交易日收盤為進場（快照時美股已收盤）
      mentions.push({ source: 'reddit', ticker: r.ticker, name: r.name, time: `${s.date}T00:00:00+08:00`, isNew: !prevTop.has(r.ticker), rank: r.rank, count: r.mentions });
    }
    prevTop = new Set(top.map((r) => r.ticker));
  }
  const today = snaps.length ? snaps[snaps.length - 1] : null;
  const yesterdayTop = snaps.length > 1 ? new Set(snaps[snaps.length - 2].list.filter((r) => !ETF.has(r.ticker)).slice(0, REDDIT_TOP).map((r) => r.ticker)) : null;
  return { mentions, today, yesterdayTop };
}

// ---------- 股價 ----------
async function getPrices(tickers) {
  const out = {};
  for (const t of tickers) {
    try {
      const j = JSON.parse(await getText(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=1y&interval=1d`));
      const r = j.chart.result[0];
      const closes = r.indicators.quote[0].close;
      out[t] = r.timestamp.map((ts, i) => ({ close: +(ts * 1000 + 6.5 * 3600000), c: closes[i] })).filter((x) => x.c != null);
    } catch {
      out[t] = null;
    }
    await sleep(300);
  }
  return out;
}

// 進場 = 提到之後第一個收盤（美東 16:00）
function evalMention(m, px, spy) {
  if (!px) return null;
  const t = new Date(m.time).getTime();
  const i = px.findIndex((x) => x.close >= t);
  if (i < 0) return { ...m, entry: null, rets: [], pending: true };
  const entry = px[i].c;
  const rets = [];
  for (let k = 1; k <= HOLD && i + k < px.length; k++) rets.push((px[i + k].c / entry - 1) * 100);
  let spy5 = null;
  if (spy && rets.length === HOLD) {
    const j = spy.findIndex((x) => x.close === px[i].close);
    if (j >= 0 && j + HOLD < spy.length) spy5 = (spy[j + HOLD].c / spy[j].c - 1) * 100;
  }
  const last = px[px.length - 1].c;
  return { ...m, entryDate: new Date(px[i].close).toISOString().slice(0, 10), entry, rets, sinceNow: (last / entry - 1) * 100, spy5, done: rets.length === HOLD };
}

function stats(list) {
  const r = (k) => {
    const l = list.filter((e) => e.rets && e.rets.length >= k);
    return l.length ? { n: l.length, win: (l.filter((e) => e.rets[k - 1] > 0).length / l.length) * 100, avg: l.reduce((a, e) => a + e.rets[k - 1], 0) / l.length } : null;
  };
  const beat = list.filter((e) => e.done && e.spy5 != null);
  return { n: list.length, r1: r(1), r5: r(HOLD), beat: beat.length ? (beat.filter((e) => e.rets[HOLD - 1] > e.spy5).length / beat.length) * 100 : null };
}

async function buildUS(dateStr) {
  const posts = await updateTrumpPosts();
  // 同一檔同一天只算一次
  const tm = [];
  const key = new Set();
  for (const m of trumpMentions(posts)) {
    const k = m.ticker + m.time.slice(0, 10);
    if (!key.has(k)) key.add(k), tm.push(m);
  }
  const rd = await updateReddit(dateStr);
  const tickers = [...new Set([...tm.map((m) => m.ticker), ...rd.mentions.map((m) => m.ticker), 'SPY'])];
  const px = await getPrices(tickers);
  const spy = px.SPY;
  const trump = tm.map((m) => evalMention(m, px[m.ticker], spy)).filter(Boolean);
  const reddit = rd.mentions.map((m) => evalMention(m, px[m.ticker], spy)).filter(Boolean);

  const byTicker = {};
  for (const e of trump) (byTicker[e.ticker] = byTicker[e.ticker] || []).push(e);
  const trumpTickers = Object.entries(byTicker)
    .map(([t, l]) => ({ ticker: t, name: l[0].name, count: l.length, last: l[0].time, ...stats(l) }))
    .sort((a, b) => b.count - a.count);

  return {
    postsCount: posts.length,
    postsFrom: posts.length ? posts[posts.length - 1].time : null,
    trumpStats: stats(trump),
    redditStats: stats(reddit.filter((e) => e.isNew)),
    redditAllStats: stats(reddit),
    trumpRecent: trump.slice(0, 25),
    trumpTickers,
    redditToday: rd.today ? rd.today.list.filter((r) => !ETF.has(r.ticker)).slice(0, 20).map((r) => ({ ...r, isNew: rd.yesterdayTop ? !rd.yesterdayTop.has(r.ticker) : null, px: px[r.ticker] })) : [],
    redditDays: new Set(rd.mentions.map((m) => m.time)).size,
    hold: HOLD,
  };
}

module.exports = { buildUS };
