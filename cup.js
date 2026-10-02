// 杯柄型態（O'Neil 杯柄 + Minervini《超級績效》趨勢樣板與 VCP 波動收縮）
// 對每檔股票：先過趨勢樣板，再找「左杯緣 → 杯底 → 右杯緣 → 柄」，
// 並記錄：整理多久、創高後最大回檔、回檔幾次（每次幅度）、柄深與量縮、突破價。

const P = {
  MIN_BARS: 150, // 至少要有幾天資料
  CUP_MIN: 30, // 杯身（左杯緣到右杯緣）至少交易日（約 6 週）
  CUP_MAX: 200, // 最多（約 40 週）
  DEPTH_MIN: 12, // 杯深 %
  DEPTH_MAX: 40,
  RIGHT_MIN: 0.85, // 右杯緣高點 / 左杯緣高點
  RIGHT_MAX: 1.05,
  HANDLE_MIN: 5, // 柄長度（交易日）
  HANDLE_MAX: 30,
  HANDLE_DEPTH_MAX: 15, // 柄回檔 %
  PRIOR_UP: 25, // 杯子之前的漲幅至少 %
  ZIGZAG: 6, // 計算回檔次數用：反轉超過 6%（或杯深 1/3，取大者）才算一次波段
  NEAR_PIVOT: 10, // 收盤距突破價 10% 內才列出
  MAX_EXTENDED: 5, // 已突破者，收盤超過突破價不超過 5%
  BREAK_VOL: 1.4, // 突破日量 >= 50 日均量倍數
  RS_MIN: 70, // 相對強度（近 6 個月漲幅在全市場的百分位）
  RECENT_BREAK: 3, // 近幾天內突破也列出
};

const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const maAt = (closes, n, e) => (e + 1 >= n ? avg(closes.slice(e + 1 - n, e + 1)) : null);

// 波段：從 start 開始，價格反轉超過 th% 才算轉折，回傳每次「高點 → 低點」回檔幅度
function contractions(bars, start, end, th) {
  const out = [];
  let peak = bars[start].high, trough = null, down = false;
  for (let i = start + 1; i <= end; i++) {
    const b = bars[i];
    if (!down) {
      if (b.high >= peak) peak = b.high;
      else if (b.low <= peak * (1 - th / 100)) { down = true; trough = b.low; }
    } else {
      if (b.low < trough) trough = b.low;
      else if (b.high >= trough * (1 + th / 100)) {
        out.push((1 - trough / peak) * 100);
        down = false;
        peak = b.high;
      }
    }
  }
  if (down) out.push((1 - trough / peak) * 100); // 最後一段（通常是柄）還在回檔中
  return out;
}

// 以 e 為「今天」，看看是不是杯柄型態
function analyze(bars, e) {
  const closes = bars.map((b) => b.close);
  const c = closes[e];
  // 趨勢樣板
  const m50 = maAt(closes, 50, e), m150 = maAt(closes, 150, e), m200 = maAt(closes, 200, e);
  const m150Prev = maAt(closes, 150, e - 20);
  if (!m50 || !m150 || !m150Prev) return null;
  if (!(m50 > m150 && m150 > m150Prev && (m200 == null || m150 > m200))) return null;
  const lo = Math.min(...bars.slice(0, e + 1).map((b) => b.low));
  const hi = Math.max(...bars.slice(0, e + 1).map((b) => b.high));
  if (c < lo * 1.3 || c < hi * 0.75) return null;

  // 右杯緣：最近 5~30 天前的最高點（之後到昨天都沒超過它）
  let R = -1;
  for (let i = e - P.HANDLE_MAX; i <= e - 1; i++) if (i >= 0 && (R < 0 || bars[i].high >= bars[R].high)) R = i;
  const hLen = e - R;
  if (hLen < P.HANDLE_MIN) return null;
  const pivot = bars[R].high;
  const handle = bars.slice(R + 1, e); // 不含今天
  const handleLow = Math.min(...bars.slice(R + 1, e + 1).map((b) => b.low));
  const handleDepth = (1 - handleLow / pivot) * 100;
  if (handleDepth > P.HANDLE_DEPTH_MAX || handleDepth < 2) return null;

  // 左杯緣：右杯緣往前 30~200 天裡的最高點，而且之後到右杯緣都沒有更高
  let L = -1;
  for (let i = Math.max(0, R - P.CUP_MAX); i <= R - P.CUP_MIN; i++) if (L < 0 || bars[i].high >= bars[L].high) L = i;
  if (L < 0) return null;
  for (let i = L + 1; i < R; i++) if (bars[i].high > bars[L].high) return null;
  const ratio = pivot / bars[L].high;
  if (ratio < P.RIGHT_MIN || ratio > P.RIGHT_MAX) return null;
  let B = L + 1;
  for (let i = L + 1; i < R; i++) if (bars[i].low < bars[B].low) B = i;
  const cupLow = bars[B].low;
  const depth = (1 - cupLow / bars[L].high) * 100;
  if (depth < P.DEPTH_MIN || depth > P.DEPTH_MAX) return null;
  const len = R - L;
  if (B - L < len * 0.2 || R - B < len * 0.2) return null; // U 型，不要 V 型急跌急拉
  if (handleLow < (bars[L].high + cupLow) / 2) return null; // 柄要在杯子上半部
  // 杯子之前要有一段漲幅
  const before = bars.slice(Math.max(0, L - 120), L + 1);
  if (before.length < 20) return null;
  const priorUp = (bars[L].high / Math.min(...before.map((b) => b.low)) - 1) * 100;
  if (priorUp < P.PRIOR_UP) return null;

  const vol50 = avg(bars.slice(Math.max(0, R - 50), R).map((b) => b.vol));
  const volHandle = avg(handle.map((b) => b.vol));
  const volAvg50 = avg(bars.slice(e - 50, e).map((b) => b.vol));
  // 杯子裡的回檔（門檻隨杯深調整，太小的抖動不算），最後加上柄這一次
  const cons = [...contractions(bars, L, R, Math.max(P.ZIGZAG, depth / 3)), handleDepth];
  return {
    L, B, R, e, pivot, depth, handleDepth, hLen, cupLen: len, baseLen: e - L, priorUp, ratio,
    handleDry: vol50 ? volHandle / vol50 : null, // 柄的均量 / 杯子期間均量，< 1 代表量縮
    volRatio: volAvg50 ? bars[e].vol / volAvg50 : null,
    cons,
    tight: cons.length >= 2 && cons.every((v, i) => i === 0 || v < cons[i - 1] * 1.05), // 每次回檔越來越小
  };
}

