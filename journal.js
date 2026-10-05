// 股票日誌（會員專用）：記帳、現金、庫存、已實現損益、圖表
// 資料存在 Cloudflare（每人只看得到自己的），損益在瀏覽器端計算

function renderJournal() {
  return `<div class="lock-card pf-lock"><div class="lock-ic big">📒</div><h3>登入 Google 才能使用股票日誌</h3><p>記下每天買賣的台股、美股，自動算手續費、交易稅、現金、庫存與損益，還有圖表追蹤自己的績效。資料只有你自己看得到。</p><div class="gsi-lock"></div></div>
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
.jn-quick{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px}.jn-quick button{font:inherit;font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.jn-quick .jn-pct{font-size:13px}.st2 h3 .jn-hint{font-weight:400;font-size:13px}.dd button{min-width:40px}`;

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

  // ---- 畫面 ----
  function render() {
    if (!S) return renderSetup();
    var r = calc();
    var rz = r.realized.reduce(function (a, x) { return a + x.pnl; }, 0), uz = r.hold.reduce(function (a, p) { return a + (p.upnl || 0); }, 0);
    var trades = r.realized.filter(function (x) { return !x.div; }), wins = trades.filter(function (x) { return x.pnl > 0; });
    var ret = r.invested > 0 ? (r.total - r.invested) / r.invested * 100 : null;
    var h = '<div class="jn-cards"><div><b>' + money(r.total) + '</b><span>總資產（現金＋股票）</span>' + (ret == null ? '' : '<small>總報酬 ' + pct(ret) + '</small>') + '</div>' +
      '<div><b>' + money(r.cash) + '</b><span>現金</span></div><div><b>' + money(r.mv) + '</b><span>股票市值</span></div>' +
      '<div><b>' + pn(uz) + '</b><span>未實現損益</span></div><div><b>' + pn(rz) + '</b><span>已實現損益（含股利）</span></div>' +
      '<div><b>' + (trades.length ? Math.round(wins.length / trades.length * 100) + '%' : '-') + '</b><span>勝率（' + trades.length + ' 筆賣出）</span></div></div>';
    if (r.cash < 0) h += '<p class="jn-hint">⚠️ 現金是負的：可能還沒記「入金」，按「💵 現金」補上起始資金或入金。</p>';
    h += '<div class="jn-acts"><button type="button" class="main" data-a="trade">＋ 記一筆交易</button><button type="button" data-a="holding">📦 原有持股</button><button type="button" data-a="plans">🔁 定期定額</button><button type="button" data-a="cash">💵 現金／股利</button><button type="button" data-a="settings">⚙️ 手續費設定</button></div>';
    // 庫存
    // 到價提醒
    var hits = r.hold.filter(function (p) { return p.price != null && ((p.tp && p.price >= p.tp) || (p.sl && p.price <= p.sl)); });
    if (hits.length) h += '<div class="vote-saved" style="margin:8px 0">' + hits.map(function (p) { return p.tp && p.price >= p.tp ? '🎯 <b>' + esc(p.name || p.code) + '</b> 已到預計停利價 ' + fmt(p.tp, 2) + '（現價 ' + fmt(p.price, 2) + '）' : '🛑 <b>' + esc(p.name || p.code) + '</b> 已跌破預計停損價 ' + fmt(p.sl, 2) + '（現價 ' + fmt(p.price, 2) + '）'; }).join('<br>') + '</div>';
    h += '<h2>目前庫存 <span class="count">' + r.hold.length + ' 檔' + (r.fxNow ? '・美元匯率 ' + r.fxNow.toFixed(2) : '') + '</span></h2>';
    h += r.hold.length ? '<div class="scroll"><table class="compact"><thead><tr><th>股票</th><th>股數</th><th>均價</th><th>現價</th><th>市值（台幣）</th><th>未實現</th><th>報酬率</th><th>停利／停損</th><th>比重</th></tr></thead><tbody>' +
      r.hold.sort(function (a, b) { return (b.mv || 0) - (a.mv || 0); }).map(function (p) {
        return '<tr><td class="nm">' + esc(p.code) + ' ' + esc(p.name || '') + (p.market === 'US' ? '<span class="tag">美</span>' : '') + '</td><td>' + fmt(p.qty) + '</td><td>' + fmt(p.avg, 2) + '</td><td>' + (p.price == null ? '-' : fmt(p.price, 2)) + '</td><td>' + (p.mv == null ? '-' : fmt(p.mv)) + '</td><td>' + (p.upnl == null ? '-' : pn(p.upnl)) + '</td><td>' + pct(p.upct) + '</td><td class="jn-note">' + tpsl(p) + '</td><td>' + (r.total > 0 && p.mv ? (p.mv / r.total * 100).toFixed(1) + '%' : '-') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="empty">還沒有庫存，按「＋ 記一筆交易」開始</p>';
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
      return '<tr><td>' + (e.kind === 'holding' ? '原有' : e.date.slice(5).replace('-', '/')) + '</td><td><span class="chip ' + (e.kind === 'holding' ? 'mid' : e.kind === 'buy' || e.kind === 'deposit' || e.kind === 'dividend' ? 'good' : 'bad') + '">' + kindTxt[e.kind] + (e.daytrade ? '・當沖' : '') + '</span></td><td class="nm">' + what + '</td><td>' + detail + '</td><td>' + cost + '</td><td class="jn-note">' + (e.tags && e.tags.length ? e.tags.map(function (t) { return '<span class="chip mid">' + esc(t) + '</span>'; }).join('') + ' ' : '') + esc(e.note || '') + '</td><td><button class="jn-edit" data-id="' + e.id + '">編輯</button><button class="jn-del" data-id="' + e.id + '">刪除</button></td></tr>';
    }).join('');
    h += '<h2>交易紀錄 <span class="count">' + E.length + ' 筆</span></h2>' + (rows ? '<div class="scroll"><table class="compact"><thead><tr><th>日期</th><th>種類</th><th>股票</th><th>價格 × 數量／金額</th><th>手續費＋稅</th><th>理由／心得</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="empty">還沒有紀錄</p>');
    h += '<p class="jn-hint">損益用「平均成本法」計算，含手續費與交易稅；美股以交易當時匯率換算成台幣成本，市值用目前匯率。現價每分鐘更新，台股盤後以收盤價為準。資料只有你自己看得到。</p>';
    root.innerHTML = h;
    drawCharts(r, ++gen);
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

  function tradeForm(e, holdingMode) {
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
      '<label>預計停利價</label><input name="tp" inputmode="decimal" value="' + (e.tp || '') + '"><div class="jn-quick" data-for="tp"><button type="button" data-p="10">+10%</button><button type="button" data-p="20">+20%</button><button type="button" data-p="30">+30%</button><span class="jn-pct"></span></div>' +
      '<label>預計停損價</label><input name="sl" inputmode="decimal" value="' + (e.sl || '') + '"><div class="jn-quick" data-for="sl"><button type="button" data-p="-5">-5%</button><button type="button" data-p="-8">-8%</button><button type="button" data-p="-10">-10%</button><span class="jn-pct"></span></div>' +
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
  function reload() {
    return api('/api/journal').then(function (j) {
      if (j.error) { root.innerHTML = '<p class="empty">' + esc(j.error) + '</p>'; return; }
      S = j.settings; P = j.plans || []; planErr = j.planErr || null; E = (j.entries || []).map(function (e) { if (e.kind === 'buy' && e.date === '2000-01-01') e.kind = 'holding'; return e; }); // 原有持股
      var r = calc(), syms = r.hold.map(sym); if (r.hold.some(function (p) { return p.market === 'US'; })) syms.push('USDTWD=X');
      Q = {}; render();
      return quotes(syms).then(render);
    });
  }
  function start() {
    if (loaded || !token()) return;
    loaded = true; loadNames().then(reload);
  }
  // 打開這一頁時才載入
  document.addEventListener('click', function (e) { var t = e.target.closest('.ptab[data-p="journal"],.gtab[data-g="journal"],.btab[data-g="journal"]'); if (t) setTimeout(start, 0); });
  if (location.hash === '#journal') setTimeout(start, 300);
  window.__journalStart = function () { loaded = false; start(); };
}

function journalScript(api) {
  return `<script>(${journalClient.toString()})(${JSON.stringify(api)});</script>`;
}

module.exports = { renderJournal, JOURNAL_CSS, journalScript };
