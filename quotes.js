// 只更新頁面置頂的指數列（加權、台指期、日經、KOSPI、費半），不重跑整份報告
// 排程：盤中每 15 分鐘、夜盤每 30 分鐘
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getTopBar } = require('./macro.js');
const { renderTopBar } = require('./screener.js');

const ROOT = __dirname;
const LOCK = path.join(ROOT, 'running.flag');

(async () => {
  // 完整報告正在跑就跳過，避免同時寫入、上傳
  if (fs.existsSync(LOCK) && Date.now() - fs.statSync(LOCK).mtimeMs < 20 * 60000) {
    console.log('完整報告執行中，跳過');
    return;
  }
  const bar = renderTopBar(await getTopBar());
  const site = path.join(ROOT, 'site');
  const latest = fs.readdirSync(path.join(site, 'reports')).filter((f) => /^\d{8}\.html$/.test(f)).sort().pop();
  const files = [path.join(site, 'index.html'), path.join(ROOT, '最新選股.html'), latest && path.join(site, 'reports', latest)].filter(Boolean);
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const html = fs.readFileSync(f, 'utf8');
    if (!html.includes('<!--TOPBAR-->')) continue;
    fs.writeFileSync(f, html.replace(/<!--TOPBAR-->[\s\S]*?<!--\/TOPBAR-->/, () => bar));
  }
  const git = (c) => execSync(`git ${c}`, { cwd: site, stdio: 'pipe' }).toString();
  if (!git('status --porcelain').trim()) return console.log('沒有變動');
  git('add -A');
  git('commit -q -m "update quotes"');
  git('push -q origin main');
  console.log('置頂報價已更新', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
})().catch((e) => {
  console.error('報價更新失敗：', e.message);
  process.exit(1);
});