// allDays：由舊到新 [{date, data}]；回傳符合的個股
function findCups(allDays, AT, opts = {}) {
  const { minLots = 0, filter = () => true } = opts;
  const today = allDays[AT].data;
  // 相對強度：近 120 日漲幅在全市場的百分位
  const perf = {};
  for (const code of Object.keys(today)) {
    const a = allDays[Math.max(0, AT - 120)].data[code];
    if (a && a.close && today[code].close) perf[code] = today[code].close / a.close;
  }
  const sorted = Object.values(perf).sort((a, b) => a - b);
  const rsOf = (code) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < perf[code]) lo = m + 1; else hi = m; }
    return Math.round((lo / sorted.length) * 99);
  };

  const out = [];
  for (const code of Object.keys(today)) {
    const q = today[code];
    if (q.close == null || q.vol / 1000 < minLots || perf[code] == null || !filter(code)) continue;
    const rs = rsOf(code);
    if (rs < P.RS_MIN) continue;
    const bars = [], dates = [];
    for (let i = 0; i <= AT; i++) {
      const b = allDays[i].data[code];
      if (!b || b.close == null) continue;
      // 舊資料若沒有最高/最低價，用開盤、收盤代替
      bars.push(b.high != null && b.low != null ? b : { ...b, high: Math.max(b.open || b.close, b.close), low: Math.min(b.open || b.close, b.close) });
      dates.push(allDays[i].date);
    }
    if (bars.length < P.MIN_BARS || dates[dates.length - 1] !== allDays[AT].date) continue;
    const n = bars.length - 1;
    let hit = null, status;
    for (let k = 0; k <= P.RECENT_BREAK && !hit; k++) {
      const a = analyze(bars, n - k);
      if (!a) continue;
      const brk = bars[n - k].close > a.pivot;
      if (k === 0) {
        if (brk && a.volRatio >= P.BREAK_VOL) status = '今日帶量突破';
        else if (brk) status = '今日突破（量未放大）';
        else if (bars[n].close >= a.pivot * (1 - P.NEAR_PIVOT / 100)) status = '柄整理中';
        else continue;
        hit = a;
      } else if (brk && a.volRatio >= P.BREAK_VOL) {
        status = `${k} 天前帶量突破`;
        hit = a;
      }
    }
    if (!hit) continue;
    const ext = (q.close / hit.pivot - 1) * 100;
    if (ext > P.MAX_EXTENDED) continue;
    const pc = bars[n - 1].close;
    out.push({
      code, name: q.name, mkt: q.mkt, close: q.close, chg: pc ? (q.close / pc - 1) * 100 : null, lots: Math.round(q.vol / 1000), rs,
      status, pivot: hit.pivot, toPivot: ext,
      leftDate: dates[hit.L], bottomDate: dates[hit.B], rightDate: dates[hit.R],
      baseLen: hit.baseLen + (n - hit.e), cupLen: hit.cupLen, hLen: hit.hLen, depth: hit.depth, handleDepth: hit.handleDepth,
      priorUp: hit.priorUp, handleDry: hit.handleDry, volRatio: hit.volRatio, cons: hit.cons, tight: hit.tight,
      // 走勢小圖：從左杯緣前 20 天到今天的收盤
      path: bars.slice(Math.max(0, hit.L - 20)).map((b) => b.close),
    });
  }
  const rank = (s) => (s.includes('突破') ? (s.startsWith('今日帶量') ? 0 : 1) : 2);
  return out.sort((a, b) => rank(a.status) - rank(b.status) || b.tight - a.tight || b.rs - a.rs);
}

module.exports = { findCups, CUP_PARAMS: P };
