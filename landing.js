// 登入前的網站介紹頁，以及每一頁的「分享圖卡」（Threads 等平台不能貼連結時，圖上有 QR Code）

const SITE = 'https://nicklin1020104-beep.github.io/TW-STOCK-/';

const FEATURES = [
  ['🎯', '選股雷達', '全市場 1,900 多檔每天自動掃描：一K站三線、潛伏股、三率三升、杯柄型態（VCP），附一週追蹤勝率。'],
  ['🔥', '族群趨勢', '30 多個細分族群誰在發動、誰連漲、資金往哪裡去，點開就看到成員。'],
  ['🐳', '主力籌碼', '主力鎖碼、三大法人、千張大戶，還有主動式 ETF 每天加碼減碼了什麼。'],
  ['🌏', '總經一頁看完', '台指期夜盤、日經、費半即時；CPI、PCE、PMI、利率，附市場預估。'],
  ['⭐', '自選股＋估價', '依族群自動分組、雲端同步；EPS × 本益比算合理價，附外資預估。'],
  ['🗳️', '收盤預測比賽', '猜明天漲跌和最強族群，13:35 收盤準時開獎，衝上每週排行榜。'],
  ['🔔', '開盤／收盤推播', '08:55 開盤提醒、13:35 開獎、盤後報告出爐，像 App 一樣跳通知。'],
  ['🧮', '手續費試算', '輸入買賣價就算出手續費、交易稅和「損益兩平價」，不用登入。'],
  ['📤', '一鍵分享圖卡', '每一頁都能做成附 QR Code 的圖卡，直接分享到 Threads、IG、LINE。'],
];
const JOURNAL = [
  ['手續費、交易稅自動算', '照你的券商折扣，ETF、當沖、美股都分得清楚'],
  ['台股＋美股一起記', '美股自動換算台幣，現金、庫存、損益一次看'],
  ['定期定額自動記帳', '設定一次，每個扣款日收盤後自動記，遇假日順延'],
  ['停利停損到價提醒', '買進時先設好出場點，到價庫存直接提醒你'],
  ['資產走勢 vs 大盤', '每天的總資產折線圖、最大回撤，看你有沒有贏大盤'],
];
const STEPS = [
  ['用 Google 免費註冊', '一鍵註冊、取一個暱稱，10 秒完成'],
  ['每天收盤後打開看', '14:00 前整理好盤勢，17:00 補上法人籌碼'],
  ['記帳、投票、收推播', '股票日誌記下每筆買賣，猜明天漲跌和大家比準度'],
];
const TRUST = [
  ['📊', '公開資料來源', '證交所、櫃買中心、期交所、集保、公開資訊觀測站與各投信公告，由程式自動整理'],
  ['🔒', '保護你的隱私', '只取得 Google 名字、信箱與大頭照；記帳資料只有你自己看得到，絕不出售'],
  ['⚖️', '僅供參考', '所有內容僅供研究交流，不構成任何投資建議，投資前請獨立判斷、自負風險'],
];
const FAQ = [
  ['飆股情報局要錢嗎？', '完全免費。訪客也能看所有選股與盤後資料；用 Google 帳號登入後，還可以記帳、投票、收推播、自選股雲端同步。'],
  ['一定要登入嗎？', '不用。點「以訪客身分進入」就能直接看。只有股票日誌、投票比賽、自選股、個人檔案、推播通知需要 Google 登入。'],
  ['股票日誌能做什麼？', '記錄台股和美股的買賣，自動算手續費和交易稅、現金、庫存、已實現和未實現損益；可以設定停利停損、定期定額自動記帳，還有資產走勢圖和大盤比較。資料只有你自己看得到。'],
  ['資料多久更新一次？', '每個交易日收盤後約 14:00 前更新，15:10 補齊、17:00 補上三大法人；頂部報價盤中每 30 分鐘更新。'],
  ['選股的條件是什麼？', '每個名單頁面上方都寫清楚條件（一K站三線、三率三升、杯柄型態等），並附回測勝率，透明公開。'],
  ['可以在手機上用嗎？', '可以。用手機瀏覽器打開後選「加入主畫面」，就像 App 一樣，還能收推播通知。'],
  ['這是投資建議嗎？', '不是。本站內容皆由程式依公開資料自動整理，僅供參考，不構成任何投資建議或買賣推薦。'],
];

// 首頁右邊的動態小儀表板（純 HTML／CSS 動畫，循環播放）
function heroDemo() {
  return `<div class="lp-demo" aria-hidden="true">
  <div class="lp-demo-top"><span>📒 股票日誌</span><span class="lp-live">● 即時</span></div>
  <div class="lp-demo-lab">總資產</div>
  <div class="lp-demo-num"><span class="lp-roll" data-to="2486320">$2,486,320</span></div>
  <div class="lp-demo-sub up">未實現 +186,420（+8.1%）</div>
  <svg class="lp-demo-chart" viewBox="0 0 300 110" preserveAspectRatio="none">
    <line x1="0" y1="22" x2="300" y2="22" class="tp"/><text x="296" y="16" text-anchor="end" class="tpt">停利</text>
    <polyline class="ln" points="0,92 18,86 34,90 52,76 70,80 88,70 104,74 122,62 140,66 158,55 176,58 194,46 212,50 230,40 248,36 266,30 284,24 300,20"/>
  </svg>
  <div class="lp-demo-rows">
    <div><span>台積電</span><b class="up">+7.25%</b></div>
    <div><span>元大台灣50</span><b class="up">+12.40%</b></div>
    <div><span>Apple</span><b class="dn">-1.86%</b></div>
  </div>
  <div class="lp-toast">🎯 台積電 已到預計停利價</div>
</div>`;
}

