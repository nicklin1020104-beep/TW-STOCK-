// 股票日誌（會員專用）：記帳、現金、庫存、已實現損益、圖表
// 資料存在 Cloudflare（每人只看得到自己的），損益在瀏覽器端計算

function renderJournal() {
  return `<div class="lock-card pf-lock"><div class="lock-ic big">📒</div><h3>登入 Google 才能使用股票日誌</h3><p>記下每天買賣的台股、美股，自動算手續費、交易稅、現金、庫存與損益，還有圖表追蹤自己的績效。資料只有你自己看得到。</p><div class="gsi-lock"></div><p style="margin-top:16px"><button type="button" class="push-enable push-small" data-goto="fee">🧮 先試試手續費試算（不用登入）</button></p></div>
<div class="jn"><p class="empty">載入中…</p></div>`;
}

const JOURNAL_CSS = `.jn-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:8px 0 14px}.jn-cards div{background:var(--card);border-radius:14px;padding:12px 10px;text-align:center}.jn-cards b{display:block;font-size:20px;font-weight:800}.jn-cards span{font-size:12px;color:var(--mute)}.jn-cards small{display:block;font-size:12px;margin-top:2px}
@media (max-width:640px){.jn-cards{grid-template-columns:repeat(2,1fr)}.jn-cards div:first-child{grid-column:1/-1}}
.jn-acts{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.jn-acts button,.jn-form .jn-btns button{font:inherit;font-size:14px;font-weight:700;padding:9px 16px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.jn-acts .main,.jn-form .jn-btns .main{background:var(--accent);border-color:var(--accent);color:var(--bg)}
.jn-charts{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media (max-width:820px){.jn-charts{grid-template-columns:1fr}}.jn-chart{background:var(--card);border-radius:14px;padding:12px;min-height:240px;position:relative}.jn-chart h4{margin:0 0 8px;font-size:14px}.jn-chart canvas{max-height:260px}
#jn-modal{position:fixed;inset:0;z-index:1150;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}#jn-modal[hidden]{display:none}@media (min-width:641px){#jn-modal{align-items:center}}
.jn-form{background:var(--bg);width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}@media (min-width:641px){.jn-form{border-radius:18px}}
.jn-form h3{margin:0 0 12px;font-size:18px}.jn-form label{display:block;font-size:13px;color:var(--mute);margin:10px 0 4px}.jn-form input,.jn-form select,.jn-form textarea{font:inherit;font-size:16px;width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg)}.jn-form textarea{min-height:64px}
.jn-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.jn-seg{display:flex;gap:6px}.jn-seg button{flex:1;font:inherit;font-size:15px;font-weight:700;padding:9px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.jn-seg button.on{background:var(--fg);color:var(--bg);border-color:var(--fg)}.jn-seg button.buy.on{background:var(--up);border-color:var(--up);color:#fff}.jn-seg button.sell.on{background:var(--dn);border-color:var(--dn);color:#fff}
.jn-tags{display:flex;flex-wrap:wrap;gap:6px}.jn-tags button{font:inherit;font-size:13px;padding:5px 11px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.jn-tags button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-weight:700}
.jn-sug{position:relative}.jn-sug ul{position:absolute;left:0;right:0;top:100%;z-index:5;margin:2px 0 0;padding:4px;list-style:none;background:var(--bg);border:1.5px solid var(--line);border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.15);max-height:240px;overflow:auto}.jn-sug li{padding:8px 10px;border-radius:8px;cursor:pointer;font-size:15px}.jn-sug li:hover,.jn-sug li.hl{background:var(--card)}
.jn-calc{font-size:13px;color:var(--mute);margin-top:8px;line-height:1.7}.jn-calc b{color:var(--fg)}.jn-btns{display:flex;gap:8px;margin-top:16px}.jn-btns button{flex:1}.jn-err{color:var(--up);font-size:13px;margin-top:8px}.jn-hint{font-size:12.5px;color:var(--mute);line-height:1.6;margin:4px 0}
.jn-del{border:0;background:none;color:var(--mute);cursor:pointer;font-size:13px;padding:2px 6px}.jn-edit{border:0;background:none;color:var(--accent);cursor:pointer;font-size:13px;padding:2px 6px}td.jn-note{white-space:normal;min-width:140px;max-width:260px;text-align:left!important;font-size:12.5px;color:var(--mute)}
html.anon .page[data-p="journal"]>:not(.lock-card){display:none}
.jn-quick{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}.jn-quick button{font:inherit;font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.jn-quick .jn-pct{font-size:13px}.jn-form .jn-quick input.jn-pctin{width:84px;padding:5px 10px;font-size:15px;border-radius:999px}.st2 h3 .jn-hint{font-weight:400;font-size:13px}.dd button{min-width:40px}td.jn-ops{white-space:nowrap}.jn-eqbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}.jn-eqbar .jn-seg button{flex:0 0 auto;font-size:13px;padding:6px 12px}.jn-eq{min-height:260px}.jn-eq canvas{max-height:300px}.fc [hidden]{display:none!important}.fc .jn-seg button{font-size:14px}.fc-out{margin-top:6px}td.nm .jn-edit[data-pos]{padding:2px 4px 2px 0;font-size:14px}`;

