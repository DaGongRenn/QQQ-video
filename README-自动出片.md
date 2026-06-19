# 每日美股气泡动画 · 自动出片(中英两版)

每天美股收盘后,GitHub 云端自动:**拉实时数据 → 渲染两版 15s 竖屏 mp4(英文名 + 中文名)→ 分两封邮件发到你邮箱**。
搭建一次,之后完全不用打开手机,打开邮箱下载就能发布。分两封是为了避开单封邮件附件上限。

## 文件说明

| 文件 | 作用 |
|---|---|
| `美股30气泡涨跌动画-product1.html` | 动画本体(无需改动) |
| `names-cn.json` | 股票代码 → 中文名映射(中文版用,可随意编辑) |
| `capture.js` | 无头 Chrome 渲染出 `out_en.mp4` + `out_cn.mp4` |
| `package.json` | 依赖:puppeteer + ffmpeg-static |
| `.github/workflows/daily.yml` | 每日定时任务 + 装中文字体 + 发两封邮件 |

> 中文版只改气泡上的**股票名字**;标题、指数、布局、数据与英文版完全一致。改名直接编辑 `names-cn.json` 即可。

---

## 一次性搭建(约 10 分钟)

### 第 1 步:拿密钥

1. **Finnhub Key**(实时行情,免费):注册 https://finnhub.io → 复制 API key。免费额度 60 次/分钟,够 30 只 + 指数。
2. **Gmail 应用专用密码**(用来发邮件):
   - 打开 https://myaccount.google.com/security 开启「两步验证」;
   - 进 https://myaccount.google.com/apppasswords 生成 16 位「应用专用密码」(形如 `abcd efgh ijkl mnop`)。
   - 这**不是**登录密码,是专给程序用的;去掉空格填也行。

### 第 2 步:建仓库并上传

GitHub 新建仓库(private 即可),把这些传上去:
`美股30气泡涨跌动画-product1.html`、`names-cn.json`、`capture.js`、`package.json`、`.github/` 整个目录。

### 第 3 步:配置 Secrets

仓库 **Settings → Secrets and variables → Actions → New repository secret**,加 3 个:

| 名称 | 值 |
|---|---|
| `FINNHUB_KEY` | Finnhub 的 key |
| `MAIL_USERNAME` | 你的 Gmail 地址(如 `gaox23684@gmail.com`) |
| `MAIL_PASSWORD` | 16 位应用专用密码 |

> 默认发件人=收件人=`MAIL_USERNAME`(发给自己)。想发别处,改 `daily.yml` 里两处 `to:`。

### 第 4 步:手动跑一次测试

仓库 **Actions** 标签 → 选 “每日美股气泡动画” → **Run workflow**。
约 2~3 分钟后,邮箱应收到**两封**邮件(英文名版 / 中文名版),各带一个 mp4 附件。Artifact 里也有备份。

搞定 ✅ 之后每个交易日自动发两封,你不用管。

---

## 改中文名

直接编辑 `names-cn.json`,左边是股票代码(别动),右边改成你想要的中文(尽量短,2~3 字最稳,长名在小气泡里可能放不下)。改完推到 GitHub 即生效。

## 定时时间说明

- `cron: '30 21 * * 1-5'` 是 **UTC**,对应北京时间约 **次日 05:30**,美股收盘后。改时间就改这行(注意 UTC;GitHub 定时偶尔延迟几分钟属正常)。
- 美股**节假日**当天没有新行情,会渲染出接近 0 的平淡画面。

## 本地测试(可选,Windows 自带中文字体可直接预览中文版)

```powershell
npm install
$env:FINNHUB_KEY = "你的key"   # 不设则用内置数据
node capture.js                # 产出 out_en.mp4 与 out_cn.mp4
```

## 常见问题

- **中文显示成方块 □**:云端缺中文字体所致——workflow 已自动装 `fonts-noto-cjk`;本地 Windows 自带雅黑不受影响。
- **邮件附件过大**:Gmail 上限 25MB,本视频通常 8~20MB。万一超了把 `capture.js` 里 `-crf 20` 调到 `24`。
- **收不到邮件**:多半是应用专用密码填错或没开两步验证;先看 Actions 里那步的红色报错,也查下垃圾箱。
- **中文名在小气泡里挤**:把 `names-cn.json` 里对应名字改短(如 4 字→2 字)。
- **自动发布到抖音/视频号**:无可靠官方接口、易被风控,不建议自动化。现已做到“成片自动到邮箱,你点一下发布”。
