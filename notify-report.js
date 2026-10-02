// 報告發布後推播：14:00 盤後整理（還沒有法人）、17:00 法人更新（有法人）
// 由雲端排程在網站更新後執行；同一種通知同一天只會推一次（伺服器端去重）
const fs = require('fs');
const path = require('path');
const { resultsKey, ymd } = require('./screener.js');

const API = 'https://shoupan-api.shoupan.workers.dev';
const sign = (v, d = 2) => (v >= 0 ? '+' : '') + Number(v).toFixed(d);

(async () => {
  const b = JSON.parse(fs.readFileSync(path.join(__dirname, 'site', 'brief.json'), 'utf8'));
  // 測試：--only=<sub> 只推給指定訂閱、--kind=report14|report17 指定種類
  const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
  const only = arg('only') || null;
  if (arg('kind')) b.insti = arg('kind') === 'report17';
  const today = ymd(new Date(Date.now() + 8 * 3600000));
  if (b.date !== today && !only) return console.log('報告不是今天的，不推播', b.date);
  const md = `${+b.date.slice(4, 6)}/${+b.date.slice(6)}`;
  const names = (l, n = 3) => (l || []).slice(0, n).join('、');
  let kind, title, lines;
  if (!b.insti) {
    kind = 'report14';
    title = `📈 ${md} 盤後整理出爐${b.twii ? `｜加權 ${sign(b.twii.pct)}%` : ''}`;
    lines = [
      b.themes && b.themes.length ? '強勢族群：' + b.themes.map((t) => `${t.name} ${sign(t.r1)}%`).join('、') : '',
      `一K站三線 ${b.n.cross} 檔・杯柄 ${b.n.cup} 檔${b.cup.length ? `（${names(b.cup)}）` : ''}・三率三升 ${b.n.three} 檔`,
      '🗳️ 明天怎麼走？投票開放囉',
    ];
  } else {
    kind = 'report17';
    title = `🏦 ${md} 法人籌碼更新｜外資 ${sign(b.foreign, 1)} 億・投信 ${sign(b.trust, 1)} 億`;
    lines = [
      b.best.length ? '一K站三線＋投信買超：' + names(b.best) : '一K站三線＋投信買超：今日無',
      b.latent.length ? '潛伏股＋投信買超：' + names(b.latent) : '',
      '主力鎖碼、三大法人、千張大戶都更新了',
    ];
  }
  const key = resultsKey();
  if (!key) throw new Error('沒有比賽金鑰（RESULTS_KEY）');
  const res = await fetch(`${API}/api/push/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Results-Key': key },
    body: JSON.stringify({ kind, date: b.date, title, body: lines.filter(Boolean).join('\n'), only }),
  });
  console.log('推播', kind, res.status, JSON.stringify(await res.json()));
})().catch((e) => {
  console.error('推播失敗：', e.message);
  process.exit(1);
});
