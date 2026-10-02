// 收盤總結（三點：大盤、法人、族群）：用當天真實數據套進幽默模板，依日期挑句子（同一天結果固定）

function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const n0 = (v) => Math.round(v).toLocaleString();
const p2 = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const abs1 = (v) => Math.abs(v).toFixed(1);

// 依加權漲跌幅分級的開場
const HEADLINE = [
  [3, [
    '加權大漲 {pct}，今天連公司樓下的清潔阿姨都在聊台積電，該擔心的人自己知道。',
    '加權噴 {pct}，散戶覺得自己是巴菲特，明天開盤再來確認一下。',
    '{pct}！券商 App 今天被打開的次數，大概跟你打開老闆訊息的次數成反比。',
  ]],
  [1.2, [
    '加權漲 {pct}，紅通通一片，今天下班可以點大杯手搖不加價。',
    '大盤上漲 {pct}，帳面數字很漂亮，記得那是「帳面」。',
    '加權收紅 {pct}，主力心情好，散戶心情更好，至於明天誰買單，明天再說。',
  ]],
  [0.3, [
    '加權小漲 {pct}，漲得很有禮貌，不吵不鬧，就像你上班摸魚一樣低調。',
    '收紅 {pct}，不多不少，剛好夠你跟同事說「我今天有賺」。',
    '加權 {pct}，溫溫的，像公司的咖啡，喝了沒感覺但不喝又怪怪的。',
  ]],
  [-0.3, [
    '加權 {pct}，平盤附近走了一整天，跟你上班一樣，人在心不在。',
    '今天大盤 {pct}，盤整到連當沖仔都想去考公務員。',
    '{pct}，幾乎沒動，主力今天應該是請特休。',
  ]],
  [-1.2, [
    '加權跌 {pct}，小跌而已，跟你說「回檔是健康的」的那個人，自己已經先跑了。',
    '收黑 {pct}，不痛不癢，但套在高點的朋友今天應該已經開始研究存股了。',
    '加權 {pct}，綠綠的，今天適合吃沙拉，配合一下盤面。',
  ]],
  [-3, [
    '加權重挫 {pct}，今天辦公室特別安靜，因為大家都在偷看庫存。',
    '跌 {pct}，抄底的朋友記得帶安全帽，這裡是半山腰不是山腳。',
    '大盤 {pct}，韭菜們集體進入「長期投資」模式，也就是不想看了。',
  ]],
  [-Infinity, [
    '加權崩 {pct}，今天的盤面建議十八歲以下及心臟病患者勿看。',
    '跌 {pct}，信用帳戶今晚會打電話來關心你，記得接。',
    '{pct}……這不是回檔，這是蹦極跳，而且繩子還沒綁好。',
  ]],
];

function buildRoast(ctx) {
  const r = rng(ctx.date);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const lines = [];

  // 1. 大盤
  if (ctx.twii) {
    const tier = HEADLINE.find(([min]) => ctx.twii.pct >= min)[1];
    lines.push(pick(tier).replace('{pct}', p2(ctx.twii.pct)) + `（收 ${n0(ctx.twii.close)} 點）`);
  }

  // 4. 法人
  if (ctx.flows) {
    const f = ctx.flows.foreign, t = ctx.flows.trust;
    let s = f >= 0
      ? pick([`外資買超 ${abs1(f)} 億，金主爸爸回來了，大家趕快站好。`, `外資今天掏出 ${abs1(f)} 億買台股，台幣大概也偷偷笑了。`])
      : pick([`外資賣超 ${abs1(f)} 億，提款機模式啟動，ATM 就是我們。`, `外資倒貨 ${abs1(f)} 億，他們賣得很開心，接的人也覺得自己很勇敢。`]);
    s += t >= 0 ? ` 投信買超 ${abs1(t)} 億，作帳行情的味道飄出來了。` : ` 投信也賣 ${abs1(t)} 億，連自家人都不挺。`;
    lines.push(s);
  }

  // 6. 族群
  if (ctx.best && ctx.worst) {
    lines.push(pick([
      `最強族群是「${ctx.best.name}」${p2(ctx.best.r1)}，最慘的是「${ctx.worst.name}」${p2(ctx.worst.r1)}，同一個盤，兩種人生。`,
      `「${ctx.best.name}」噴 ${p2(ctx.best.r1)}，「${ctx.worst.name}」${p2(ctx.worst.r1)}，買錯族群的朋友，今晚的便當請加滷蛋安慰自己。`,
      `今天贏家是「${ctx.best.name}」${p2(ctx.best.r1)}，輸家是「${ctx.worst.name}」${p2(ctx.worst.r1)}，別問我明天會怎樣，我只是個網頁。`,
    ]));
  }

  return lines;
}

module.exports = { buildRoast };
