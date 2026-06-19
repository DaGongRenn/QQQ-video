// capture.js —— 渲染两版 15s 气泡动画:英文名(out_en.mp4) + 中文名(out_cn.mp4)
// 数据来源:Finnhub 实时报价(环境变量 FINNHUB_KEY);拿不到则用 HTML 内置数据。
// 两版的涨跌幅(p)完全相同 → 气泡布局一致,只有名字不同。
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const HTML = 'file://' + path.resolve(__dirname, '美股30气泡涨跌动画-product1.html').replace(/\\/g, '/');
const FPS = 60, DURATION = 15000;                 // 一个完整循环 = 15s
const FRAMES = Math.round(FPS * DURATION / 1000); // 900 帧

// 与 HTML 内 FALLBACK 一致的 30 只标的
const SYMBOLS = ['MU','LRCX','AMAT','AMD','APP','ASML','PLTR','NVDA','AVGO','DDOG',
  'TSLA','SNPS','TXN','NFLX','PANW','MSFT','MELI','AMZN','GOOGL','META',
  'INTU','BKNG','AAPL','COST','ISRG','WMT','VRTX','REGN','GILD','ALNY'];

async function fetchLive(key) {
  if (!key) return null;
  const quote = async (s) => {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${key}`);
    if (!r.ok) throw new Error(`${s} HTTP ${r.status}`);
    return r.json();
  };
  try {
    const [stocks, qqq] = await Promise.all([
      Promise.all(SYMBOLS.map(async s => {
        const j = await quote(s);
        if (typeof j.dp !== 'number') throw new Error(`${s} 无 dp 字段`);
        return { n: s, p: Math.round(j.dp * 10) / 10, t: j.t };
      })),
      quote('QQQ').catch(() => null)   // 右上角指数,失败则保留 HTML 内置值
    ]);
    const ts = Math.max(...stocks.map(x => x.t || 0));
    const d = ts ? new Date(ts * 1000) : new Date();
    const date = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    const index = (qqq && typeof qqq.dp === 'number')
      ? { name: '纳指100·QQQ', value: '$' + (qqq.c || 0).toFixed(2), chg: (qqq.dp >= 0 ? '+' : '') + qqq.dp.toFixed(1) + '%' }
      : null;
    return { stocks: stocks.map(x => ({ n: x.n, p: x.p })), date, index };
  } catch (e) {
    console.warn('⚠ 实时数据获取失败,回退到内置数据:', e.message);
    return null;
  }
}

async function renderVersion(page, canvas, stocks, outPath) {
  await page.evaluate((stocks) => buildLayout(stocks), stocks);   // 按本版名字重排
  const ff = spawn(ffmpegPath, [
    '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-crf', '20', '-movflags', '+faststart', outPath
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let f = 0; f < FRAMES; f++) {
    const t = f * (1000 / FPS);
    await page.evaluate((t) => {                 // 复刻 frame() 绘制,用注入的时间
      drawBg(); drawHeader(t);
      byR.forEach(it => drawBubble(it, t));
      drawDecor(t);
    }, t);
    const buf = await canvas.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) process.stdout.write(`\r  ${path.basename(outPath)} ${f}/${FRAMES}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`\r✓ ${path.basename(outPath)} (${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)        `);
}

(async () => {
  const live = await fetchLive(process.env.FINNHUB_KEY);
  console.log(live ? `✓ 实时数据 ${live.date}` : '· 使用内置数据');
  const cnMap = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'names-cn.json'), 'utf8'));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox',
           '--force-device-scale-factor=1', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(HTML, { waitUntil: 'networkidle0' });
  await page.waitForFunction('typeof byR !== "undefined" && byR.length > 0');

  // 冻结页面自带循环;写入实时日期 / 来源 / 指数
  await page.evaluate((live) => {
    paused = true;
    if (live) {
      META_SRC = '实时'; META_DATE = live.date;
      if (live.index) { INDEX.name = live.index.name; INDEX.value = live.index.value; INDEX.chg = live.index.chg; }
    }
  }, live);

  // 英文版用实时(或内置)数据;中文版仅把名字按映射替换,p 不变
  const builtin = await page.evaluate(() => FALLBACK);
  const stocksEN = live ? live.stocks : builtin;
  const stocksCN = stocksEN.map(s => ({ n: cnMap[s.n] || s.n, p: s.p }));

  const canvas = await page.$('#c');
  await renderVersion(page, canvas, stocksEN, path.resolve(__dirname, 'out_en.mp4'));
  await renderVersion(page, canvas, stocksCN, path.resolve(__dirname, 'out_cn.mp4'));

  const shownDate = await page.evaluate(() => META_DATE);
  fs.writeFileSync(path.resolve(__dirname, 'date.txt'), shownDate);
  await browser.close();
  console.log(`完成,日期 ${shownDate}`);
})().catch(e => { console.error(e); process.exit(1); });