// ---- 瀏覽器端 ----
function journalClient(API) {
  var root = document.querySelector('.page[data-p="journal"] .jn');
  if (!root) return;
  var DEF = { feeDiscount: 10, minFee: 20, oddMinFee: 1, usFeeRate: 0.1, usMinFee: 0, dcaMinFee: 1 };
  var TAGS = ['一K站三線', '杯柄型態', '潛伏股', '三率三升', '投信買超', '主力鎖碼', '主動ETF加碼', '族群輪動', '技術面', '消息面', '長期投資', '停損', '停利', '其他'];
  var S = null, E = [], names = {}, Q = {}, loaded = false, busy = false, charts = [], gen = 0, P = [], planErr = null;
  function token() { try { return localStorage.getItem('shoupan_token'); } catch (e) { return null; } }
  function api(path, body) {
    var h = { 'Content-Type': 'application/json' }; if (token()) h.Authorization = 'Bearer ' + token();
    return fetch(API + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json(); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v, d) { return v == null || !isFinite(v) ? '-' : Number(v).toLocaleString('zh-TW', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(v) { return (v < 0 ? '-' : '') + '$' + fmt(Math.abs(v)); }
  function pn(v, d) { return '<span class="' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '+' : '') + fmt(v, d) + '</span>'; }
  function pct(v) { return v == null || !isFinite(v) ? '-' : '<span class="' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '+' : '') + v.toFixed(2) + '%</span>'; }
  function today() { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10); }
  function sym(e) { if (e.market === 'US') return e.code; var n = names[e.code]; return e.code + (n && n.m ? '.TWO' : '.TW'); }
  function isETF(code) { return /^00/.test(code); }

  // ---- 手續費／稅 ----
  function feeOf(m, side, price, qty, daytrade, code) {
    var s = S || DEF, amt = price * qty;
    if (!amt) return { fee: 0, tax: 0 };
    if (m === 'US') return { fee: Math.max(s.usMinFee || 0, Math.round(amt * (s.usFeeRate || 0) / 100 * 100) / 100), tax: 0 };
    var odd = qty % 1000 !== 0;
    var fee = Math.max(odd ? s.oddMinFee : s.minFee, Math.floor(amt * 0.001425 * (s.feeDiscount || 10) / 10));
    var tax = side === 'sell' ? Math.floor(amt * (daytrade ? 0.0015 : isETF(code || '') ? 0.001 : 0.003)) : 0;
    return { fee: fee, tax: tax };
  }

  // ---- 計算：現金、庫存（平均成本法）、已實現 ----
  function calc() {
    var cash = 0, invested = 0, dividends = 0, pos = {}, realized = [];
    E.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id; }).forEach(function (e) {
      if (e.kind === 'deposit') { cash += e.amount; invested += e.amount; return; }
      if (e.kind === 'withdraw') { cash -= e.amount; invested -= e.amount; return; }
      if (e.kind === 'dividend') { cash += e.amount; dividends += e.amount; realized.push({ date: e.date, code: e.code, name: e.name, pnl: e.amount, div: true }); return; }
      var fx = e.market === 'US' ? e.fx : 1, key = e.market + ':' + e.code;
      var p = pos[key] || (pos[key] = { market: e.market, code: e.code, name: e.name, qty: 0, cost: 0, costLocal: 0, since: e.kind === 'holding' ? null : e.date });
      if (e.name) p.name = e.name;
      if (e.kind === 'holding' || e.kind === 'buy') {
        if (p.qty <= 0) { p.tp = null; p.sl = null; } // 重新建倉，舊的停利停損不算
        if (e.tp) p.tp = e.tp;
        if (e.sl) p.sl = e.sl;
      }
      if (e.kind === 'holding') {
        // 原有持股：本來就有的股票，不扣現金，成本算進「投入本金」
        var hc = e.price * e.qty * fx;
        p.qty += e.qty; p.cost += hc; p.costLocal += e.price * e.qty; invested += hc;
      } else if (e.kind === 'buy') {
        var c = (e.price * e.qty + (e.fee || 0)) * fx;
        cash -= c; if (p.qty <= 0) p.since = e.date;
        p.qty += e.qty; p.cost += c; p.costLocal += e.price * e.qty + (e.fee || 0);
      } else {
        var got = (e.price * e.qty - (e.fee || 0) - (e.tax || 0)) * fx;
        cash += got;
        var q = Math.min(e.qty, p.qty);
        if (q > 0) {
          var part = p.cost / p.qty * q, pnl = got * (q / e.qty) - part;
          realized.push({ date: e.date, code: e.code, name: p.name, market: e.market, qty: q, pnl: pnl, pct: pnl / part * 100, days: p.since ? Math.round((new Date(e.date) - new Date(p.since)) / 86400000) : null });
          p.costLocal -= p.costLocal / p.qty * q; p.cost -= part; p.qty -= q;
        }
      }
    });
    var hold = Object.keys(pos).map(function (k) { return pos[k]; }).filter(function (p) { return p.qty > 1e-9; });
    var fxNow = Q['USDTWD=X'] && Q['USDTWD=X'].price;
    hold.forEach(function (p) {
      var q = Q[sym(p)], px = q && q.price;
      if (px == null && p.market === 'TW') { var n = names[p.code]; px = n && n.c; }
      p.price = px; p.avg = p.costLocal / p.qty;
      p.mv = px == null ? null : px * p.qty * (p.market === 'US' ? (fxNow || 0) : 1);
      p.upnl = p.mv == null ? null : p.mv - p.cost; p.upct = p.upnl == null ? null : p.upnl / p.cost * 100;
    });
    var mv = hold.reduce(function (a, p) { return a + (p.mv || 0); }, 0);
    return { cash: cash, invested: invested, dividends: dividends, hold: hold, realized: realized, mv: mv, total: cash + mv, fxNow: fxNow };
  }

  function tpsl(p) {
    if (!p.tp && !p.sl) return '<span class="jn-hint">未設定</span>';
    var t = (p.tp ? '🎯 ' + fmt(p.tp, 2) : '') + (p.tp && p.sl ? '　' : '') + (p.sl ? '🛑 ' + fmt(p.sl, 2) : '');
    if (p.price == null) return t;
    if (p.tp && p.price >= p.tp) return t + '<br><span class="chip good">已達停利</span>';
    if (p.sl && p.price <= p.sl) return t + '<br><span class="chip bad">跌破停損</span>';
    return t + (p.tp ? '<br><span class="jn-hint">距停利 ' + ((p.tp / p.price - 1) * 100).toFixed(1) + '%</span>' : '');
  }

  // ---- 我的資產走勢（用交易紀錄＋每天收盤價重算每一天的總資產）----
  var EQ = { range: 'all', mode: 'ret', hist: {} }, eqChart = null;
  function eqHtml() {
    return '<h2>📈 我的資產走勢</h2><div class="jn-eqbar"><div class="jn-seg jn-rng">' + [['all', '從記帳開始'], [30, '近1個月'], [90, '近3個月'], [365, '近1年']].map(function (x) { return '<button type="button" data-r="' + x[0] + '"' + (String(EQ.range) === String(x[0]) ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="jn-seg jn-mode"><button type="button" data-m="value"' + (EQ.mode === 'value' ? ' class="on"' : '') + '>總資產</button><button type="button" data-m="ret"' + (EQ.mode === 'ret' ? ' class="on"' : '') + '>報酬率 vs 大盤</button></div></div>' +
      '<div class="jn-chart jn-eq"><canvas id="jn-c3"></canvas><p class="jn-hint jn-eqmsg">計算中…</p></div><div class="jn-cards jn-eqstats"></div>';
  }
  function histOf(sym, from) {
    var k = sym + '|' + from;
    if (EQ.hist[k]) return Promise.resolve(EQ.hist[k]);
    return fetch(API + '/api/history?s=' + encodeURIComponent(sym) + '&from=' + from).then(function (r) { return r.json(); }).then(function (j) { return (EQ.hist[k] = j.data || []); }).catch(function () { return []; });
  }
  function shift(d, n) { return new Date(new Date(d + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10); }
  function drawEquity(g0) {
    var box = root.querySelector('.jn-eq'); if (!box) return;
    var msg = box.querySelector('.jn-eqmsg');
    // 從「開始記帳那天」算起：最早一筆交易／入金的日期，或第一次輸入資料的那天（原有持股沒有日期）
    var t = today();
    var firsts = E.map(function (e) { return e.kind === 'holding' ? (e.created ? new Date(e.created + 8 * 3600000).toISOString().slice(0, 10) : null) : e.date; }).filter(Boolean).sort();
    var bookStart = firsts[0] || t;
    var start = EQ.range === 'all' ? bookStart : shift(t, -EQ.range);
    if (start < bookStart) start = bookStart;
    if (start < shift(t, -1095)) start = shift(t, -1095);
    var keys = {}; E.forEach(function (e) { if (e.kind === 'buy' || e.kind === 'sell' || e.kind === 'holding') keys[e.market + ':' + e.code] = e; });
    var syms = Object.keys(keys).map(function (k) { return sym(keys[k]); });
    var hasUS = Object.keys(keys).some(function (k) { return keys[k].market === 'US'; });
    var from = shift(start, -10);
    var need = syms.concat(['^TWII']).concat(hasUS ? ['USDTWD=X'] : []);
    Promise.all(need.map(function (s) { return histOf(s, from); })).then(function (arr) {
      if (g0 !== gen) return;
      var H = {}; need.forEach(function (s, i) { H[s] = arr[i]; });
      var dates = (H['^TWII'] || []).map(function (x) { return x.date; }).filter(function (d) { return d >= start; });
      if (!dates.length || dates[dates.length - 1] < t) dates.push(t);
      // 每檔的「某天以前最近收盤」
      var ptr = {}, last = {};
      function px(s, d) { var h = H[s] || [], i = ptr[s] || 0; while (i < h.length && h[i].date <= d) { last[s] = h[i].close; i++; } ptr[s] = i; if (d === t && Q[s] && Q[s].price) return Q[s].price; return last[s]; }
      var ent = E.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id; });
      var qty = {}, cash = 0, inv = 0, k = 0, rows = [];
      dates.forEach(function (d) {
        var flow = 0;
        while (k < ent.length && (ent[k].kind === 'holding' || ent[k].date <= d)) {
          var e = ent[k++], fx = e.market === 'US' ? e.fx : 1, key = e.market + ':' + e.code;
          if (e.kind === 'deposit') { cash += e.amount; inv += e.amount; if (rows.length) flow += e.amount; }
          else if (e.kind === 'withdraw') { cash -= e.amount; inv -= e.amount; if (rows.length) flow -= e.amount; }
          else if (e.kind === 'dividend') cash += e.amount;
          else if (e.kind === 'holding') { qty[key] = (qty[key] || 0) + e.qty; inv += e.price * e.qty * fx; if (rows.length) flow += e.price * e.qty * fx; }
          else if (e.kind === 'buy') { qty[key] = (qty[key] || 0) + e.qty; cash -= (e.price * e.qty + (e.fee || 0)) * fx; }
          else if (e.kind === 'sell') { qty[key] = (qty[key] || 0) - e.qty; cash += (e.price * e.qty - (e.fee || 0) - (e.tax || 0)) * fx; }
        }
        var fxd = hasUS ? px('USDTWD=X', d) || 0 : 1, mv = 0;
        Object.keys(qty).forEach(function (key) { var q = qty[key]; if (q <= 1e-9) return; var e = keys[key], p = px(sym(e), d); if (p != null) mv += p * q * (e.market === 'US' ? fxd : 1); });
        rows.push({ d: d, v: cash + mv, inv: inv, flow: flow, idx: px('^TWII', d) });
      });
      // 時間加權報酬（扣掉入金出金的影響），算最大回撤和單日漲跌
      var twr = [1], peak = 1, mdd = 0, best = null, worst = null;
      for (var i = 1; i < rows.length; i++) {
        var p = rows[i - 1].v, r = p > 0 ? (rows[i].v - rows[i].flow - p) / p : 0;
        twr.push(twr[i - 1] * (1 + r));
        if (p > 0) { if (!best || r > best.r) best = { r: r, d: rows[i].d }; if (!worst || r < worst.r) worst = { r: r, d: rows[i].d }; }
        peak = Math.max(peak, twr[i]); mdd = Math.min(mdd, twr[i] / peak - 1);
      }
      if (!rows.length || rows.every(function (x) { return !x.v; })) { msg.textContent = '還沒有資產可以畫，記一筆交易或加入原有持股後就會出現'; return; }
      msg.textContent = '';
      var lab = rows.map(function (x) { return +x.d.slice(5, 7) + '/' + +x.d.slice(8); });
      // 總損益 %：（當天總資產 − 投入本金）÷ 投入本金；本金＝期間第一天的總資產＋之後的入金（扣出金）
      var base = [], bsum = rows[0].v;
      rows.forEach(function (x, i) { if (i > 0) bsum += x.flow; base.push(bsum); });
      var my = rows.map(function (x, i) { return base[i] > 0 ? +(((x.v - base[i]) / base[i]) * 100).toFixed(2) : null; });
      var plAmt = rows[rows.length - 1].v - base[base.length - 1];
      var i0 = rows[0].idx, mk = rows.map(function (x) { return x.idx && i0 ? +((x.idx / i0 - 1) * 100).toFixed(2) : null; });
      // 每天自己的漲跌 %（扣掉當天入金出金）和大盤當天漲跌 %
      var dMy = [], dMk = [], dLab = [], winDays = 0, nDays = 0;
      for (var j = 1; j < rows.length; j++) {
        var pv = rows[j - 1].v, a = pv > 0 ? +(((rows[j].v - rows[j].flow - pv) / pv) * 100).toFixed(2) : null;
        var b = rows[j].idx && rows[j - 1].idx ? +((rows[j].idx / rows[j - 1].idx - 1) * 100).toFixed(2) : null;
        dMy.push(a); dMk.push(b); dLab.push(lab[j]);
        if (a != null && b != null) { nDays++; if (a > b) winDays++; }
      }
      var cs = getComputedStyle(document.documentElement), fg = cs.getPropertyValue('--fg').trim() || '#222', up = cs.getPropertyValue('--up').trim() || '#d0312d';
      var dn = cs.getPropertyValue('--dn').trim() || '#16a34a';
      var ds = EQ.mode === 'value'
        ? [{ label: '總資產', data: rows.map(function (x) { return Math.round(x.v); }), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.25, pointRadius: 0, borderWidth: 2.5 }]
        : [{ label: '我的總損益 %', data: my, borderColor: up, tension: 0.25, pointRadius: 0, borderWidth: 2.5 }, { label: '加權指數', data: mk, borderColor: '#94a3b8', borderDash: [6, 5], tension: 0.25, pointRadius: 0, borderWidth: 2 }];
      loadChart().then(function () {
        if (g0 !== gen) return;
        if (eqChart) eqChart.destroy();
        eqChart = new Chart(document.getElementById('jn-c3'), { type: 'line', data: { labels: lab, datasets: ds }, options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: EQ.mode === 'ret', labels: { color: fg } }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + '：' + (EQ.mode === 'value' ? '$' + c.raw.toLocaleString() : (c.raw >= 0 ? '+' : '') + c.raw + '%'); } } } }, scales: { x: { ticks: { color: fg, maxTicksLimit: 7 }, grid: { display: false } }, y: { ticks: { color: fg, callback: function (v) { return EQ.mode === 'value' ? (Math.abs(v) >= 1e4 ? (v / 1e4).toFixed(0) + '萬' : v) : v + '%'; } } } } } });
      });
      var lastMy = my[my.length - 1], lastMk = mk[mk.length - 1];
      root.querySelector('.jn-eqstats').innerHTML =
        '<div><b>' + pct(lastMy) + '</b><span>' + (start === bookStart ? '記帳以來總損益' : '期間總損益') + '</span><small>' + (plAmt >= 0 ? '+' : '-') + '$' + fmt(Math.abs(plAmt)) + '</small></div>' +
        '<div><b>' + (lastMk == null ? '-' : pct(lastMk)) + '</b><span>同期加權指數</span>' + (lastMk == null ? '' : '<small>' + (lastMy >= lastMk ? '贏大盤 ' : '輸大盤 ') + Math.abs(lastMy - lastMk).toFixed(2) + ' 個百分點</small>') + '</div>' +
        '<div><b>' + winDays + ' / ' + nDays + ' 天</b><span>贏大盤的天數</span><small>當天漲幅比大盤好</small></div>' +
        '<div><b>' + pct(mdd * 100) + '</b><span>最大回撤</span><small>從高點最多跌多少</small></div>' +
        '<div><b>' + (best ? pct(best.r * 100) : '-') + '</b><span>單日最大漲幅</span>' + (best ? '<small>' + +best.d.slice(5, 7) + '/' + +best.d.slice(8) + '</small>' : '') + '</div>' +
        '<div><b>' + (worst ? pct(worst.r * 100) : '-') + '</b><span>單日最大跌幅</span>' + (worst ? '<small>' + +worst.d.slice(5, 7) + '/' + +worst.d.slice(8) + '</small>' : '') + '</div>' +
        '<div><b>$' + fmt(rows[rows.length - 1].v) + '</b><span>目前總資產</span></div>';
    });
  }
  root.addEventListener('click', function (ev) {
    var r = ev.target.closest('.jn-rng [data-r]'), m = ev.target.closest('.jn-mode [data-m]');
    if (!r && !m) return;
    if (r) EQ.range = r.dataset.r === 'all' ? 'all' : +r.dataset.r;
    if (m) EQ.mode = m.dataset.m;
    root.querySelectorAll('.jn-rng [data-r]').forEach(function (b) { b.classList.toggle('on', String(EQ.range) === b.dataset.r); });
    root.querySelectorAll('.jn-mode [data-m]').forEach(function (b) { b.classList.toggle('on', EQ.mode === b.dataset.m); });
    drawEquity(gen);
  });

  // ---- 畫面 ----
  function render() {
    if (!S) return renderSetup();
    var r = calc();
    var rz = r.realized.reduce(function (a, x) { return a + x.pnl; }, 0), uz = r.hold.reduce(function (a, p) { return a + (p.upnl || 0); }, 0);
    var trades = r.realized.filter(function (x) { return !x.div; }), wins = trades.filter(function (x) { return x.pnl > 0; });
    var ret = r.invested > 0 ? (r.total - r.invested) / r.invested * 100 : null, dcT = dayCalc();
    var h = '<div class="jn-cards"><div><b>' + money(r.total) + '</b><span>總資產（現金＋股票）</span>' + (ret == null && !dcT ? '' : '<small>' + (ret == null ? '' : '總報酬 ' + pct(ret)) + (dcT && dcT.my != null ? '　今日 ' + pct(dcT.my) : '') + '</small>') + '</div>' +
      '<div><b>' + money(r.cash) + '</b><span>現金</span></div><div><b>' + money(r.mv) + '</b><span>股票市值</span></div>' +
      '<div><b>' + pn(uz) + '</b><span>未實現損益</span></div><div><b>' + pn(rz) + '</b><span>已實現損益（含股利）</span></div>' +
      '<div><b>' + (trades.length ? Math.round(wins.length / trades.length * 100) + '%' : '-') + '</b><span>勝率（' + trades.length + ' 筆賣出）</span></div></div>';
    if (r.cash < 0) h += '<p class="jn-hint">⚠️ 現金是負的：可能還沒記「入金」，按「💵 現金」補上起始資金或入金。</p>';
    h += '<div class="jn-acts"><button type="button" class="main" data-a="trade">＋ 記一筆交易</button><button type="button" data-a="holding">📦 原有持股</button><button type="button" data-a="plans">🔁 定期定額</button><button type="button" data-a="cash">💵 現金／股利</button><button type="button" data-a="settings">⚙️ 手續費設定</button><button type="button" data-goto="fee">🧮 手續費試算</button></div>';
    // 庫存
    // 到價提醒
    var hits = r.hold.filter(function (p) { return p.price != null && ((p.tp && p.price >= p.tp) || (p.sl && p.price <= p.sl)); });
    if (hits.length) h += '<div class="vote-saved" style="margin:8px 0">' + hits.map(function (p) { return p.tp && p.price >= p.tp ? '🎯 <b>' + esc(p.name || p.code) + '</b> 已到預計停利價 ' + fmt(p.tp, 2) + '（現價 ' + fmt(p.price, 2) + '）' : '🛑 <b>' + esc(p.name || p.code) + '</b> 已跌破預計停損價 ' + fmt(p.sl, 2) + '（現價 ' + fmt(p.price, 2) + '）'; }).join('<br>') + '</div>';
    h += '<h2>目前庫存 <span class="count">' + r.hold.length + ' 檔' + (r.fxNow ? '・美元匯率 ' + r.fxNow.toFixed(2) : '') + '</span></h2>';
    h += r.hold.length ? '<div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>股數</th><th>均價</th><th>現價</th><th>市值（台幣）</th><th>未實現</th><th>報酬率</th><th>停利／停損</th><th>比重</th></tr></thead><tbody>' +
      r.hold.sort(function (a, b) { return (b.mv || 0) - (a.mv || 0); }).map(function (p) {
        return '<tr><td class="nm"><button class="jn-edit" data-pos="' + p.market + ':' + esc(p.code) + '" title="修改">✏️</button>' + esc(p.code) + ' ' + esc(p.name || '') + (p.market === 'US' ? '<span class="tag">美</span>' : '') + '</td><td>' + fmt(p.qty) + '</td><td>' + fmt(p.avg, 2) + '</td><td>' + (p.price == null ? '-' : fmt(p.price, 2)) + '</td><td>' + (p.mv == null ? '-' : fmt(p.mv)) + '</td><td>' + (p.upnl == null ? '-' : pn(p.upnl)) + '</td><td>' + pct(p.upct) + '</td><td class="jn-note">' + tpsl(p) + '</td><td>' + (p.mv ? (p.mv / Math.max(r.total, r.mv) * 100).toFixed(1) + '%' : '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="empty">還沒有庫存，按「＋ 記一筆交易」開始</p>';
    h += eqHtml();
    h += plansSection(r);
    if (planErr) h += '<p class="jn-hint">⚠️ 定期定額自動記帳暫時失敗（' + esc(planErr) + '），稍後重新整理會再補上。</p>';
    // 圖表
    h += '<h2>圖表</h2><div class="jn-charts"><div class="jn-chart"><h4>資產配置</h4><canvas id="jn-c1"></canvas></div><div class="jn-chart"><h4>每月已實現損益</h4><canvas id="jn-c2"></canvas></div></div>';
    // 已實現統計
    if (trades.length) {
      var avgW = wins.length ? wins.reduce(function (a, x) { return a + x.pct; }, 0) / wins.length : null;
      var loss = trades.filter(function (x) { return x.pnl <= 0; });
      var avgL = loss.length ? loss.reduce(function (a, x) { return a + x.pct; }, 0) / loss.length : null;
      var best = trades.reduce(function (a, x) { return !a || x.pnl > a.pnl ? x : a; }, null), worst = trades.reduce(function (a, x) { return !a || x.pnl < a.pnl ? x : a; }, null);
      h += '<h2>交易統計</h2><div class="jn-cards"><div><b>' + pct(avgW) + '</b><span>平均獲利（賺的那幾筆）</span></div><div><b>' + pct(avgL) + '</b><span>平均虧損（賠的那幾筆）</span></div><div><b>' + (best.pnl > 0 ? pn(best.pnl) : '-') + '</b><span>最大獲利' + (best.pnl > 0 ? '：' + esc(best.name || best.code) : '') + '</span></div><div><b>' + (worst.pnl < 0 ? pn(worst.pnl) : '-') + '</b><span>最大虧損' + (worst.pnl < 0 ? '：' + esc(worst.name || worst.code) : '') + '</span></div><div><b>' + (function () { var d = trades.filter(function (x) { return x.days != null; }); return d.length ? fmt(d.reduce(function (a, x) { return a + x.days; }, 0) / d.length, 1) + ' 天' : '-'; })() + '</b><span>平均持有</span></div><div><b>' + pn(r.dividends) + '</b><span>股利收入</span></div></div>';
    }
    // 紀錄
    var kindTxt = { buy: '買進', sell: '賣出', deposit: '入金', withdraw: '出金', dividend: '股利', holding: '原有持股' };
    var rows = E.slice().sort(function (a, b) { return a.date > b.date ? -1 : a.date < b.date ? 1 : b.id - a.id; }).map(function (e) {
      var isT = e.kind === 'buy' || e.kind === 'sell' || e.kind === 'holding';
      var what = isT ? esc(e.code) + ' ' + esc(e.name || '') + (e.market === 'US' ? '<span class="tag">美</span>' : '') : e.kind === 'dividend' ? esc((e.code || '') + ' ' + (e.name || '')) : '-';
      var detail = isT ? fmt(e.price, 2) + ' × ' + fmt(e.qty) + (e.market === 'US' ? '（匯率 ' + e.fx + '）' : '') : money(e.amount);
      var cost = isT ? fmt((e.fee || 0) + (e.tax || 0), e.market === 'US' ? 2 : 0) : '';
      return '<tr><td class="jn-ops"><button class="jn-edit" data-id="' + e.id + '">✏️ 編輯</button><button class="jn-del" data-id="' + e.id + '">刪除</button></td><td>' + (e.kind === 'holding' ? '原有' : e.date.slice(5).replace('-', '/')) + '</td><td><span class="chip ' + (e.kind === 'holding' ? 'mid' : e.kind === 'buy' || e.kind === 'deposit' || e.kind === 'dividend' ? 'good' : 'bad') + '">' + kindTxt[e.kind] + (e.daytrade ? '・當沖' : '') + '</span></td><td class="nm">' + what + '</td><td>' + detail + '</td><td>' + cost + '</td><td class="jn-note">' + (e.tags && e.tags.length ? e.tags.map(function (t) { return '<span class="chip mid">' + esc(t) + '</span>'; }).join('') + ' ' : '') + esc(e.note || '') + '</td></tr>';
    }).join('');
    h += '<h2>交易紀錄 <span class="count">' + E.length + ' 筆</span></h2>' + (rows ? '<div class="scroll"><table class="compact"><thead><tr><th></th><th>日期</th><th>種類</th><th>股票</th><th>價格 × 數量／金額</th><th>手續費＋稅</th><th>理由／心得</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty">還沒有紀錄</p>');
    h += '<p class="jn-hint">損益用「平均成本法」計算，含手續費與交易稅；美股以交易當時匯率換算成台幣成本，市值用目前匯率。現價每分鐘更新，台股盤後以收盤價為準。資料只有你自己看得到。</p>';
    root.innerHTML = h;
    drawCharts(r, ++gen);
    drawEquity(gen);
  }

  function renderSetup() {
    root.innerHTML = '<div class="pf-lock" style="display:block;text-align:left"><h3>📒 開始使用股票日誌</h3><p class="jn-hint">先設定起始現金和你的券商手續費。不知道或不想填，直接按「用預設值開始」：台股手續費 0.1425% 不打折、最低 20 元；美股 0.1%。之後隨時可以在「⚙️ 手續費設定」修改。<br>開始後可以按「📦 原有持股」把本來就有的股票加進來，只要填股數和平均成本。</p>' +
      '<form class="jn-form" style="padding:0;max-width:none;background:none" onsubmit="return false">' + settingsFields(DEF, true) + '<div class="jn-btns"><button type="button" data-a="setup-default">用預設值開始</button><button type="button" class="main" data-a="setup-save">儲存並開始</button></div><div class="jn-err"></div></form></div>';
  }
  function settingsFields(s, withCash) {
    return (withCash ? '<label>起始現金（台幣，可不填）</label><input name="cash" inputmode="decimal" placeholder="例如 500000">' : '') +
      '<label>台股手續費折扣（折）</label><input name="feeDiscount" inputmode="decimal" placeholder="例如 2.8；不打折請留空" value="' + (s.feeDiscount && s.feeDiscount !== 10 ? s.feeDiscount : '') + '">' +
      '<div class="jn-row"><div><label>最低手續費（整股）</label><input name="minFee" inputmode="decimal" value="' + s.minFee + '"></div><div><label>最低手續費（零股）</label><input name="oddMinFee" inputmode="decimal" value="' + s.oddMinFee + '"></div></div>' +
      '<label>定期定額最低手續費（台股）</label><input name="dcaMinFee" inputmode="decimal" value="' + (s.dcaMinFee != null ? s.dcaMinFee : 1) + '">' +
      '<div class="jn-row"><div><label>美股手續費率（%）</label><input name="usFeeRate" inputmode="decimal" value="' + s.usFeeRate + '"></div><div><label>美股最低手續費（美元）</label><input name="usMinFee" inputmode="decimal" value="' + s.usMinFee + '"></div></div>';
  }
  function readSettings(f) {
    var v = function (k, d) { var x = parseFloat(f[k] ? f[k].value : ''); return isFinite(x) ? x : d; };
    return { feeDiscount: v('feeDiscount', 10), minFee: v('minFee', 20), oddMinFee: v('oddMinFee', 1), usFeeRate: v('usFeeRate', 0.1), usMinFee: v('usMinFee', 0), dcaMinFee: v('dcaMinFee', 1) };
  }

  // ---- 圖表（Chart.js，用到才載入）----
  function loadChart() {
    if (window.Chart) return Promise.resolve();
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  }
  function drawCharts(r, g) {
    loadChart().then(function () {
      if (g !== gen) return; // 畫面已重畫，交給最新一次
      charts.forEach(function (c) { c.destroy(); }); charts = [];
      var cs = getComputedStyle(document.documentElement), fg = cs.getPropertyValue('--fg').trim() || '#222', up = cs.getPropertyValue('--up').trim() || '#d0312d', dn = cs.getPropertyValue('--dn').trim() || '#16a34a';
      var pal = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];
      var items = r.hold.filter(function (p) { return p.mv > 0; }).sort(function (a, b) { return b.mv - a.mv; });
      var labels = [], data = [];
      items.slice(0, 7).forEach(function (p) { labels.push(p.name || p.code); data.push(Math.round(p.mv)); });
      var rest = items.slice(7).reduce(function (a, p) { return a + p.mv; }, 0); if (rest > 0) { labels.push('其他'); data.push(Math.round(rest)); }
      if (r.cash > 0) { labels.push('現金'); data.push(Math.round(r.cash)); }
      var c1 = document.getElementById('jn-c1'), c2 = document.getElementById('jn-c2');
      if (c1 && data.length) charts.push(new Chart(c1, { type: 'doughnut', data: { labels: labels, datasets: [{ data: data, backgroundColor: labels.map(function (l, i) { return l === '現金' ? '#94a3b8' : pal[i % pal.length]; }), borderWidth: 0 }] }, options: { plugins: { legend: { position: 'right', labels: { color: fg, boxWidth: 12 } }, tooltip: { callbacks: { label: function (c) { var t = data.reduce(function (a, b) { return a + b; }, 0); return c.label + '：$' + c.raw.toLocaleString() + '（' + (c.raw / t * 100).toFixed(1) + '%）'; } } } }, cutout: '62%' } }));
      else if (c1) c1.parentNode.insertAdjacentHTML('beforeend', '<p class="empty">還沒有資產</p>');
      var byM = {}; r.realized.forEach(function (x) { var m = x.date.slice(0, 7); byM[m] = (byM[m] || 0) + x.pnl; });
      var ms = Object.keys(byM).sort().slice(-12);
      if (c2 && ms.length) charts.push(new Chart(c2, { type: 'bar', data: { labels: ms.map(function (m) { return +m.slice(5) + '月'; }), datasets: [{ data: ms.map(function (m) { return Math.round(byM[m]); }), backgroundColor: ms.map(function (m) { return byM[m] >= 0 ? up : dn; }), borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: fg }, grid: { display: false } }, y: { ticks: { color: fg } } } } }));
      else if (c2) c2.parentNode.insertAdjacentHTML('beforeend', '<p class="empty">賣出後就會有已實現損益</p>');
    }).catch(function () {});
  }

  // ---- 表單 ----
  var modal = document.createElement('div'); modal.id = 'jn-modal'; modal.hidden = true; document.body.appendChild(modal);
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
  function open(html) { modal.innerHTML = '<form class="jn-form" onsubmit="return false">' + html + '</form>'; modal.hidden = false; return modal.querySelector('form'); }

  function tradeForm(e, holdingMode, toTpsl) {
    e = e || { kind: holdingMode ? 'holding' : 'buy', market: 'TW', date: today(), tags: [] };
    var H = e.kind === 'holding'; // 原有持股：不用日期、手續費，不扣現金
    var f = open('<h3>' + (H ? (e.id ? '編輯原有持股' : '📦 加入原有持股') : e.id ? '編輯交易' : '記一筆交易') + '</h3>' + (H ? '<p class="jn-hint">本來就持有的股票：填股數和平均成本就好，不用日期和手續費，也不會扣現金。之後賣出會用這個成本算損益。</p>' : '') +
      '<div class="jn-seg mk"><button type="button" data-m="TW">🇹🇼 台股</button><button type="button" data-m="US">🇺🇸 美股</button></div>' +
      '<div class="jn-seg sd" style="margin-top:8px"><button type="button" class="buy" data-s="buy">買進</button><button type="button" class="sell" data-s="sell">賣出</button></div>' +
      '<label>日期</label><input type="date" name="date" value="' + e.date + '">' +
      '<label>股票</label><div class="jn-sug"><input name="code" autocomplete="off" placeholder="代號或名稱，例如 2330、台積電、0050、AAPL" value="' + esc(e.code ? e.code + (e.name ? ' ' + e.name : '') : '') + '"><ul hidden></ul></div>' +
      '<div class="jn-row"><div><label>成交價</label><input name="price" inputmode="decimal" value="' + (e.price || '') + '"></div><div><label class="qlab">股數</label><input name="qty" inputmode="decimal" value="' + (e.qty || '') + '"></div></div>' +
      '<div class="jn-hint tw-only">台股以「股」為單位：1 張＝1000 股，零股直接填股數。<button type="button" class="jn-edit" data-a="lot">×1000（換成張）</button>　<label style="display:inline;color:inherit"><input type="checkbox" name="daytrade" style="width:auto"' + (e.daytrade ? ' checked' : '') + '> 當沖</label></div>' +
      '<div class="us-only"><label>匯率（美元→台幣）</label><input name="fx" inputmode="decimal" value="' + (e.fx && e.market === 'US' ? e.fx : '') + '"></div>' +
      '<div class="jn-row"><div><label>手續費</label><input name="fee" inputmode="decimal" value="' + (e.id ? e.fee : '') + '"></div><div><label>交易稅</label><input name="tax" inputmode="decimal" value="' + (e.id ? e.tax : '') + '"></div></div>' +
      '<div class="jn-calc"></div>' +
      '<label>進場／出場理由（可複選）</label><div class="jn-tags">' + TAGS.map(function (t) { return '<button type="button" data-t="' + t + '"' + ((e.tags || []).indexOf(t) >= 0 ? ' class="on"' : '') + '>' + t + '</button>'; }).join('') + '</div>' +
      '<label>心得筆記</label><textarea name="note" maxlength="500" placeholder="為什麼買／賣？下次要注意什麼？">' + esc(e.note || '') + '</textarea>' +
      '<div class="jn-btns"><button type="button" data-a="close">取消</button><button type="button" class="main" data-a="save-trade">儲存</button></div><div class="jn-err"></div>');
    var st = { market: e.market || 'TW', kind: H ? 'holding' : e.kind === 'sell' ? 'sell' : 'buy', code: e.code || '', name: e.name || '', manualFee: !!e.id };
    if (H) {
      // 原有持股：藏起買賣、日期、手續費、當沖、理由
      var hide = function (el) { if (el) el.style.display = 'none'; };
      hide(f.querySelector('.sd')); hide(f.date); hide(f.date.previousElementSibling);
      hide(f.fee.closest('.jn-row')); hide(f.daytrade.parentNode);
      var tg = f.querySelector('.jn-tags'); hide(tg); hide(tg.previousElementSibling);
      f.price.closest('div').querySelector('label').textContent = '平均成本（每股）';
    }
    // 第二步：預計停利／停損（買進、原有持股才有，可以跳過）
    var errEl = f.querySelector('.jn-err');
    var s1 = document.createElement('div'); s1.className = 'st1';
    while (f.firstChild && f.firstChild !== errEl) s1.appendChild(f.firstChild);
    f.insertBefore(s1, errEl);
    var s2 = document.createElement('div'); s2.className = 'st2'; s2.hidden = true;
    s2.innerHTML = '<h3>🎯 預計停利／停損 <span class="jn-hint">（可跳過）</span></h3><p class="jn-hint">先想好出場點，照計畫賣。現價到了，庫存會提醒你。</p>' +
      '<label>預計停利價</label><input name="tp" inputmode="decimal" value="' + (e.tp || '') + '"><div class="jn-quick" data-for="tp"><button type="button" data-p="10">+10%</button><button type="button" data-p="20">+20%</button><button type="button" data-p="30">+30%</button><input class="jn-pctin" inputmode="decimal" placeholder="自訂 %"><span class="jn-pct"></span></div>' +
      '<label>預計停損價</label><input name="sl" inputmode="decimal" value="' + (e.sl || '') + '"><div class="jn-quick" data-for="sl"><button type="button" data-p="-5">-5%</button><button type="button" data-p="-8">-8%</button><button type="button" data-p="-10">-10%</button><input class="jn-pctin" inputmode="decimal" placeholder="自訂 %"><span class="jn-pct"></span></div>' +
      '<div class="jn-btns"><button type="button" data-a="back">← 上一步</button><button type="button" data-a="skip">跳過</button><button type="button" class="main" data-a="save-final">儲存</button></div>';
    f.insertBefore(s2, errEl);
    var mainBtn = s1.querySelector('[data-a="save-trade"]');
    function stepBtn() { mainBtn.textContent = st.kind === 'sell' ? '儲存' : '下一步 →'; }
    function pctShow() {
      var base = parseFloat(f.price.value) || 0;
      s2.querySelectorAll('.jn-quick').forEach(function (q) {
        var v = parseFloat(f[q.dataset.for].value);
        q.querySelector('.jn-pct').innerHTML = base && v ? '（' + pct((v / base - 1) * 100) + '）' : '';
      });
    }
    s2.querySelectorAll('.jn-quick button').forEach(function (b) {
      b.onclick = function () { var base = parseFloat(f.price.value) || 0; if (!base) return; f[b.parentNode.dataset.for].value = Math.round(base * (1 + b.dataset.p / 100) * 100) / 100; pctShow(); };
    });
    f.tp.addEventListener('input', pctShow); f.sl.addEventListener('input', pctShow);
    // 自訂 %：停利填 15 就是 +15%；停損填 7 或 -7 都當成 -7%
    s2.querySelectorAll('.jn-pctin').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var base = parseFloat(f.price.value) || 0, v = parseFloat(inp.value);
        if (!base || !isFinite(v)) return;
        var forSl = inp.parentNode.dataset.for === 'sl', p = forSl ? -Math.abs(v) : v;
        f[inp.parentNode.dataset.for].value = Math.round(base * (1 + p / 100) * 100) / 100; pctShow();
      });
    });
    function seg() {
      stepBtn();
      f.querySelectorAll('.mk button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === st.market); });
      f.querySelectorAll('.sd button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === st.kind); });
      f.querySelector('.tw-only').hidden = st.market !== 'TW'; f.querySelector('.us-only').hidden = st.market !== 'US';
      f.tax.parentNode.hidden = st.market === 'US';
      f.querySelector('.qlab').textContent = st.market === 'US' ? '股數' : '股數（1 張 = 1000）';
      if (st.market === 'US' && !f.fx.value) quotes(['USDTWD=X']).then(function () { if (!f.fx.value && Q['USDTWD=X']) { f.fx.value = Q['USDTWD=X'].price.toFixed(2); recalc(); } });
      recalc();
    }
    function recalc() {
      var p = parseFloat(f.price.value) || 0, q = parseFloat(f.qty.value) || 0;
      if (H) {
        var fx0 = st.market === 'US' ? parseFloat(f.fx.value) || 0 : 1;
        f.querySelector('.jn-calc').innerHTML = p && q ? '成本合計 <b>' + (st.market === 'US' ? 'US$' + fmt(p * q, 2) + '（約台幣 $' + fmt(p * q * fx0) + '）' : '$' + fmt(p * q)) + '</b>' : '';
        return;
      }
      var c = feeOf(st.market, st.kind, p, q, f.daytrade.checked, st.code);
      if (!st.manualFee) { f.fee.value = p && q ? c.fee : ''; f.tax.value = p && q && st.market === 'TW' ? c.tax : ''; }
      var fee = parseFloat(f.fee.value) || 0, tax = parseFloat(f.tax.value) || 0, fx = st.market === 'US' ? parseFloat(f.fx.value) || 0 : 1;
      var total = st.kind === 'buy' ? (p * q + fee) : (p * q - fee - tax);
      f.querySelector('.jn-calc').innerHTML = p && q ? (st.kind === 'buy' ? '應付' : '實收') + ' <b>' + (st.market === 'US' ? 'US$' + fmt(total, 2) + '（約台幣 $' + fmt(total * fx) + '）' : '$' + fmt(total)) + '</b>' + (st.manualFee ? '' : '　<span>手續費、稅已依你的設定自動計算，可手動修改</span>') : '';
    }
    f.querySelectorAll('.mk button').forEach(function (b) { b.onclick = function () { st.market = b.dataset.m; st.code = ''; st.name = ''; f.code.value = ''; seg(); }; });
    f.querySelectorAll('.sd button').forEach(function (b) { b.onclick = function () { st.kind = b.dataset.s; seg(); }; });
    f.querySelectorAll('.jn-tags button').forEach(function (b) { b.onclick = function () { b.classList.toggle('on'); }; });
    ['price', 'qty', 'fx'].forEach(function (k) { f[k].addEventListener('input', recalc); });
    f.daytrade.addEventListener('change', recalc);
    ['fee', 'tax'].forEach(function (k) { f[k].addEventListener('input', function () { st.manualFee = true; recalc(); }); });
    f.querySelector('[data-a="lot"]').onclick = function () { var q = parseFloat(f.qty.value) || 0; if (q) { f.qty.value = q * 1000; recalc(); } };
    // 股票建議清單（手機也能用）
    var ul = f.querySelector('.jn-sug ul');
    function pick(code, name) {
      st.code = code; st.name = name || ''; f.code.value = code + (name ? ' ' + name : ''); ul.hidden = true; recalc();
      if (!f.price.value && !H) quotes([sym({ market: st.market, code: code })]).then(function () { var q = Q[sym({ market: st.market, code: code })]; if (q && q.price && !f.price.value) { f.price.value = q.price; recalc(); } if (st.market === 'US' && q && q.name && !st.name) { st.name = q.name; f.code.value = code + ' ' + q.name; } });
    }
    f.code.addEventListener('input', function () {
      var v = f.code.value.trim().toUpperCase(); st.code = ''; st.name = '';
      if (!v) { ul.hidden = true; return; }
      if (st.market === 'US') { ul.innerHTML = '<li data-c="' + esc(v.split(' ')[0]) + '">' + esc(v.split(' ')[0]) + '（美股代號）</li>'; ul.hidden = false; return; }
      var hits = Object.keys(names).filter(function (c) { return c.indexOf(v) === 0 || (names[c].n || '').toUpperCase().indexOf(v) >= 0; }).sort(function (a, b) { return (a.indexOf(v) === 0 ? 0 : 1) - (b.indexOf(v) === 0 ? 0 : 1) || a.length - b.length || (a < b ? -1 : 1); }).slice(0, 8);
      ul.innerHTML = hits.map(function (c) { return '<li data-c="' + c + '" data-n="' + esc(names[c].n) + '">' + c + ' ' + esc(names[c].n) + '</li>'; }).join('') || '<li class="no">找不到，請確認代號</li>';
      ul.hidden = false;
    });
    ul.addEventListener('click', function (ev) { var li = ev.target.closest('li[data-c]'); if (li) pick(li.dataset.c, li.dataset.n); });
    f.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') modal.hidden = true;
      if (a.dataset.a === 'back') { s2.hidden = true; s1.hidden = false; errEl.textContent = ''; return; }
      if (a.dataset.a === 'save-trade' || a.dataset.a === 'skip' || a.dataset.a === 'save-final') {
        if (!st.code) { var v = f.code.value.trim().split(' ')[0].toUpperCase(); if (st.market === 'US' && /^[A-Z.\-]{1,10}$/.test(v)) st.code = v; else if (names[v]) { st.code = v; st.name = names[v].n; } }
        var body = { id: e.id, kind: H ? 'buy' : st.kind, market: st.market, date: H ? '2000-01-01' : f.date.value, code: st.code, name: st.name, price: parseFloat(f.price.value), qty: parseFloat(f.qty.value), fee: parseFloat(f.fee.value) || 0, tax: st.market === 'TW' ? parseFloat(f.tax.value) || 0 : 0, fx: st.market === 'US' ? parseFloat(f.fx.value) : 1, daytrade: st.market === 'TW' && f.daytrade.checked, tags: [].map.call(f.querySelectorAll('.jn-tags button.on'), function (b) { return b.dataset.t; }), note: f.note.value };
        if (H) { body.fee = 0; body.tax = 0; body.daytrade = false; body.tags = []; } // 原有持股：存成日期 2000-01-01、零手續費的買進
        if (!body.code) return (errEl.textContent = '請從清單選擇股票');
        if (!body.price || !body.qty) return (errEl.textContent = '請填價格和股數');
        // 買進／原有持股：先到第二步填停利停損
        if (a.dataset.a === 'save-trade' && st.kind !== 'sell') { s1.hidden = true; s2.hidden = false; errEl.textContent = ''; pctShow(); return; }
        body.tp = a.dataset.a === 'save-final' ? parseFloat(f.tp.value) || null : null;
        body.sl = a.dataset.a === 'save-final' ? parseFloat(f.sl.value) || null : null;
        save('/api/journal/entry', body, f);
      }
    });
    seg();
    if (toTpsl && st.kind !== 'sell') mainBtn.click();
  }

  // ---- 修改某一檔持股：列出它的所有紀錄 ----
  function posModal(key) {
    var mk = key.split(':')[0], code = key.slice(mk.length + 1);
    var list = E.filter(function (e) { return e.market === mk && e.code === code && (e.kind === 'buy' || e.kind === 'sell' || e.kind === 'holding'); }).sort(function (a, b) { return a.date > b.date ? -1 : a.date < b.date ? 1 : b.id - a.id; });
    var name = (list[0] && list[0].name) || code;
    var last = list.filter(function (e) { return e.kind === 'buy' || e.kind === 'holding'; })[0];
    var kindTxt = { buy: '買進', sell: '賣出', holding: '原有持股' };
    var f = open('<h3>✏️ ' + esc(code) + ' ' + esc(name) + '</h3><p class="jn-hint">股數或成本不對，就修改下面的紀錄；庫存會自動重算。</p>' +
      '<div class="jn-acts">' + (last ? '<button type="button" class="main" data-a="tpsl">🎯 修改停利／停損</button>' : '') + '<button type="button" data-a="add-buy">＋ 再買進</button><button type="button" data-a="add-sell">＋ 賣出</button></div>' +
      '<div class="scroll"><table class="compact"><tbody>' + list.map(function (e) {
        return '<tr><td class="jn-ops"><button type="button" class="jn-edit" data-eid="' + e.id + '">✏️ 編輯</button><button type="button" class="jn-del" data-eid-del="' + e.id + '">刪除</button></td><td>' + (e.kind === 'holding' ? '原有' : e.date.slice(5).replace('-', '/')) + '</td><td><span class="chip ' + (e.kind === 'sell' ? 'bad' : e.kind === 'holding' ? 'mid' : 'good') + '">' + kindTxt[e.kind] + '</span></td><td>' + fmt(e.price, 2) + ' × ' + fmt(e.qty) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="jn-btns"><button type="button" data-a="close">關閉</button></div><div class="jn-err"></div>');
    f.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-a]');
      if (a && a.dataset.a === 'close') modal.hidden = true;
      if (a && a.dataset.a === 'tpsl') tradeForm(last, false, true);
      if (a && (a.dataset.a === 'add-buy' || a.dataset.a === 'add-sell')) tradeForm({ kind: a.dataset.a === 'add-buy' ? 'buy' : 'sell', market: mk, code: code, name: name, date: today(), tags: [] });
      var ed = ev.target.closest('[data-eid]'); if (ed) tradeForm(E.filter(function (x) { return x.id == ed.dataset.eid; })[0]);
      var dl = ev.target.closest('[data-eid-del]'); if (dl && confirm('確定要刪除這筆紀錄嗎？')) api('/api/journal/delete', { id: +dl.dataset.eidDel }).then(function () { modal.hidden = true; reload(); });
    });
  }

  // ---- 定期定額 ----
  function planStats(p, r) {
    var mine = E.filter(function (e) { return e.plan && e.plan.split(':')[0] == p.id; });
    var cost = mine.reduce(function (a, e) { return a + (e.price * e.qty + (e.fee || 0)) * (e.market === 'US' ? e.fx : 1); }, 0);
    var qty = mine.reduce(function (a, e) { return a + e.qty; }, 0);
    var h = r.hold.filter(function (x) { return x.market === p.market && x.code === p.code; })[0];
    var mv = h && h.price != null ? h.price * qty * (p.market === 'US' ? (r.fxNow || 0) : 1) : null;
    return { n: mine.length, cost: cost, qty: qty, mv: mv };
  }
  function nextDate(p) {
    var t = today(), y = +t.slice(0, 4), m = +t.slice(5, 7);
    for (var k = 0; k < 3; k++) {
      for (var i = 0; i < p.days.length; i++) {
        var d = y + '-' + String(m).padStart(2, '0') + '-' + String(p.days[i]).padStart(2, '0');
        if (d > t && d >= p.start) return +d.slice(5, 7) + '/' + +d.slice(8);
      }
      m++; if (m > 12) { m = 1; y++; }
    }
    return '-';
  }
  function plansSection(r) {
    if (!P.length) return '';
    return '<h2>🔁 定期定額 <span class="count">' + P.length + ' 個・扣款日收盤後自動記帳</span></h2><div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>每次</th><th>扣款日</th><th>下次</th><th>已扣</th><th>累積投入</th><th>目前市值</th><th>報酬率</th><th></th></tr></thead><tbody>' +
      P.map(function (p) {
        var s = planStats(p, r);
        return '<tr><td class="nm">' + esc(p.code) + ' ' + esc(p.name || '') + (p.market === 'US' ? '<span class="tag">美</span>' : '') + (p.active ? '' : ' <span class="chip mid">暫停</span>') + '</td><td>' + (p.market === 'US' ? 'US$' + fmt(p.amount, 2) : '$' + fmt(p.amount)) + '</td><td>每月 ' + p.days.join('、') + ' 日</td><td>' + (p.active ? nextDate(p) : '-') + '</td><td>' + s.n + ' 次</td><td>' + fmt(s.cost) + '</td><td>' + (s.mv == null ? '-' : fmt(s.mv)) + '</td><td>' + (s.mv == null || !s.cost ? '-' : pct((s.mv / s.cost - 1) * 100)) + '</td><td><button class="jn-edit" data-plan="' + p.id + '">編輯</button><button class="jn-edit" data-plan-toggle="' + p.id + '">' + (p.active ? '暫停' : '恢復') + '</button><button class="jn-del" data-plan-del="' + p.id + '">刪除</button></td></tr>';
      }).join('') + '</tbody></table></div><p class="jn-hint">定期定額每到扣款日（遇假日順延到下一個交易日），收盤後自動記一筆買進：台股用「金額 ÷ 收盤價」取整數股、美股可買零碎股，手續費依你的設定（定期定額最低手續費預設 1 元）。</p>';
  }
  function planForm(p) {
    p = p || { market: 'TW', days: [6, 16, 26], start: today(), active: 1 };
    var f = open('<h3>' + (p.id ? '編輯定期定額' : '🔁 新增定期定額') + '</h3><div class="jn-seg mk"><button type="button" data-m="TW">🇹🇼 台股</button><button type="button" data-m="US">🇺🇸 美股</button></div>' +
      '<label>股票／ETF</label><div class="jn-sug"><input name="code" autocomplete="off" placeholder="例如 0050、00878、2330、VOO" value="' + esc(p.code ? p.code + (p.name ? ' ' + p.name : '') : '') + '"><ul hidden></ul></div>' +
      '<label class="amt-lab">每次扣款金額（台幣）</label><input name="amount" inputmode="decimal" value="' + (p.amount || '') + '" placeholder="例如 3000">' +
      '<label>每月扣款日（可複選，最多 6 個）</label><div class="jn-tags dd">' + Array.from({ length: 28 }, function (_, i) { var d = i + 1; return '<button type="button" data-d="' + d + '"' + (p.days.indexOf(d) >= 0 ? ' class="on"' : '') + '>' + d + '</button>'; }).join('') + '</div>' +
      '<label>從哪一天開始</label><input type="date" name="start" value="' + p.start + '"><p class="jn-hint">開始日期選過去的日子，會自動補上之前每一次的扣款紀錄。</p>' +
      '<div class="jn-btns"><button type="button" data-a="close">取消</button><button type="button" class="main" data-a="save-plan">儲存</button></div><div class="jn-err"></div>');
    var st = { market: p.market, code: p.code || '', name: p.name || '' };
    var ul = f.querySelector('.jn-sug ul');
    function seg() { f.querySelectorAll('.mk button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === st.market); }); f.querySelector('.amt-lab').textContent = st.market === 'US' ? '每次扣款金額（美元）' : '每次扣款金額（台幣）'; }
    f.querySelectorAll('.mk button').forEach(function (b) { b.onclick = function () { st.market = b.dataset.m; st.code = ''; st.name = ''; f.code.value = ''; seg(); }; });
    f.querySelectorAll('.dd button').forEach(function (b) { b.onclick = function () { b.classList.toggle('on'); }; });
    f.code.addEventListener('input', function () {
      var v = f.code.value.trim().toUpperCase(); st.code = ''; st.name = '';
      if (!v) { ul.hidden = true; return; }
      if (st.market === 'US') { ul.innerHTML = '<li data-c="' + esc(v.split(' ')[0]) + '">' + esc(v.split(' ')[0]) + '（美股代號）</li>'; ul.hidden = false; return; }
      var hits = Object.keys(names).filter(function (c) { return c.indexOf(v) === 0 || (names[c].n || '').toUpperCase().indexOf(v) >= 0; }).sort(function (a, b) { return (a.indexOf(v) === 0 ? 0 : 1) - (b.indexOf(v) === 0 ? 0 : 1) || a.length - b.length || (a < b ? -1 : 1); }).slice(0, 8);
      ul.innerHTML = hits.map(function (c) { return '<li data-c="' + c + '" data-n="' + esc(names[c].n) + '">' + c + ' ' + esc(names[c].n) + '</li>'; }).join('') || '<li class="no">找不到，請確認代號</li>';
      ul.hidden = false;
    });
    ul.addEventListener('click', function (ev) { var li = ev.target.closest('li[data-c]'); if (!li) return; st.code = li.dataset.c; st.name = li.dataset.n || ''; f.code.value = st.code + (st.name ? ' ' + st.name : ''); ul.hidden = true; });
    f.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') modal.hidden = true;
      if (a.dataset.a === 'save-plan') {
        if (!st.code) { var v = f.code.value.trim().split(' ')[0].toUpperCase(); if (st.market === 'US' && /^[A-Z.\-]{1,10}$/.test(v)) st.code = v; else if (names[v]) { st.code = v; st.name = names[v].n; } }
        var days = [].map.call(f.querySelectorAll('.dd button.on'), function (b) { return +b.dataset.d; });
        if (!st.code) return (f.querySelector('.jn-err').textContent = '請從清單選擇股票');
        if (!days.length) return (f.querySelector('.jn-err').textContent = '請選至少一個扣款日');
        save('/api/journal/plan', { id: p.id, market: st.market, code: st.code, name: st.name, amount: parseFloat(f.amount.value), days: days.slice(0, 6), start: f.start.value, active: !!p.active }, f);
      }
    });
    seg();
  }

  function cashForm(e) {
    e = e || { kind: 'deposit', date: today() };
    var f = open('<h3>' + (e.id ? '編輯' : '現金／股利') + '</h3><div class="jn-seg ck"><button type="button" data-k="deposit">入金</button><button type="button" data-k="withdraw">出金</button><button type="button" data-k="dividend">股利入帳</button></div>' +
      '<label>日期</label><input type="date" name="date" value="' + e.date + '"><label>金額（台幣）</label><input name="amount" inputmode="decimal" value="' + (e.amount || '') + '">' +
      '<div class="dv"><label>哪一檔的股利（可不填）</label><input name="code" placeholder="例如 2330" value="' + esc(e.code || '') + '"></div>' +
      '<label>備註</label><input name="note" maxlength="100" value="' + esc(e.note || '') + '">' +
      '<div class="jn-btns"><button type="button" data-a="close">取消</button><button type="button" class="main" data-a="save-cash">儲存</button></div><div class="jn-err"></div>');
    var kind = e.kind;
    function seg() { f.querySelectorAll('.ck button').forEach(function (b) { b.classList.toggle('on', b.dataset.k === kind); }); f.querySelector('.dv').hidden = kind !== 'dividend'; }
    f.querySelectorAll('.ck button').forEach(function (b) { b.onclick = function () { kind = b.dataset.k; seg(); }; });
    f.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') modal.hidden = true;
      if (a.dataset.a === 'save-cash') { var c = f.code.value.trim().toUpperCase(); save('/api/journal/entry', { id: e.id, kind: kind, date: f.date.value, amount: parseFloat(f.amount.value), code: kind === 'dividend' ? c : '', name: kind === 'dividend' && names[c] ? names[c].n : '', note: f.note.value }, f); }
    });
    seg();
  }

  function settingsForm() {
    var f = open('<h3>⚙️ 手續費設定</h3><p class="jn-hint">之後新增的交易會用新的設定自動計算；舊紀錄不會變。</p>' + settingsFields(S || DEF, false) + '<div class="jn-btns"><button type="button" data-a="close">取消</button><button type="button" class="main" data-a="save-settings">儲存</button></div><div class="jn-err"></div>');
    f.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') modal.hidden = true;
      if (a.dataset.a === 'save-settings') api('/api/journal/settings', readSettings(f)).then(function (j) { if (j.error) return (f.querySelector('.jn-err').textContent = j.error); S = j.settings; modal.hidden = true; render(); });
    });
  }

  function save(path, body, f) {
    if (busy) return; busy = true;
    var err = f.querySelector('.jn-err'); err.textContent = '儲存中…';
    api(path, body).then(function (j) {
      busy = false;
      if (j.error) return (err.textContent = j.error);
      modal.hidden = true; reload();
    }).catch(function () { busy = false; err.textContent = '連線失敗，請稍後再試'; });
  }

  // ---- 事件 ----
  root.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-a]');
    if (a && a.dataset.a === 'trade') tradeForm();
    if (a && a.dataset.a === 'holding') tradeForm(null, true);
    if (a && a.dataset.a === 'plans') planForm();
    var po = ev.target.closest('[data-pos]'); if (po) posModal(po.dataset.pos);
    var pe = ev.target.closest('[data-plan]'); if (pe) planForm(P.filter(function (x) { return x.id == pe.dataset.plan; })[0]);
    var pt = ev.target.closest('[data-plan-toggle]'); if (pt) { var pp = P.filter(function (x) { return x.id == pt.dataset.planToggle; })[0]; if (pp) api('/api/journal/plan', { id: pp.id, market: pp.market, code: pp.code, name: pp.name, amount: pp.amount, days: pp.days, start: pp.start, active: !pp.active }).then(reload); }
    var pd = ev.target.closest('[data-plan-del]'); if (pd && confirm('刪除這個定期定額？（按「確定」後會再問要不要一併刪除已產生的扣款紀錄）')) { var also = confirm('要一併刪除這個定期定額已產生的扣款紀錄嗎？確定＝刪除紀錄；取消＝保留紀錄（當成一般買進）'); api('/api/journal/plan/delete', { id: +pd.dataset.planDel, withEntries: also }).then(reload); }
    if (a && a.dataset.a === 'cash') cashForm();
    if (a && a.dataset.a === 'settings') settingsForm();
    if (a && (a.dataset.a === 'setup-default' || a.dataset.a === 'setup-save')) {
      var f = a.closest('form'), s = a.dataset.a === 'setup-save' ? readSettings(f) : DEF, cash = a.dataset.a === 'setup-save' ? parseFloat(f.cash.value) : 0;
      api('/api/journal/settings', s).then(function (j) {
        if (j.error) return (f.querySelector('.jn-err').textContent = j.error);
        S = j.settings;
        return (cash > 0 ? api('/api/journal/entry', { kind: 'deposit', date: today(), amount: cash, note: '起始現金' }) : Promise.resolve()).then(reload);
      });
    }
    var ed = ev.target.closest('.jn-edit[data-id]');
    if (ed) { var e = E.filter(function (x) { return x.id == ed.dataset.id; })[0]; if (e) (e.kind === 'buy' || e.kind === 'sell' || e.kind === 'holding' ? tradeForm : cashForm)(e); }
    var del = ev.target.closest('.jn-del[data-id]');
    if (del && confirm('確定要刪除這筆紀錄嗎？')) api('/api/journal/delete', { id: +del.dataset.id }).then(reload);
  });

  function quotes(list) {
    var need = list.filter(function (s) { return s && !Q[s]; });
    if (!need.length) return Promise.resolve();
    return fetch(API + '/api/quote?s=' + encodeURIComponent(need.join(','))).then(function (r) { return r.json(); }).then(function (j) { Object.keys(j.quotes || {}).forEach(function (k) { if (j.quotes[k]) Q[k] = j.quotes[k]; }); }).catch(function () {});
  }
  function loadNames() {
    if (Object.keys(names).length) return Promise.resolve();
    return Promise.all([
      fetch('/TW-STOCK-/stocks.json').then(function (r) { return r.json(); }).then(function (j) { Object.keys(j.list).forEach(function (c) { var s = j.list[c]; names[c] = { n: s.n, m: s.m, c: s.c }; }); }).catch(function () {}),
      fetch('/TW-STOCK-/etfs.json').then(function (r) { return r.json(); }).then(function (j) { Object.keys(j).forEach(function (c) { names[c] = { n: j[c][0], m: j[c][1], c: j[c][2] }; }); }).catch(function () {}),
    ]);
  }
  // ---- 你的今日總結（放在首頁「收盤總結」下面）----
  function tradeSyms() {
    var t = today(), out = [];
    E.forEach(function (e) { if ((e.kind === 'buy' || e.kind === 'sell') && e.date === t) out.push(sym(e)); });
    return out;
  }
  function dayCalc() {
    var t = today(), r = calc(), fxNow = r.fxNow || 0, pos = {};
    r.hold.forEach(function (p) { pos[p.market + ':' + p.code] = { market: p.market, code: p.code, name: p.name, qty: p.qty, tp: p.tp, sl: p.sl, flow: 0, dq: 0 }; });
    var depToday = 0;
    E.forEach(function (e) {
      if (e.date !== t) return;
      if (e.kind === 'deposit') depToday += e.amount;
      if (e.kind === 'withdraw') depToday -= e.amount;
      if (e.kind !== 'buy' && e.kind !== 'sell') return;
      var k = e.market + ':' + e.code, p = pos[k] || (pos[k] = { market: e.market, code: e.code, name: e.name, qty: 0, flow: 0, dq: 0 });
      var amt = e.price * e.qty;
      if (e.kind === 'buy') { p.flow -= amt + (e.fee || 0); p.dq += e.qty; } else { p.flow += amt - (e.fee || 0) - (e.tax || 0); p.dq -= e.qty; }
    });
    var list = [], pnl = 0, miss = 0;
    Object.keys(pos).forEach(function (k) {
      var p = pos[k], q = Q[sym(p)];
      if (!q || q.price == null || q.prev == null) { miss++; return; }
      var fx = p.market === 'US' ? fxNow : 1; if (!fx) { miss++; return; }
      var q0 = p.qty - p.dq; // 昨天收盤時的股數
      var v = (q.price * p.qty - q.prev * q0 + p.flow) * fx;
      pnl += v;
      list.push({ code: p.code, name: p.name || (names[p.code] && names[p.code].n) || p.code, pnl: v, chg: (q.price / q.prev - 1) * 100, held: p.qty > 0, price: q.price, tp: p.tp, sl: p.sl });
    });
    if (!list.length) return;
    if (!list.length) return null;
    var base = r.total - pnl - depToday;
    return { t: t, r: r, list: list, pnl: pnl, miss: miss, my: base > 0 ? pnl / base * 100 : null };
  }
  function daySum() {
    var old = document.getElementById('jn-today'); if (old) old.remove();
    var ix = Q['^TWII']; if (!ix || !ix.price || !ix.prev) return;
    var dc = dayCalc(); if (!dc) return;
    var t = dc.t, r = dc.r, list = dc.list, pnl = dc.pnl, miss = dc.miss, my = dc.my, mk = (ix.price / ix.prev - 1) * 100;
    var d = new Date((ix.time || 0) * 1000 + 8 * 3600000).toISOString().slice(5, 10).replace('-', '/');
    var held = list.filter(function (x) { return x.held; }).sort(function (a, b) { return b.chg - a.chg; });
    // 靠北版：同一天抽到的句子固定，不會一重整就換
    var seed = 0; (d + r.hold.length).split('').forEach(function (c) { seed = (seed * 31 + c.charCodeAt(0)) % 9973; });
    function pick(a) { seed = (seed * 7 + 13) % 9973; return a[seed % a.length]; }
    function P(s, v) { return s.split('{x}').join(v); }
    var bowls = Math.round(Math.abs(pnl) / 180), lines = [];
    var amt = (pnl >= 0 ? pn(pnl) : '<span class="dn">' + fmt(-pnl) + '</span>') + ' 元' + (my == null ? '' : '（' + pct(my) + '）');
    if (pnl >= 0) lines.push(pick((bowls >= 1 ? ['今天賺 {x}，換算大概 ' + bowls + ' 碗牛肉麵 🍜，不要一次吃完'] : []).concat(['今天進帳 {x}，先別急著辭職，這只是一天', '今天賺了 {x}，可以理直氣壯點大杯珍奶了 🧋'])).split('{x}').join(amt) + '，大盤 ' + pct(mk));
    else lines.push(pick((bowls >= 1 ? ['今天賠 {x}，等於 ' + bowls + ' 碗牛肉麵直接倒進水溝 🍜'] : []).concat(['今天噴掉 {x}，錢沒有不見，只是變成別人的', '今天虧 {x}，晚餐建議改吃泡麵回本 🍜'])).split('{x}').join(amt) + '，大盤 ' + pct(mk));
    if (my != null) {
      var diff = my - mk, x = Math.abs(diff).toFixed(2);
      if (mk > 0.3 && my < 0) lines.push(pick(['大盤漲成這樣你還能賠，這也是一種天賦 🫠', '全市場都在吃肉，你在旁邊啃骨頭 🦴']));
      else if (mk < -0.3 && my > 0) lines.push(pick(['大盤在跌你在漲，逆天而行，今天你最大 🫡', '別人在哭你在笑，記得低調，不然會被揍']));
      lines.push(P(diff >= 3 ? pick(['贏大盤 {x} 個百分點，你是不是偷看明天的報紙 📰', '贏大盤 {x} 個百分點，巴菲特看了都想跟單', '贏大盤 {x} 個百分點，今天的你是股神，明天的你還不知道']) :
        diff >= 1 ? pick(['贏大盤 {x} 個百分點，今天可以多加一顆滷蛋 🥚', '贏大盤 {x} 個百分點，選股功力是有在練的', '贏大盤 {x} 個百分點，去跟同事炫耀吧（記得低調）']) :
        diff >= 0 ? pick(['小贏大盤 {x} 個百分點，贏是贏了，但贏得很像沒贏', '比大盤多 {x} 個百分點，大概多一杯珍奶的程度 🧋']) :
        diff > -1 ? pick(['輸大盤 {x} 個百分點，差一點點跟差很多，一樣都叫輸', '跟大盤差不多，恭喜你成為人肉 0050']) :
        diff > -3 ? pick(['輸大盤 {x} 個百分點，買 0050 躺著都比你強 🛌', '輸大盤 {x} 個百分點，你的選股能力跟擲骰子有得拚 🎲']) :
        pick(['輸大盤 {x} 個百分點，建議今晚把看盤軟體刪掉冷靜一下', '輸大盤 {x} 個百分點，猴子射飛鏢選的都看不下去 🐒']), x));
    }
    if (held.length > 1) {
      var b = held[0], w = held[held.length - 1];
      if (w.chg >= 0) lines.push('最弱的 ' + esc(w.name) + ' 都還有 ' + pct(w.chg) + '，今天全員及格，可以發獎狀了 🏅');
      else if (b.chg < 0) lines.push('最強的 ' + esc(b.name) + ' 也是 ' + pct(b.chg) + '，今天全軍覆沒 🪦');
      else lines.push('今日 MVP：' + esc(b.name) + ' ' + pct(b.chg) + '　今日戰犯：' + esc(w.name) + ' ' + pct(w.chg) + '（拖出去）');
    } else if (held.length === 1) lines.push('全部身家押 ' + esc(held[0].name) + '，今天 ' + pct(held[0].chg) + (held[0].chg >= 0 ? '，梭哈的人運氣都特別好？' : '，雞蛋放同一個籃子的下場 🥚'));
    held.forEach(function (x) {
      if (x.tp && x.price >= x.tp) lines.push('🎯 ' + esc(x.name) + ' 到停利價 ' + fmt(x.tp, 2) + ' 了，該跑就跑，貪心會被懲罰');
      else if (x.sl && x.price <= x.sl) lines.push('🛑 ' + esc(x.name) + ' 跌破停損價 ' + fmt(x.sl, 2) + '，說好的紀律呢？還在等奇蹟？');
    });
    var traded = list.filter(function (x) { return !x.held; });
    if (traded.length) lines.push('今天出清 ' + traded.map(function (x) { return esc(x.name); }).join('、') + '，希望不是賣在起漲點 🙏');
    if (miss) lines.push('<span class="jn-hint">有 ' + miss + ' 檔暫時抓不到報價，沒算進去</span>');
    var el = document.createElement('div');
    el.className = 'roast jn-today'; el.id = 'jn-today';
    el.innerHTML = '<div class="roast-title">🎤 你的收盤總結 <span class="tag">' + d + '・只有你看得到</span></div><ul>' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
    var at = document.querySelector('.roast:not(.jn-today)');
    if (at) at.after(el); else root.prepend(el);
  }
  function reload() {
    return api('/api/journal').then(function (j) {
      if (j.error) { root.innerHTML = '<p class="empty">' + esc(j.error) + '</p>'; return; }
      S = j.settings; if (window.__feeCalcPrefill) window.__feeCalcPrefill(S); P = j.plans || []; planErr = j.planErr || null; E = (j.entries || []).map(function (e) { if (e.kind === 'buy' && e.date === '2000-01-01') e.kind = 'holding'; return e; }); // 原有持股
      var r = calc(), syms = r.hold.map(sym).concat(tradeSyms(), ['^TWII']); if (E.some(function (p) { return p.market === 'US'; })) syms.push('USDTWD=X');
      Q = {}; render();
      return quotes(syms).then(function () { render(); daySum(); });
    });
  }
  function start() {
    if (loaded || !token()) return;
    loaded = true; loadNames().then(reload);
  }
  // 打開這一頁時才載入
  document.addEventListener('click', function (e) { var t = e.target.closest('.ptab[data-p="journal"],.gtab[data-g="journal"],.btab[data-g="journal"]'); if (t) setTimeout(loaded ? render : start, 0); });
  if (location.hash === '#journal') setTimeout(start, 300);
  // 盤中每分鐘更新報價：價格有變才重畫（日誌頁、首頁的你的收盤總結）
  function refresh() {
    if (!loaded || document.hidden || !E.length) return;
    var r = calc(), syms = r.hold.map(sym).concat(tradeSyms(), ['^TWII']);
    var before = JSON.stringify(syms.map(function (s) { return Q[s] && Q[s].price; }));
    syms.forEach(function (s) { delete Q[s]; });
    quotes(syms).then(function () {
      if (JSON.stringify(syms.map(function (s) { return Q[s] && Q[s].price; })) === before) return;
      var pg = root.closest('.page');
      if (pg && !pg.hidden) render();
      daySum();
    });
  }
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  window.__journalStart = function () { loaded = false; start(); };
  // 會員一進網站就先載入，首頁才能顯示「你的今日總結」
  if (token()) setTimeout(start, 600);
}