function renderGate() {
  const logo = '/TW-STOCK-/icon-192.png?v=2';
  const ticker = ['一K站三線', '杯柄型態 VCP', '三率三升', '潛伏股', '族群趨勢', '主力鎖碼', '三大法人', '千張大戶', '主動ETF加減碼', '總經數據', '股票日誌', '定期定額', '停利停損', '資產走勢', '收盤開獎', '推播通知', '手續費試算'];
  return `<div id="gate">
<nav class="lp-nav"><div class="lp-wrap lp-navin">
  <a class="lp-brand" href="#gate-top"><img src="${logo}" alt="">飆股情報局</a>
  <div class="lp-links"><a href="#gate-journal">股票日誌</a><a href="#gate-feat">功能特色</a><a href="#gate-how">如何使用</a><a href="#gate-faq">常見問題</a></div>
  <div class="lp-acts"><a class="lp-btn ghost lp-guest" href="#">訪客進入</a><a class="lp-btn solid" href="#gate-join">登入／註冊</a></div>
</div></nav>
<section class="lp-hero" id="gate-top"><div class="lp-wrap lp-herogrid">
  <div class="lp-herotext">
    <a class="lp-badge" href="#gate-journal">🆕 股票日誌正式上線 →</a>
    <h1>台股收盤後的<br><span class="lp-rot"><span>選股情報</span><span>股票記帳</span><span>族群趨勢</span><span>主力籌碼</span></span></h1>
    <p class="lp-lead">每天自動掃描全市場 1,900 多檔股票，整理成選股名單、族群趨勢與籌碼數據；再用股票日誌記下你的每一筆買賣，自動算損益。</p>
    <div class="lp-heroacts"><a class="lp-btn solid big" href="#gate-join">用 Google 免費加入 →</a><a class="lp-btn ghost big lp-guest" href="#">👀 先以訪客身分逛逛</a></div>
    <p class="lp-guestnote">訪客可以看所有選股與盤後資料；記帳、投票、推播、自選股同步需要 Google 登入</p>
  </div>
  ${heroDemo()}
</div>
<div class="lp-wrap"><div class="lp-stats">
  <div><b class="lp-count" data-to="1900" data-suf="+">0</b><span>每日掃描個股</span></div>
  <div><b class="lp-count" data-to="30" data-suf="+">0</b><span>細分族群</span></div>
  <div><b class="lp-count" data-to="6">0</b><span>種選股策略</span></div>
  <div><b class="lp-count" data-to="0" data-pre="$">$0</b><span>完全免費</span></div>
</div></div>
</section>
<div class="lp-marquee"><div class="lp-track">${[...ticker, ...ticker].map((t) => `<span>${t}</span>`).join('')}</div></div>
<section class="lp-sec lp-journal" id="gate-journal"><div class="lp-wrap lp-jgrid">
  <div class="lp-reveal">
    <div class="lp-kicker">NEW・股票日誌</div>
    <h2>找不到好用的股票記帳？<br>我們自己做了一個。</h2>
    <p class="lp-sub">會員免費，資料只有你自己看得到。</p>
    <ul class="lp-jlist">${JOURNAL.map(([t, d], i) => `<li class="lp-reveal" style="--d:${i * 90}ms"><b>${t}</b><span>${d}</span></li>`).join('')}</ul>
  </div>
  <div class="lp-reveal lp-jcard" style="--d:120ms">
    <div class="lp-jhead"><span>我的資產走勢</span><span class="lp-pill">報酬率 vs 大盤</span></div>
    <svg viewBox="0 0 320 150" preserveAspectRatio="none" class="lp-jchart">
      <polyline class="mk" points="0,110 30,104 60,112 90,98 120,102 150,92 180,96 210,86 240,90 270,80 300,82 320,76"/>
      <polyline class="me" points="0,110 30,100 60,104 90,86 120,90 150,72 180,78 210,60 240,64 270,46 300,40 320,30"/>
    </svg>
    <div class="lp-jstats"><div><b class="up">+12.6%</b><span>我的報酬</span></div><div><b>+5.7%</b><span>同期大盤</span></div><div><b class="dn">-6.2%</b><span>最大回撤</span></div></div>
    <div class="lp-jcal"><span>定期定額</span>${[6, 16, 26].map((d, i) => `<i style="--d:${i * 0.6}s">${d}</i>`).join('')}<em>每月自動記帳</em></div>
  </div>
</div></section>
<section class="lp-sec alt" id="gate-feat"><div class="lp-wrap">
  <h2 class="lp-reveal">一個網站，盤後需要的全都有</h2><p class="lp-sub lp-reveal">選股、族群、籌碼、總經、記帳、推播</p>
  <div class="lp-grid">${FEATURES.map(([i, t, d], k) => `<div class="lp-card lp-reveal" style="--d:${(k % 3) * 90}ms"><div class="lp-ic">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
</div></section>
<section class="lp-sec" id="gate-how"><div class="lp-wrap">
  <h2 class="lp-reveal">三步驟開始</h2><p class="lp-sub lp-reveal">每天收盤後花 3 分鐘就夠</p>
  <div class="lp-steps">${STEPS.map(([t, d], i) => `<div class="lp-step lp-reveal" style="--d:${i * 120}ms"><div class="lp-num">${i + 1}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
</div></section>
<section class="lp-sec alt"><div class="lp-wrap">
  <h2 class="lp-reveal">資料與隱私</h2><p class="lp-sub lp-reveal">我們重視資料的正確性與你的隱私</p>
  <div class="lp-grid">${TRUST.map(([i, t, d], k) => `<div class="lp-card lp-reveal" style="--d:${k * 90}ms"><div class="lp-ic">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
</div></section>
<section class="lp-sec" id="gate-faq"><div class="lp-wrap narrow">
  <h2 class="lp-reveal">常見問題</h2><p class="lp-sub lp-reveal">還有問題？加入後在網站上回報</p>
  <div class="lp-faq">${FAQ.map(([q, a]) => `<details class="lp-reveal"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
</div></section>
<section class="lp-join" id="gate-join"><div class="lp-wrap narrow lp-reveal">
  <img src="${logo}" alt="" class="lp-joinlogo">
  <h2>立即加入飆股情報局</h2>
  <p>用 Google 帳號免費註冊，10 秒完成。<br>股票日誌、預測比賽、推播通知、自選股雲端同步，全部免費。</p>
  <div id="gsi-gate"></div>
  <div class="gate-err"></div>
  <p class="lp-guestnote">還不想登入？<a class="lp-guest" href="#">先以訪客身分逛逛 →</a>（記帳、投票需要登入）</p>
  <div class="gate-note">只會取得你的名字、信箱與大頭照，排行榜只顯示暱稱<br>註冊即表示同意 <a href="/TW-STOCK-/privacy.html" target="_blank">隱私權政策與服務條款</a></div>
</div></section>
<footer class="lp-foot"><div class="lp-wrap"><div class="lp-brand"><img src="${logo}" alt="">飆股情報局</div><p>每天收盤後的台股選股情報站・本站內容皆由程式依公開資料自動整理，僅供參考，不構成投資建議。</p><p>© 2026 飆股情報局・<a href="/TW-STOCK-/privacy.html" target="_blank">隱私權政策與服務條款</a></p></div></footer>
</div>
<script>document.addEventListener("click",function(e){var g=e.target.closest(".lp-guest");if(!g)return;e.preventDefault();try{localStorage.setItem("shoupan_guest","1")}catch(x){}if(window.__track)window.__track("guest");document.documentElement.classList.remove("gated");scrollTo(0,0);});</script>
<script>
(function () {
  // 捲動進場、數字跑動（只在介紹頁顯示時）
  var gate = document.getElementById('gate'); if (!gate) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function count(el) {
    var to = +el.dataset.to, pre = el.dataset.pre || '', suf = el.dataset.suf || '', t0 = null;
    if (reduce || !to) { el.textContent = pre + to.toLocaleString() + suf; return; }
    function step(ts) { if (t0 == null) t0 = ts; var k = Math.min(1, (ts - t0) / 1400), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = pre + v.toLocaleString() + suf; if (k < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; e.target.classList.add('in'); if (e.target.classList.contains('lp-count')) count(e.target); io.unobserve(e.target); });
  }, { threshold: 0.15 }) : null;
  gate.querySelectorAll('.lp-reveal,.lp-count').forEach(function (el) { if (io && !reduce) io.observe(el); else { el.classList.add('in'); if (el.classList.contains('lp-count')) count(el); } });
})();
</script>`;
}

const GATE_CSS = `#gate{display:none}html.gated #gate{display:block;position:fixed;inset:0;z-index:1000;background:var(--bg);overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}html.gated body{overflow:hidden}
#gate h1,#gate h2,#gate h3{border:0;padding:0}.lp-wrap{max-width:1100px;margin:0 auto;padding:0 20px}.lp-wrap.narrow{max-width:760px}
.lp-nav{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}.lp-navin{display:flex;align-items:center;gap:20px;height:60px}
.lp-brand{display:flex;align-items:center;gap:8px;font-weight:800;font-size:17px;color:var(--fg);text-decoration:none}.lp-brand img{width:30px;height:30px;border-radius:8px}
.lp-links{display:flex;gap:22px;flex:1;justify-content:center}.lp-links a{color:var(--mute);text-decoration:none;font-size:14px;font-weight:600}.lp-links a:hover{color:var(--fg)}.lp-acts{display:flex;gap:8px}
.lp-btn{display:inline-block;font-size:14px;font-weight:700;padding:8px 16px;border-radius:10px;text-decoration:none;border:1.5px solid var(--line);color:var(--fg);background:var(--bg);white-space:nowrap;transition:transform .15s,box-shadow .15s}.lp-btn:hover{transform:translateY(-2px)}.lp-btn.solid{background:var(--accent);border-color:var(--accent);color:var(--bg)}.lp-btn.big{font-size:16px;padding:13px 24px;border-radius:12px}.lp-btn.solid.big{box-shadow:0 8px 20px color-mix(in srgb,var(--accent) 28%,transparent)}
@media (max-width:820px){.lp-links{display:none}.lp-navin{justify-content:space-between}}
.lp-hero{padding:56px 0 30px}.lp-herogrid{display:grid;grid-template-columns:1.15fr 1fr;gap:40px;align-items:center}
.lp-badge{display:inline-block;font-size:13px;font-weight:700;padding:6px 14px;border-radius:999px;background:color-mix(in srgb,var(--accent) 10%,var(--bg));color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);margin-bottom:18px;text-decoration:none;animation:lpUp .6s both}
.lp-hero h1{font-size:50px;line-height:1.22;font-weight:900;margin:0 0 16px;animation:lpUp .6s .08s both}
.lp-rot{display:inline-grid;color:var(--accent);height:1.22em;overflow:hidden;vertical-align:bottom}.lp-rot span{grid-area:1/1;animation:lpRot 10s infinite;opacity:0}.lp-rot span:nth-child(2){animation-delay:2.5s}.lp-rot span:nth-child(3){animation-delay:5s}.lp-rot span:nth-child(4){animation-delay:7.5s}
@keyframes lpRot{0%{opacity:0;transform:translateY(60%)}4%,22%{opacity:1;transform:none}26%,100%{opacity:0;transform:translateY(-60%)}}
.lp-lead{color:var(--mute);font-size:17px;line-height:1.8;margin:0 0 26px;max-width:560px;animation:lpUp .6s .16s both}.lp-heroacts{display:flex;gap:12px;flex-wrap:wrap;animation:lpUp .6s .24s both}
@keyframes lpUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
/* 動態小儀表板 */
.lp-demo{position:relative;background:var(--bg);border:1px solid var(--line);border-radius:22px;padding:20px 22px;box-shadow:0 20px 50px rgba(17,24,39,.10);animation:lpUp .7s .2s both,lpFloat 6s 1s ease-in-out infinite}
@keyframes lpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.lp-demo-top{display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:var(--mute)}.lp-live{color:var(--up);animation:lpBlink 1.6s infinite}@keyframes lpBlink{50%{opacity:.35}}
.lp-demo-lab{font-size:13px;color:var(--mute);margin-top:12px}.lp-demo-num{font-size:34px;font-weight:900;letter-spacing:.5px}.lp-demo-sub{font-size:13.5px;font-weight:700}
.lp-demo-chart{width:100%;height:110px;margin:10px 0 6px;overflow:visible}.lp-demo-chart .ln{fill:none;stroke:#2563eb;stroke-width:3;stroke-linejoin:round;stroke-dasharray:420;stroke-dashoffset:420;animation:lpDraw 6s ease-out infinite}
.lp-demo-chart .tp{stroke:#b7791f;stroke-width:1.5;stroke-dasharray:5 5}.lp-demo-chart .tpt{fill:#b7791f;font-size:11px;font-weight:700}
@keyframes lpDraw{0%{stroke-dashoffset:420}55%,100%{stroke-dashoffset:0}}
.lp-demo-rows div{display:flex;justify-content:space-between;font-size:14px;padding:7px 0;border-top:1px solid var(--line)}
.lp-toast{position:absolute;left:50%;top:-18px;transform:translate(-50%,0);white-space:nowrap;font-size:13.5px;font-weight:800;padding:9px 16px;border-radius:999px;background:var(--bg);border:1.5px solid #b7791f;color:var(--fg);box-shadow:0 10px 24px rgba(0,0,0,.12);opacity:0;animation:lpToast 6s infinite}
@keyframes lpToast{0%,50%{opacity:0;transform:translate(-50%,10px)}56%,85%{opacity:1;transform:translate(-50%,0)}92%,100%{opacity:0;transform:translate(-50%,-6px)}}
.lp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:44px 0 0}.lp-stats div{background:var(--card);border-radius:16px;padding:16px 8px;text-align:center}.lp-stats b{display:block;font-size:28px;font-weight:900}.lp-stats span{font-size:12.5px;color:var(--mute)}
@media (max-width:820px){.lp-herogrid{grid-template-columns:1fr;gap:34px}.lp-hero{padding:36px 0 20px}.lp-hero h1{font-size:34px}.lp-lead{font-size:15px}.lp-stats{grid-template-columns:repeat(2,1fr)}.lp-demo{margin:10px 6px 0}}
/* 跑馬燈 */
.lp-marquee{overflow:hidden;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px 0;margin-top:36px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.lp-track{display:flex;gap:12px;width:max-content;animation:lpMarq 40s linear infinite}.lp-track span{font-size:14px;font-weight:700;padding:7px 16px;border-radius:999px;background:var(--card);color:var(--fg);white-space:nowrap}
@keyframes lpMarq{to{transform:translateX(-50%)}}
.lp-sec{padding:72px 0;text-align:center}.lp-sec.alt{background:var(--card)}.lp-sec h2,.lp-join h2{font-size:32px;font-weight:900;margin:0 0 8px;line-height:1.3}.lp-sub{color:var(--mute);font-size:15px;margin:0 0 36px}
/* 股票日誌專區 */
.lp-journal{text-align:left}.lp-jgrid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}.lp-kicker{font-size:13px;font-weight:800;letter-spacing:2px;color:var(--accent);margin-bottom:10px}
.lp-journal .lp-sub{margin-bottom:22px}.lp-jlist{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}.lp-jlist li{display:flex;flex-direction:column;padding:12px 16px;border-left:4px solid var(--accent);background:var(--card);border-radius:0 12px 12px 0}.lp-jlist b{font-size:16px}.lp-jlist span{font-size:13.5px;color:var(--mute);margin-top:2px}
.lp-jcard{background:var(--bg);border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 20px 50px rgba(17,24,39,.08)}.lp-jhead{display:flex;justify-content:space-between;align-items:center;font-weight:800}.lp-pill{font-size:12px;padding:4px 10px;border-radius:999px;background:var(--card);color:var(--mute)}
.lp-jchart{width:100%;height:150px;margin:12px 0}.lp-jchart polyline{fill:none;stroke-width:3;stroke-linejoin:round;stroke-dasharray:480;stroke-dashoffset:480}.lp-jchart .me{stroke:var(--up)}.lp-jchart .mk{stroke:#94a3b8;stroke-dasharray:6 5}
.lp-jcard.in .lp-jchart .me{animation:lpDraw2 2.2s .3s ease-out forwards}.lp-jcard.in .lp-jchart .mk{stroke-dashoffset:0;opacity:0;animation:lpFade .8s .2s forwards}@keyframes lpDraw2{to{stroke-dashoffset:0}}@keyframes lpFade{to{opacity:1}}
.lp-jstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}.lp-jstats b{display:block;font-size:20px;font-weight:900}.lp-jstats span{font-size:12px;color:var(--mute)}
.lp-jcal{display:flex;align-items:center;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:13.5px;font-weight:700}.lp-jcal i{font-style:normal;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--card);animation:lpPop 1.8s var(--d) infinite}.lp-jcal em{font-style:normal;color:var(--mute);font-weight:600;margin-left:auto}
@keyframes lpPop{0%,30%{background:var(--card);color:var(--fg)}40%,100%{background:var(--fg);color:var(--bg)}}
@media (max-width:820px){.lp-jgrid{grid-template-columns:1fr;gap:30px}}
.lp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;text-align:left}.lp-card{background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:22px;transition:transform .2s,box-shadow .2s}.lp-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(17,24,39,.08)}
.lp-ic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:23px;background:color-mix(in srgb,var(--accent) 10%,transparent);margin-bottom:12px}.lp-card h3,.lp-step h3{font-size:18px;font-weight:800;margin:0 0 8px}.lp-card p,.lp-step p{font-size:14.5px;line-height:1.75;color:var(--mute);margin:0}
.lp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}.lp-num{width:52px;height:52px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;background:var(--accent);color:var(--bg)}
@media (max-width:820px){.lp-grid{grid-template-columns:repeat(2,1fr)}}@media (max-width:560px){.lp-grid,.lp-steps{grid-template-columns:1fr}.lp-sec{padding:52px 0}.lp-sec h2,.lp-join h2{font-size:25px}}
.lp-faq{text-align:left;display:flex;flex-direction:column;gap:10px}.lp-faq details{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:0 18px}.lp-faq summary{cursor:pointer;font-weight:700;font-size:15.5px;padding:16px 0;list-style:none;display:flex;justify-content:space-between;gap:10px}.lp-faq summary::-webkit-details-marker{display:none}.lp-faq summary:after{content:'+';color:var(--mute);font-size:20px;line-height:1}.lp-faq details[open] summary:after{content:'−'}.lp-faq p{margin:0 0 16px;color:var(--mute);font-size:14.5px;line-height:1.75}
.lp-join{text-align:center;padding:72px 0;background:var(--card)}.lp-joinlogo{width:80px;height:80px;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,.15);margin-bottom:14px}.lp-join p{color:var(--mute);font-size:15.5px;line-height:1.75;margin:0 0 24px}
#gsi-gate{display:flex;justify-content:center;min-height:44px}.gate-note{color:var(--mute);font-size:12px;margin-top:16px;line-height:1.6}.gate-note a{color:inherit}.gate-err{color:var(--up);font-size:13px;margin-top:8px}
.lp-foot{border-top:1px solid var(--line);padding:28px 0 36px;font-size:12.5px;color:var(--mute)}.lp-foot .lp-brand{font-size:15px;margin-bottom:8px}.lp-foot .lp-brand img{width:24px;height:24px}.lp-foot p{margin:4px 0}.lp-foot a{color:inherit}
/* 捲動進場 */
.lp-reveal{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s ease;transition-delay:var(--d,0ms)}.lp-reveal.in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.lp-reveal{opacity:1;transform:none;transition:none}.lp-track,.lp-demo,.lp-rot span,.lp-toast,.lp-demo-chart .ln,.lp-jcal i,.lp-live{animation:none!important}.lp-rot span{opacity:0}.lp-rot span:first-child{opacity:1}.lp-toast{opacity:1}.lp-demo-chart .ln{stroke-dashoffset:0}}
.sh-bar{display:flex;justify-content:flex-end;margin:10px 0 -4px}.sh-inline{font:inherit;font-size:13px;font-weight:700;padding:6px 14px;border-radius:999px;border:1.5px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);color:var(--accent);cursor:pointer}
#share-fab{position:fixed;right:16px;bottom:18px;z-index:40;font:inherit;font-size:14px;font-weight:700;padding:11px 18px;border-radius:999px;border:0;background:var(--accent);color:var(--bg);box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer}html.gated #share-fab{display:none}#share-fab[hidden]{display:none}
#share-modal{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px}#share-modal[hidden]{display:none}
.sh-box{background:var(--bg);border-radius:18px;padding:16px;max-width:420px;width:100%;max-height:94vh;overflow:auto;text-align:center}.sh-box img{width:100%;border-radius:10px;display:block;background:var(--card);min-height:200px}
.sh-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.sh-btns button{font:inherit;font-size:14px;font-weight:700;padding:11px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}.sh-btns .sh-main{grid-column:1/-1;background:var(--accent);border-color:var(--accent);color:var(--bg)}
.sh-tip{font-size:12px;color:var(--mute);margin-top:10px;line-height:1.6}
.push-box{margin-bottom:6px}.push-tip{font-size:13.5px;color:var(--mute);line-height:1.7}.push-on{font-weight:700;margin:4px 0 8px}.push-opts{display:flex;flex-direction:column;gap:8px;font-size:14px}.push-opts input{margin-right:6px}.push-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.push-enable,.push-acts button{font:inherit;font-size:14px;font-weight:700;padding:9px 16px;border-radius:999px;border:1.5px solid var(--accent);background:var(--accent);color:var(--bg);cursor:pointer}.push-acts button{background:var(--card);color:var(--fg);border-color:var(--line);font-weight:600;font-size:13px;padding:7px 14px}.push-small{margin-top:8px;font-size:13px;padding:6px 14px;background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--accent)}.push-msg{font-size:13px;color:var(--accent);margin-top:8px}
.lock-card{display:none}html.anon .lock-card{display:block}html.anon .vote-form,html.anon .push-mini{display:none}html.anon .page[data-p="profile"]>:not(.lock-card),html.anon .page[data-p="watch"]>:not(.lock-card){display:none}
.vote-lock{margin-top:4px;padding:12px 14px;border-radius:12px;border:1.5px dashed color-mix(in srgb,var(--accent) 45%,var(--line));background:color-mix(in srgb,var(--accent) 5%,var(--bg))}.lock-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;font-size:14.5px}.lock-ic{font-size:22px;line-height:1.2}.lock-sub{font-size:12.5px;color:var(--mute);margin-top:3px;line-height:1.6}.gsi-lock{min-height:44px}
.pf-lock{text-align:center;max-width:460px;margin:30px auto;padding:30px 22px;border-radius:18px;border:1px solid var(--line);background:var(--card)}.pf-lock h3{font-size:19px;margin:8px 0}.pf-lock p{font-size:14px;color:var(--mute);line-height:1.75;margin:0 0 18px}.pf-lock .gsi-lock{display:flex;justify-content:center}.lock-ic.big{font-size:40px}
.lp-guest{cursor:pointer}.lp-guestnote{font-size:13px;color:var(--mute);margin-top:14px}
.btabs{display:none}
/* 電腦版：分頁列放左邊空白處，只有圖示（像 Threads） */
@media (min-width:641px){.btabs{display:flex;flex-direction:column;position:fixed;left:0;top:0;bottom:0;width:76px;z-index:40;justify-content:center;align-items:center;gap:8px;border-right:1px solid var(--line);background:var(--bg)}.btab{position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;border:0;background:none;color:var(--mute);border-radius:14px;cursor:pointer}.btab:hover{background:var(--card);color:var(--fg)}.btab.on{color:var(--fg);background:var(--card)}.btab.on svg{stroke-width:2.6}.btab:hover::after{content:attr(aria-label);position:absolute;left:62px;top:50%;transform:translateY(-50%);white-space:nowrap;font-size:13px;font-weight:700;padding:5px 10px;border-radius:8px;background:var(--fg);color:var(--bg);pointer-events:none}.ptabs .gtabs{display:none}.ptabs.nosub{display:none}html.gated .btabs{display:none}}
@media (min-width:641px) and (max-width:1300px){body{padding-left:92px!important}}
@media (max-width:640px){.btabs{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:40;justify-content:space-around;align-items:center;padding:6px 6px calc(6px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line)}.btab{flex:1;display:flex;justify-content:center;align-items:center;height:46px;border:0;background:none;color:var(--mute);cursor:pointer;border-radius:12px;-webkit-tap-highlight-color:transparent}.btab.on{color:var(--fg)}.btab.on svg{stroke-width:2.6}.btab:active{background:var(--card)}.ptabs .gtabs{display:none}.ptabs.nosub{display:none}.ptabs{padding-top:6px}body{padding-bottom:calc(72px + env(safe-area-inset-bottom))}#share-fab{bottom:calc(80px + env(safe-area-inset-bottom))}html.gated .btabs{display:none}}
.aetf-h{font-weight:800;font-size:13.5px;margin:6px 0 4px}
.vote-form[hidden]{display:none}
.vote-prize{border-radius:12px;padding:12px 14px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 10%,var(--bg)),var(--bg));border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line))}.vp-title{font-weight:800;font-size:15px;margin-bottom:6px}.vp-row{font-size:13.5px;line-height:1.7}.vp-me{margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);font-size:14px;line-height:1.6}`;

// ---- 瀏覽器端：分享圖卡 ----
function shareClient(SITE) {
  var PREF = {
    main: ['收盤', '漲跌', '營收YoY'], latent: ['收盤', 'YoY 近3月', '距60日低'], cup: ['狀態', '距突破價', '回檔次數'],
    three: ['收盤', '漲跌', '三率增加（毛/營/淨）'], leader: ['收盤', '今日', '產業／市值排名'], track: ['1 日勝率', '5 日勝率', '平均5日報酬'],
    locked: ['收盤', '漲跌', '籌碼集中度'], flow: ['收盤', '金額(億)', '外資(億)'], holders: ['連續增加', '千張大戶持股', '增加（百分點）'],
    industry: ['今日', '近5日', '上漲家數'], ir50: ['日期', '類型'], macro: ['最新', '1 日', '1 週'],
  };
  var NAMES = ['名稱', '股票', '個股', '族群', '公司', '項目', '分組'];
  var SKIP = ['代號', '產業', '基本面', '走勢', '#'];
  var W = 1080, H = 1350;
  var C = { bg1: '#0b1530', bg2: '#173262', fg: '#ffffff', mute: '#93a6cc', gold: '#ffd166', up: '#ff5d63', dn: '#3ddc84', card: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.10)' };
  var fab = document.createElement('button');
  fab.id = 'share-fab'; fab.type = 'button'; fab.textContent = '📤 分享這頁';
  document.body.appendChild(fab);
  var modal = document.createElement('div');
  modal.id = 'share-modal'; modal.hidden = true;
  modal.innerHTML = '<div class="sh-box"><img alt="分享圖卡預覽"><div class="sh-btns"><button type="button" class="sh-main sh-share">分享圖片</button><button type="button" class="sh-dl">下載圖片</button><button type="button" class="sh-copy">複製連結</button><button type="button" class="sh-close" style="grid-column:1/-1">關閉</button></div><div class="sh-tip">Threads 不能貼連結也沒關係，圖上有 QR Code，朋友掃一下就能進來。</div></div>';
  document.body.appendChild(modal);
  var img = modal.querySelector('img'), blob = null, cur = null;

  function activePage() { return document.querySelector('.page:not([hidden])'); }
  function pageKey() { var p = activePage(); return p ? p.dataset.p : 'main'; }
  function syncFab() { fab.hidden = pageKey() === 'profile' || pageKey() === 'journal'; } // 個人資料不分享
  document.addEventListener('click', function (e) { if (e.target.closest('.ptab,.gtab')) setTimeout(syncFab, 0); });
  syncFab();

  function visible(el) { return !!(el && el.offsetParent !== null); }
  function clean(td) {
    var c = td.cloneNode(true);
    c.querySelectorAll('.tag,.sub,svg,.arrow,.count').forEach(function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function tone(td) {
    if (td.classList.contains('up') || td.querySelector('.up,.chip.good')) return C.up;
    if (td.classList.contains('dn') || td.querySelector('.dn,.chip.bad')) return C.dn;
    return C.fg;
  }
  function extract(page, key) {
    var tables = [].slice.call(page.querySelectorAll('table')).filter(function (t) { return visible(t) && !t.closest('td') && t.querySelector(':scope > thead') && t.querySelectorAll(':scope > tbody > tr').length; });
    var t = tables[0];
    if (!t) {
      var links = [].slice.call(page.querySelectorAll('li a, .news a, a.news')).filter(visible).slice(0, 7);
      return { cols: ['標題'], rows: links.map(function (a) { return { name: a.textContent.replace(/\s+/g, ' ').trim(), vals: [] }; }), total: links.length, head: null };
    }
    var heads = [].slice.call(t.querySelectorAll(':scope > thead > tr > th')).map(function (th) { return th.textContent.replace(/\s+/g, ' ').trim(); });
    var ni = heads.findIndex(function (h) { return NAMES.indexOf(h) >= 0; }); if (ni < 0) ni = 0;
    var ci = heads.indexOf('代號');
    var want = (PREF[key] || []).map(function (h) { return heads.indexOf(h); }).filter(function (i) { return i >= 0 && i !== ni; });
    if (!want.length) want = heads.map(function (h, i) { return i; }).filter(function (i) { return i !== ni && i !== ci && SKIP.indexOf(heads[i]) < 0; }).slice(0, 3);
    var trs = [].slice.call(t.querySelectorAll(':scope > tbody > tr')).filter(function (tr) { return !tr.classList.contains('det') && !tr.classList.contains('watch-gh') && tr.children.length >= heads.length - 1; });
    var rows = trs.slice(0, 7).map(function (tr) {
      var td = tr.children;
      var name = td[ni] ? clean(td[ni]) : '';
      if (ci >= 0 && td[ci]) name = name + ' ' + clean(td[ci]);
      return { name: name, vals: want.map(function (i) { return td[i] ? { t: clean(td[i]), c: tone(td[i]) } : { t: '', c: C.fg }; }) };
    });
    var h2 = null, el = t.closest('.scroll') || t;
    while (el && el !== page && !h2) { var s = el.previousElementSibling; while (s && !h2) { if (s.tagName === 'H2' && visible(s)) h2 = s; s = s.previousElementSibling; } el = el.parentElement; }
    return { cols: [heads[ni]].concat(want.map(function (i) { return heads[i]; })), rows: rows, total: trs.length, head: h2 };
  }

  function loadQR() {
    if (window.qrcode) return Promise.resolve();
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  }
  function loadImg(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function fit(g, text, w) {
    if (g.measureText(text).width <= w) return text;
    while (text.length > 1 && g.measureText(text + '…').width > w) text = text.slice(0, -1);
    return text + '…';
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  var FONT = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';
  function font(px, bold) { return (bold ? '800 ' : '500 ') + px + 'px ' + FONT; }

  function draw(data, title, sub, date, url, logo) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, C.bg1); bg.addColorStop(1, C.bg2);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,209,102,0.08)'; g.beginPath(); g.arc(W - 80, 120, 260, 0, 7); g.fill();
    // 頁首
    if (logo) { g.save(); rr(g, 60, 52, 92, 92, 22); g.clip(); g.drawImage(logo, 60, 52, 92, 92); g.restore(); }
    g.fillStyle = C.fg; g.font = font(44, true); g.textBaseline = 'middle'; g.fillText('飆股情報局', 172, 84);
    g.fillStyle = C.mute; g.font = font(24); g.fillText('每天收盤後的台股整理', 174, 124);
    g.fillStyle = C.gold; g.font = font(28, true); g.textAlign = 'right'; g.fillText(date, W - 60, 98); g.textAlign = 'left';
    // 標題
    g.fillStyle = C.fg; g.font = font(64, true); g.fillText(fit(g, title, W - 120), 60, 228);
    g.fillStyle = C.mute; g.font = font(28); g.fillText(fit(g, sub, W - 120), 62, 286);
    // 表格
    var top = 330, rowH = data.rows.length <= 5 ? 112 : 76, n = Math.max(1, data.rows.length), boxH = 70 + n * rowH + 20;
    g.fillStyle = C.card; rr(g, 40, top, W - 80, boxH, 26); g.fill();
    var nameW = data.cols.length > 1 ? 380 : W - 160, vx = 70 + nameW, vw = data.cols.length > 1 ? (W - 70 - vx - 30) / (data.cols.length - 1) : 0;
    g.font = font(24, true); g.fillStyle = C.mute;
    g.fillText(data.cols[0], 70, top + 40);
    g.textAlign = 'right';
    data.cols.slice(1).forEach(function (h, i) { g.fillText(fit(g, h, vw - 12), vx + vw * (i + 1), top + 40); });
    g.textAlign = 'left';
    if (!data.rows.length) { g.fillStyle = C.mute; g.font = font(32); g.fillText('今日無符合條件的股票', 70, top + 110); }
    data.rows.forEach(function (r, k) {
      var y = top + 70 + k * rowH;
      g.fillStyle = C.line; g.fillRect(64, y, W - 128, 2);
      var cy = y + rowH / 2 + 2;
      g.fillStyle = C.gold; g.font = font(26, true); g.fillText(String(k + 1), 70, cy);
      g.fillStyle = C.fg; g.font = font(data.cols.length > 1 ? 34 : 30, true); g.fillText(fit(g, r.name, nameW - 50), 112, cy);
      g.textAlign = 'right';
      r.vals.forEach(function (v, i) { g.fillStyle = v.c; g.font = font(v.t.length > 8 ? 24 : 32, true); g.fillText(fit(g, v.t, vw - 12), vx + vw * (i + 1), cy); });
      g.textAlign = 'left';
    });
    if (data.total > data.rows.length) { g.fillStyle = C.mute; g.font = font(24); g.fillText('…還有 ' + (data.total - data.rows.length) + ' 筆，掃 QR Code 看完整名單', 70, top + boxH + 34); }
    // 最下方：投資警語橫條（每張圖都有）
    var bandH = 100, by = H - bandH;
    g.fillStyle = '#ffd166'; g.fillRect(0, by, W, bandH);
    g.fillStyle = '#1b1300'; g.textAlign = 'center';
    g.font = font(27, true); g.fillText('⚠️ 投資警語：本內容僅供參考，不構成投資建議或買賣推薦', W / 2, by + 34);
    g.font = font(21); g.fillText('資料由程式依公開資訊自動整理，可能有延遲或誤差；投資有風險，請獨立判斷、自負盈虧', W / 2, by + 72);
    g.textAlign = 'left';
    // 頁尾 QR
    var qs = 180, qx = W - 60 - qs, qy = by - 30 - qs;
    g.fillStyle = '#fff'; rr(g, qx - 14, qy - 14, qs + 28, qs + 28, 20); g.fill();
    var qr = qrcode(0, 'M'); qr.addData(url); qr.make();
    var m = qr.getModuleCount(), cs = qs / m;
    g.fillStyle = '#0b1530';
    for (var a = 0; a < m; a++) for (var b = 0; b < m; b++) if (qr.isDark(a, b)) g.fillRect(qx + b * cs, qy + a * cs, cs + 0.6, cs + 0.6);
    g.fillStyle = C.fg; g.font = font(38, true); g.fillText('掃描看完整內容', 60, qy + 30);
    g.fillStyle = C.mute; g.font = font(25); g.fillText('每天收盤後自動更新・免費加入', 60, qy + 84);
    g.fillStyle = C.gold; g.font = font(29, true); g.fillText('🔍 搜尋「飆股情報局」', 60, qy + 136);
    return cv;
  }

  function open() {
    var page = activePage(); if (!page) return;
    var key = pageKey();
    var tab = document.querySelector('.ptab.on'), st = page.querySelector('.stab.on');
    var title = (tab ? tab.textContent.trim() : '飆股情報局') + (st && visible(st) ? '・' + st.textContent.replace(/\s+\d+$/, '').trim() : '');
    var data = extract(page, key);
    var sub = data.head ? data.head.textContent.replace(/\s+/g, ' ').trim() : '';
    var base = tab ? tab.textContent.trim() : '';
    if (base && sub.indexOf(base) === 0) sub = sub.slice(base.length).trim();
    var dm = (document.querySelector('.head + .sub') || document.body).textContent.match(/交易日\s*([\d\/]+)/);
    var date = dm ? dm[1] : '';
    var url = SITE + '#' + key;
    cur = { title: title, url: url, date: date };
    img.removeAttribute('src'); blob = null; modal.hidden = false;
    Promise.all([loadQR(), loadImg('/TW-STOCK-/icon-192.png?v=2')]).then(function (r) {
      var cv = draw(data, title, sub, date, url, r[1]);
      img.src = cv.toDataURL('image/png');
      cv.toBlob(function (b) { blob = b; }, 'image/png');
    }).catch(function () { modal.querySelector('.sh-tip').textContent = '圖卡產生失敗，請檢查網路後再試一次'; });
  }
  function fileName() { return '飆股情報局_' + cur.title.replace(/[\\/:*?"<>|・]/g, '_') + '_' + cur.date.replace(/\//g, '') + '.png'; }
  function download() {
    if (!blob) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName(); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  fab.onclick = open;
  // 每一頁最上方也放一顆分享按鈕
  document.querySelectorAll('.page').forEach(function (p) {
    if (p.dataset.p === 'profile' || p.dataset.p === 'journal') return;
    var bar = document.createElement('div'); bar.className = 'sh-bar';
    bar.innerHTML = '<button type="button" class="sh-inline">📤 分享這頁</button>';
    bar.firstChild.onclick = open;
    p.insertBefore(bar, p.firstChild);
  });
  modal.querySelector('.sh-close').onclick = function () { modal.hidden = true; };
  modal.onclick = function (e) { if (e.target === modal) modal.hidden = true; };
  modal.querySelector('.sh-dl').onclick = download;
  modal.querySelector('.sh-share').onclick = function () {
    if (!blob) return;
    var f = new File([blob], fileName(), { type: 'image/png' });
    var text = '飆股情報局｜' + cur.title + ' ' + cur.date + '（掃圖上 QR Code 看完整內容）｜僅供參考，非投資建議';
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: text }).catch(function () {});
    else download();
  };
  modal.querySelector('.sh-copy').onclick = function (e) {
    var b = e.target;
    (navigator.clipboard ? navigator.clipboard.writeText(cur.url) : Promise.reject()).then(function () { b.textContent = '已複製 ✓'; }, function () { prompt('複製這個連結', cur.url); });
    setTimeout(function () { b.textContent = '複製連結'; }, 1800);
  };

  // 網址帶 #頁面 時直接打開那一頁；切換頁面時同步更新網址
  var h = decodeURIComponent(location.hash.slice(1));
  var tb = h && document.querySelector('.ptab[data-p="' + h + '"]');
  if (tb) {
    var row = tb.closest('.subtabs'), gb = row && document.querySelector('.gtab[data-g="' + row.dataset.g + '"]');
    if (gb) gb.click();
    tb.click();
    syncFab();
  }
  document.querySelectorAll('.ptab').forEach(function (b) { b.addEventListener('click', function () { try { history.replaceState(null, '', '#' + b.dataset.p); } catch (e) {} }); });
}

// ---- 瀏覽器端：開盤／收盤推播通知 ----
function pushClient(API) {
  var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var reg = null, sub = null, prefs = { open: true, close: true, report: true }, admin = false;
  function token() { try { return localStorage.getItem('shoupan_token'); } catch (e) { return null; } }
  function api(path, body) {
    var h = { 'Content-Type': 'application/json' }; if (token()) h.Authorization = 'Bearer ' + token();
    return fetch(API + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json(); });
  }
  function u8(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }

  // 個人檔案頁：完整設定；投票區：一顆小按鈕（已開啟就不顯示）
  var full = document.createElement('div'); full.className = 'push-box';
  var pf = document.querySelector('.page[data-p="profile"] h2');
  if (pf) pf.parentNode.insertBefore(full, pf);
  var mini = document.createElement('div'); mini.className = 'push-mini';
  var vm = document.querySelector('.vote .vote-msg');
  if (vm) vm.parentNode.insertBefore(mini, vm.nextSibling);

  function render(msg) {
    var h = '<h2>🔔 推播通知</h2>';
    if (!supported) {
      h += ios && !standalone
        ? '<p class="push-tip">iPhone／iPad 要先把網站加到主畫面才能收通知：<br>① 用 Safari 打開本站 → ② 點下方「分享」按鈕 → ③「加入主畫面」→ ④ 從主畫面的「飆股情報局」圖示打開，再回到這裡開啟通知（需要 iOS 16.4 以上）。</p>'
        : '<p class="push-tip">這個瀏覽器不支援推播通知，請改用 Chrome、Edge 或 Safari 最新版。</p>';
      full.innerHTML = h; mini.innerHTML = ''; return;
    }
    if (Notification.permission === 'denied') {
      full.innerHTML = h + '<p class="push-tip">通知被封鎖了：請到瀏覽器（或手機設定 → 通知）允許「飆股情報局」的通知，再重新整理。</p>'; mini.innerHTML = ''; return;
    }
    if (sub) {
      h += '<div class="push-on">✅ 這台裝置已開啟通知</div><div class="push-opts">' +
        '<label><input type="checkbox" data-k="open"' + (prefs.open ? ' checked' : '') + '> 開盤提醒（08:55：台指期夜盤、費半、今日焦點股、投票截止）</label>' +
        '<label><input type="checkbox" data-k="close"' + (prefs.close ? ' checked' : '') + '> 收盤開獎（13:35：加權收盤、最強族群、你的得分）</label>' +
        '<label><input type="checkbox" data-k="report"' + (prefs.report !== false ? ' checked' : '') + '> 盤後報告（14:00 收盤快報整理出爐、17:00 法人籌碼更新）</label></div>' +
        '<div class="push-acts">' + (admin ? '<button type="button" class="push-test" data-kind="open">傳一則開盤測試（管理員）</button><button type="button" class="push-test" data-kind="close">傳一則收盤測試（管理員）</button>' : '') + '<button type="button" class="push-off">關閉通知</button></div>';
      mini.innerHTML = '';
    } else {
      h += '<p class="push-tip">開盤前提醒你今天的焦點、收盤後馬上告訴你開獎結果、盤後報告出爐也通知你，像 App 一樣跳出通知。</p><button type="button" class="push-enable">🔔 開啟開盤／收盤通知</button>';
      mini.innerHTML = '<button type="button" class="push-enable push-small">🔔 開盤前提醒我、收盤馬上通知開獎</button>';
    }
    full.innerHTML = h + (msg ? '<p class="push-msg">' + msg + '</p>' : '');
  }
  function save() { return api('/api/push/subscribe', { subscription: sub.toJSON(), prefs: prefs }); }
  function enable() {
    render('設定中…');
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') return render(p === 'denied' ? '' : '需要允許通知才能開啟');
      return api('/api/push/key').then(function (k) {
        return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(k.key) });
      }).then(function (s) { sub = s; return save(); }).then(function (j) {
        if (j.error) { sub = null; return render(j.error); }
        render(admin ? '已開啟！可以按「傳一則測試」試試看' : '已開啟！開盤前和收盤後會通知你');
      });
    }).catch(function (e) { render('開啟失敗：' + (e && e.message ? e.message : e)); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('.push-enable')) enable();
    else if (t.closest('.push-off') && sub) {
      var ep = sub.endpoint;
      sub.unsubscribe().finally(function () { api('/api/push/unsubscribe', { endpoint: ep }); sub = null; render('已關閉通知'); });
    } else if (t.closest('.push-test')) {
      var b = t.closest('.push-test'); b.disabled = true;
      api('/api/push/test', { kind: b.dataset.kind }).then(function (j) { render(j.error ? j.error : j.sent ? '已送出，幾秒內會收到通知' : '送出失敗，請關閉後重新開啟通知'); });
    }
  });
  document.addEventListener('change', function (e) {
    var c = e.target.closest('.push-opts input'); if (!c || !sub) return;
    prefs[c.dataset.k] = c.checked; save().then(function () { render('已儲存'); });
  });
  if (token()) api('/api/profile').then(function (j) { if (j.profile && j.profile.admin) { admin = true; if (sub) render(); } }).catch(function () {});
  if (!supported) return render();
  navigator.serviceWorker.register('/TW-STOCK-/sw.js', { scope: '/TW-STOCK-/' }).then(function (r) {
    reg = r; return navigator.serviceWorker.ready;
  }).then(function () { return reg.pushManager.getSubscription(); }).then(function (s) {
    sub = s;
    if (!s || !token()) return render();
    return api('/api/push/status?endpoint=' + encodeURIComponent(s.endpoint)).then(function (j) {
      if (j.subscribed) prefs = j.prefs || prefs;
      else if (!j.error) return save().then(function () { render(); }); // 伺服器沒有紀錄（例如換帳號），補登記
      render();
    });
  }).catch(function () { render(); });
}

function pushScript(api) {
  return `<script>(${pushClient.toString()})(${JSON.stringify(api)});</script>`;
}

function shareScript() {
  return `<script>(${shareClient.toString()})(${JSON.stringify(SITE)});</script>`;
}

module.exports = { renderGate, GATE_CSS, shareScript, pushScript };
