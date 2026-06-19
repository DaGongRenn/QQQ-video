// preview.js —— 本地秒出两版静帧预览(只截 1 帧,不经过 ffmpeg)
// 用途:推到 GitHub 前快速看一眼中英两版长什么样。产物 preview_en.png / preview_cn.png
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const HTML = 'file://' + path.resolve(__dirname, '美股30气泡涨跌动画-product1.html').replace(/\\/g, '/');
const T = 3000; // 取第 3 秒:气泡已落位、数值已滚完

(async () => {
  const cnMap = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'names-cn.json'), 'utf8'));
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto(HTML, { waitUntil: 'networkidle0' });
  await page.waitForFunction('typeof byR !== "undefined" && byR.length > 0');
  await page.evaluate(() => { paused = true; });

  const builtin = await page.evaluate(() => FALLBACK);
  const canvas = await page.$('#c');
  const shot = async (stocks, out) => {
    await page.evaluate((s) => buildLayout(s), stocks);
    await page.evaluate((t) => { drawBg(); drawHeader(t); byR.forEach(it => drawBubble(it, t)); drawDecor(t); }, T);
    await canvas.screenshot({ path: path.resolve(__dirname, out) });
    console.log('✓', out);
  };
  await shot(builtin, 'preview_en.png');
  await shot(builtin.map(s => ({ n: cnMap[s.n] || s.n, p: s.p })), 'preview_cn.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
