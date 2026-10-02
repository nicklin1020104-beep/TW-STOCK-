// 產業趨勢：今日起漲、續強、起漲後一週追蹤
// 產業指數 = 產業內流動性夠的個股「等權平均」日報酬，避免被單一大型股主導

const LIQ_LOTS = 500; // 20 日均量至少張數才納入產業指數
const MIN_STOCKS = 5; // 產業至少幾檔才計算
const START_MIN = 1.5; // 起漲：今日產業漲幅至少 %
const START_BREADTH = 0.6; // 起漲：上漲家數比例至少
const START_MAX_PRIOR5 = 0; // 起漲：前 5 日累計漲幅不超過 %（還沒漲過）
const STRONG_STREAK = 3; // 續強：連續上漲至少天數
const START_EXCESS = 1; // 起漲：今日漲幅至少要贏大盤幾個百分點
const HOLD = 5;

function buildIndustry(days, rev, T, insti, minLots, opt = {}) {
  const P = { START_MIN, START_BREADTH, START_MAX_PRIOR5, START_EXCESS, MIN_STOCKS, ...opt };
  const N = T + 1;
  const codes = Object.keys(days[T].data);
  // 分組：傳入 opt.groups（族群）就用族群，否則用官方產業別
  const ind = {};
  if (opt.groups) {
    for (const [g, list] of Object.entries(opt.groups)) ind[g] = list.filter((c) => days[T].data[c]);
  } else {
    for (const c of codes) {
      const r = rev[c];
      if (r && r.industry) (ind[r.industry] = ind[r.industry] || []).push(c);
    }
  }

  // 每檔每日報酬、20 日均量
  const series = {};
  for (const c of codes) {
    const close = days.map((d) => (d.data[c] ? d.data[c].close : null));
    const vol = days.map((d) => (d.data[c] ? d.data[c].vol : null));
    series[c] = { close, vol };
  }
  const avgVol = (c, t) => {
    const v = series[c].vol.slice(Math.max(0, t - 19), t + 1).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length / 1000 : 0;
  };
  const ret = (c, t) => {
    const { close } = series[c];
    return close[t] != null && close[t - 1] ? Math.max(-10.5, Math.min(10.5, (close[t] / close[t - 1] - 1) * 100)) : null;
  };

  // 產業日報酬、上漲比例、成交值
  const daily = {}; // ind -> [{ r, up, val }]
  const market = [];
  for (let t = 1; t < N; t++) {
    // 大盤：全部流動性夠的個股等權平均
    let mSum = 0, mN = 0;
    for (const c of codes) {
      const r = ret(c, t);
      if (r != null && avgVol(c, t - 1) >= LIQ_LOTS) (mSum += r), mN++;
    }
    market[t] = mN ? mSum / mN : 0;
    for (const [name, list] of Object.entries(ind)) {
      let sum = 0, n = 0, up = 0, val = 0;
      for (const c of list) {
        const r = ret(c, t);
        if (r == null || avgVol(c, t - 1) < LIQ_LOTS) continue;
        sum += r, n++, r > 0 && up++;
        val += (series[c].vol[t] || 0) * series[c].close[t];
      }
      (daily[name] = daily[name] || [])[t] = n >= P.MIN_STOCKS ? { r: sum / n, up: up / n, val, n } : null;
    }
  }
  const cum = (arr, a, b) => {
    let x = 1;
    for (let t = a; t <= b; t++) {
      if (!arr[t]) return null;
      x *= 1 + arr[t].r / 100;
    }
    return (x - 1) * 100;
  };
  const mcum = (a, b) => {
    let x = 1;
    for (let t = a; t <= b; t++) x *= 1 + (market[t] || 0) / 100;
    return (x - 1) * 100;
  };

  const isStart = (d, t) => {
    const x = d[t];
    if (!x || t < 6) return false;
    const prior = cum(d, t - 5, t - 1);
    return x.r >= P.START_MIN && x.r - market[t] >= P.START_EXCESS && x.up >= P.START_BREADTH && prior != null && prior <= P.START_MAX_PRIOR5;
  };
  const streakAt = (d, t) => {
    let k = 0;
    while (t - k >= 1 && d[t - k] && d[t - k].r > 0) k++;
    return k;
  };

  // 今日各產業
  const rows = [];
  for (const [name, d] of Object.entries(daily)) {
    const x = d[T];
    if (!x) continue;
    // 法人買超金額（億）
    let flow = 0;
    for (const c of ind[name]) {
      const q = days[T].data[c];
      if (insti && insti[c] && q && q.close) flow += (insti[c].total * q.close) / 1e8;
    }
    // 成分股：族群列全部；官方產業股數多，只列當日量達門檻的
    const shares = opt.shares || {};
    const members = ind[name]
      .map((c) => {
        const q = days[T].data[c];
        if (!q || q.close == null) return null;
        const r5 = series[c].close[T - 5] ? (q.close / series[c].close[T - 5] - 1) * 100 : null;
        return {
          code: c, name: q.name, mkt: q.mkt, close: q.close, chg: ret(c, T), r5,
          lots: Math.round((q.vol || 0) / 1000),
          inst: insti && insti[c] ? Math.round(insti[c].total / 1000) : null,
          cap: shares[c] ? (q.close * shares[c]) / 1e8 : null, // 億
        };
      })
      .filter((m) => m && (opt.groups || m.lots >= minLots))
      .sort((a, b) => (b.cap ?? -1) - (a.cap ?? -1) || b.lots - a.lots);
    // 前三大：市值最大的 3 檔
    const leaders = members.slice(0, 3);
    const val20 = d.slice(Math.max(1, T - 20), T).filter(Boolean);
    rows.push({
      name,
      n: x.n,
      r1: x.r,
      up: x.up,
      r5: cum(d, T - 4, T),
      prior5: cum(d, T - 5, T - 1),
      r20: cum(d, T - 19, T),
      streak: streakAt(d, T),
      valRatio: val20.length ? x.val / (val20.reduce((a, y) => a + y.val, 0) / val20.length) : null,
      flow,
      leaders,
      members,
      start: isStart(d, T),
    });
  }
  const m5 = mcum(T - 4, T);
  for (const r of rows) r.strong = r.streak >= STRONG_STREAK && r.r5 != null && r.r5 > m5;
  rows.sort((a, b) => b.r1 - a.r1);

  // 起漲後一週追蹤（含歷史回補）
  const signals = [];
  for (let t = 21; t <= T; t++) {
    const m5t = mcum(t - 4, t);
    for (const [name, d] of Object.entries(daily)) {
      const r5t = cum(d, t - 4, t);
      const type = isStart(d, t) ? '起漲' : streakAt(d, t) === STRONG_STREAK && r5t != null && r5t > m5t ? '續強' : null;
      if (!type) continue;
      const after = [];
      for (let k = 1; k <= HOLD && t + k <= T; k++) after.push({ r: cum(d, t + 1, t + k), m: mcum(t + 1, t + k) });
      signals.push({ date: days[t].date, name, type, r1: d[t].r, up: d[t].up, after });
    }
  }
  const statOf = (list) => {
  const done = list.filter((s) => s.after.length === HOLD && s.after[HOLD - 1].r != null);
  return done.length
    ? {
        n: done.length,
        win: (done.filter((s) => s.after[HOLD - 1].r > 0).length / done.length) * 100,
        beat: (done.filter((s) => s.after[HOLD - 1].r > s.after[HOLD - 1].m).length / done.length) * 100,
        avg: done.reduce((a, s) => a + s.after[HOLD - 1].r, 0) / done.length,
        mavg: done.reduce((a, s) => a + s.after[HOLD - 1].m, 0) / done.length,
        from: done[0].date,
      }
    : null;
  };
  const stats = { 起漲: statOf(signals.filter((s) => s.type === '起漲')), 續強: statOf(signals.filter((s) => s.type === '續強')) };

  return {
    rows,
    market: { r1: market[T], r5: m5 },
    starts: rows.filter((r) => r.start),
    strongs: rows.filter((r) => r.strong).sort((a, b) => b.streak - a.streak || b.r5 - a.r5),
    tracking: signals.filter((s) => s.after.length < HOLD || s.date >= days[Math.max(0, T - 10)].date).reverse(),
    stats,
    params: { ...P, STRONG_STREAK, LIQ_LOTS, HOLD },
  };
}

module.exports = { buildIndustry };