// ---- 置頂指數列：網頁開著時每分鐘自己更新（加權用證交所即時，其他用 Yahoo）----
function liveTopbar(API) {
  var MAP = { '加權指數': '^TWII', '日經 225': '^N225', '韓國 KOSPI': '^KS11', '費城半導體': '^SOX' };
  function fmt(v) { return v.toLocaleString(undefined, { maximumFractionDigits: 2 }); }
  function tick() {
    if (document.hidden) return;
    var items = [].slice.call(document.querySelectorAll('.topbar .tb-item')).filter(function (el) { var n = el.querySelector('.tb-name'); return n && MAP[n.textContent.trim()]; });
    if (!items.length) return;
    fetch(API + '/api/quote?s=' + encodeURIComponent(items.map(function (el) { return MAP[el.querySelector('.tb-name').textContent.trim()]; }).join(','))).then(function (r) { return r.json(); }).then(function (j) {
      items.forEach(function (el) {
        var q = (j.quotes || {})[MAP[el.querySelector('.tb-name').textContent.trim()]];
        if (!q || !q.price || !q.prev || !q.time) return;
        if (!el.dataset.t) { // 頁面上原本那筆的時間（例如「10/6 09:18」），比它舊的報價不要蓋過去
          var nt = (el.querySelector('.tb-note') || {}).textContent || '', mm = nt.match(/(\d+)\/(\d+) (\d+):(\d+)/);
          el.dataset.t = mm ? Math.round((Date.UTC(new Date().getUTCFullYear(), +mm[1] - 1, +mm[2], +mm[3], +mm[4]) - 8 * 3600000) / 1000) : 0;
        }
        if (+el.dataset.t > q.time) return;
        el.dataset.t = q.time;
        var chg = q.price - q.prev, pct = (q.price / q.prev - 1) * 100, d = new Date(q.time * 1000 + 8 * 3600000);
        el.querySelector('.tb-val').textContent = fmt(q.price);
        var c = el.querySelector('.tb-chg'); c.className = 'tb-chg ' + (chg >= 0 ? 'up' : 'dn'); c.textContent = (chg >= 0 ? '▲' : '▼') + ' ' + fmt(Math.abs(chg)) + '（' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%）';
        var n = el.querySelector('.tb-note'); if (n) n.textContent = (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
      });
    }).catch(function () {});
  }
  setTimeout(tick, 1500);
  setInterval(tick, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
}

// ---- 手續費試算（不用登入）----
function renderFeeCalc() {
  return `<h2>🧮 手續費試算 <span class="count">台股・美股，算出成本、損益和「損益兩平價」</span></h2>
<form class="fc jn-form" onsubmit="return false" style="max-width:640px;padding:0;background:none">
  <div class="jn-seg fc-mk"><button type="button" data-m="TW" class="on">🇹🇼 台股</button><button type="button" data-m="US">🇺🇸 美股</button></div>
  <div class="fc-tw"><label>類型</label><div class="jn-seg fc-ty"><button type="button" data-t="stock" class="on">一般股票（稅 0.3%）</button><button type="button" data-t="etf">ETF（稅 0.1%）</button><button type="button" data-t="day">當沖（稅 0.15%）</button></div></div>
  <div class="jn-row"><div><label>買進價</label><input name="buy" inputmode="decimal" placeholder="例如 100"></div><div><label>賣出價（可不填）</label><input name="sell" inputmode="decimal" placeholder="例如 110"></div></div>
  <div class="jn-row"><div><label class="fc-qlab">數量</label><input name="qty" inputmode="decimal" value="1"></div><div class="fc-tw"><label>單位</label><div class="jn-seg fc-unit"><button type="button" data-u="1000" class="on">張</button><button type="button" data-u="1">股（零股）</button></div></div></div>
  <div class="fc-tw jn-row"><div><label>手續費折扣（折）</label><input name="disc" inputmode="decimal" placeholder="不打折請留空，例如 2.8"></div><div><label>最低手續費（整股／零股）</label><div class="jn-row" style="gap:6px"><input name="min" inputmode="decimal" value="20"><input name="oddMin" inputmode="decimal" value="1"></div></div></div>
  <div class="fc-us jn-row" hidden><div><label>手續費率（%）</label><input name="usRate" inputmode="decimal" value="0.1"></div><div><label>最低手續費（美元）</label><input name="usMin" inputmode="decimal" value="0"></div></div>
  <div class="jn-row"><div><label>目標報酬（%，可不填）</label><input name="target" inputmode="decimal" placeholder="例如 10"></div><div></div></div>
</form>
<div class="fc-out"></div>
<p class="jn-hint">台股手續費＝成交金額 × 0.1425% × 折扣（不足最低手續費以最低計，無條件捨去）；證交稅只有賣出時收。損益兩平價已依台股升降單位（跳動點）無條件進位。實際金額以券商為準。</p>`;
}

function feeCalcClient() {
  // 其他地方的「手續費試算」按鈕：切到這一頁
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (!g) return; var t = document.querySelector('.ptab[data-p="' + g.dataset.goto + '"]'); if (t) { t.click(); scrollTo(0, 0); } });
  var f = document.querySelector('form.fc'); if (!f) return;
  var out = document.querySelector('.fc-out');
  var st = { m: 'TW', t: 'stock', u: 1000 };
  var LSK = 'shoupan_feecalc';
  try { var sv = JSON.parse(localStorage.getItem(LSK) || '{}'); ['disc', 'min', 'oddMin', 'usRate', 'usMin'].forEach(function (k) { if (sv[k] != null && sv[k] !== '') f[k].value = sv[k]; }); } catch (e) {}
  // 登入且有填股票日誌設定：帶入
  window.__feeCalcPrefill = function (s) {
    if (!s) return;
    try { if (localStorage.getItem(LSK)) return; } catch (e) {}
    if (s.feeDiscount && s.feeDiscount !== 10) f.disc.value = s.feeDiscount;
    f.min.value = s.minFee; f.oddMin.value = s.oddMinFee; f.usRate.value = s.usFeeRate; f.usMin.value = s.usMinFee; calc();
  };
  function num(k) { var v = parseFloat(f[k].value); return isFinite(v) ? v : null; }
  function fmt(v, d) { return v == null || !isFinite(v) ? '-' : Number(v).toLocaleString('zh-TW', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function pn(v, d) { return '<span class="' + (v >= 0 ? 'up' : 'dn') + '">' + (v >= 0 ? '+' : '') + fmt(v, d) + '</span>'; }
  // 台股升降單位
  function tick(p, etf) {
    if (etf) return p < 50 ? 0.01 : 0.05;
    return p < 10 ? 0.01 : p < 50 ? 0.05 : p < 100 ? 0.1 : p < 500 ? 0.5 : p < 1000 ? 1 : 5;
  }
  function feeTW(amt, odd) { var d = num('disc') || 10; return amt > 0 ? Math.max(odd ? num('oddMin') || 0 : num('min') || 0, Math.floor(amt * 0.001425 * d / 10)) : 0; }
  function feeUS(amt) { return amt > 0 ? Math.max(num('usMin') || 0, Math.round(amt * (num('usRate') || 0)) / 100) : 0; }
  function taxRate() { return st.t === 'etf' ? 0.001 : st.t === 'day' ? 0.0015 : 0.003; }
  function sellNet(s, q) {
    if (st.m === 'US') return s * q - feeUS(s * q);
    var amt = s * q; return amt - feeTW(amt, q % 1000 !== 0) - Math.floor(amt * taxRate());
  }
  // 找到賣出淨額 >= 目標的最低價（依跳動點）
  function solve(goal, q) {
    var r = st.m === 'US' ? 1 - (num('usRate') || 0) / 100 : 1 - 0.001425 * (num('disc') || 10) / 10 - taxRate();
    var s = goal / (q * r);
    if (st.m === 'US') { s = Math.ceil(s * 100) / 100; while (sellNet(s, q) < goal) s = Math.round((s + 0.01) * 100) / 100; return s; }
    var t = tick(s, st.t === 'etf'); s = Math.ceil(s / t - 1e-9) * t;
    for (var i = 0; i < 2000 && sellNet(s, q) < goal; i++) { t = tick(s, st.t === 'etf'); s = Math.round((s + t) * 100) / 100; }
    return Math.round(s * 100) / 100;
  }
  function calc() {
    try { var o = {}; ['disc', 'min', 'oddMin', 'usRate', 'usMin'].forEach(function (k) { o[k] = f[k].value; }); localStorage.setItem(LSK, JSON.stringify(o)); } catch (e) {}
    var b = num('buy'), s = num('sell'), q = (num('qty') || 0) * (st.m === 'US' ? 1 : st.u), tg = num('target');
    if (!b || !q) { out.innerHTML = '<p class="empty">輸入買進價和數量就會自動計算</p>'; return; }
    var cur = st.m === 'US' ? 'US$' : '$', d = st.m === 'US' ? 2 : 0;
    var bAmt = b * q, bFee = st.m === 'US' ? feeUS(bAmt) : feeTW(bAmt, q % 1000 !== 0), cost = bAmt + bFee;
    var be = solve(cost, q);
    var h = '<div class="jn-cards"><div><b>' + cur + fmt(cost, d) + '</b><span>買進總成本（含手續費 ' + cur + fmt(bFee, d) + '）</span></div>' +
      '<div><b>' + cur + fmt(be, 2) + '</b><span>損益兩平賣價</span><small>漲 ' + ((be / b - 1) * 100).toFixed(2) + '% 才回本</small></div>';
    if (tg != null) { var tp = solve(cost * (1 + tg / 100), q); h += '<div><b>' + cur + fmt(tp, 2) + '</b><span>要賺 ' + tg + '% 要賣到</span><small>股價漲 ' + ((tp / b - 1) * 100).toFixed(2) + '%</small></div>'; }
    if (s) {
      var sAmt = s * q, sFee = st.m === 'US' ? feeUS(sAmt) : feeTW(sAmt, q % 1000 !== 0), tax = st.m === 'US' ? 0 : Math.floor(sAmt * taxRate());
      var net = sAmt - sFee - tax, pnl = net - cost;
      h += '<div><b>' + cur + fmt(net, d) + '</b><span>賣出實收（手續費 ' + cur + fmt(sFee, d) + (st.m === 'US' ? '' : '、證交稅 $' + fmt(tax)) + '）</span></div>' +
        '<div><b>' + pn(pnl, d) + '</b><span>淨損益</span><small>報酬率 ' + pn(pnl / cost * 100, 2) + '%</small></div>' +
        '<div><b>' + cur + fmt(bFee + sFee + tax, d) + '</b><span>總交易成本（買賣手續費＋稅）</span></div>';
    }
    out.innerHTML = h + '</div>';
  }
  function seg(sel, key, attr) {
    f.querySelectorAll(sel + ' button').forEach(function (bt) {
      bt.onclick = function () {
        st[key] = attr === 'u' ? +bt.dataset[attr] : bt.dataset[attr];
        f.querySelectorAll(sel + ' button').forEach(function (x) { x.classList.toggle('on', x === bt); });
        if (key === 'm') { f.querySelectorAll('.fc-tw').forEach(function (x) { x.hidden = st.m !== 'TW'; }); f.querySelector('.fc-us').hidden = st.m !== 'US'; f.querySelector('.fc-qlab').textContent = st.m === 'US' ? '股數' : '數量'; }
        calc();
      };
    });
  }
  seg('.fc-mk', 'm', 'm'); seg('.fc-ty', 't', 't'); seg('.fc-unit', 'u', 'u');
  f.addEventListener('input', calc);
  calc();
}

function journalScript(api) {
  return `<script>(${journalClient.toString()})(${JSON.stringify(api)});(${feeCalcClient.toString()})();(${liveTopbar.toString()})(${JSON.stringify(api)});</script>`;
}

module.exports = { renderJournal, renderFeeCalc, JOURNAL_CSS, journalScript };
