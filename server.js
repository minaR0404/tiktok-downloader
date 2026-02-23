const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const YTDlpWrap = require("yt-dlp-wrap").default;

const app = express();
const PORT = process.env.PORT || 3000;

// yt-dlpバイナリのパス
const YT_DLP_PATH = process.env.YT_DLP_PATH || path.join(__dirname, "bin", "yt-dlp.exe");
let ytDlp;

// プロキシ信頼（ALB/Nginx背後で動作する場合）
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);

// セキュリティヘッダー
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ミドルウェア
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ヘルスチェック
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// レートリミット（1分あたり15リクエスト）
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || "15", 10),
  message: { error: "リクエストが多すぎます。しばらく待ってから再試行してください。" },
});
app.use("/api/", limiter);

// ダウンロードフォルダ
const DOWNLOADS_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// 対応SNSプラットフォーム
const SUPPORTED_PLATFORMS = [
  {
    name: "TikTok",
    hostnames: ["www.tiktok.com", "tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  },
  {
    name: "Twitter",
    hostnames: ["twitter.com", "www.twitter.com", "x.com", "www.x.com", "mobile.twitter.com"],
  },
  {
    name: "Instagram",
    hostnames: ["www.instagram.com", "instagram.com"],
  },
];

// URLバリデーション（対応SNSかチェック）
function detectPlatform(url) {
  try {
    const parsed = new URL(url);
    for (const platform of SUPPORTED_PLATFORMS) {
      if (platform.hostnames.includes(parsed.hostname)) {
        return platform.name;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// POST /api/info — 動画情報取得
app.post("/api/info", async (req, res) => {
  const { url } = req.body;
  const platform = url ? detectPlatform(url) : null;

  if (!url || !platform) {
    return res.status(400).json({ error: "対応していないURLです。TikTok・Twitter・InstagramのURLを入力してください。" });
  }

  try {
    const stdout = await ytDlp.execPromise(["--dump-json", "--no-warnings", url]);
    const info = JSON.parse(stdout);

    res.json({
      platform,
      title: info.title || info.description || "無題",
      author: info.uploader || info.creator || "不明",
      thumbnail: info.thumbnail || null,
      duration: info.duration || 0,
      description: info.description || "",
      like_count: info.like_count || 0,
      view_count: info.view_count || 0,
    });
  } catch (err) {
    console.error("Info error:", err.message);
    res.status(500).json({ error: "動画情報の取得に失敗しました。URLを確認してください。" });
  }
});

// GET /api/thumbnail — サムネイル画像プロキシ（Instagram等のCORS対策）
app.get("/api/thumbnail", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).end();

  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) return res.status(response.status).end();

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch {
    res.status(502).end();
  }
});

// POST /api/download — 動画ダウンロード
app.post("/api/download", async (req, res) => {
  const { url } = req.body;
  const platform = url ? detectPlatform(url) : null;

  if (!url || !platform) {
    return res.status(400).json({ error: "対応していないURLです。TikTok・Twitter・InstagramのURLを入力してください。" });
  }

  const filename = `${platform.toLowerCase()}_${Date.now()}.mp4`;
  const filepath = path.join(DOWNLOADS_DIR, filename);

  try {
    await ytDlp.execPromise([
      "-f", "best[ext=mp4]/best",
      "--merge-output-format", "mp4",
      "--max-filesize", "100M",
      "-o", filepath,
      "--no-warnings",
      url,
    ]);

    if (!fs.existsSync(filepath)) {
      return res.status(500).json({ error: "ダウンロードに失敗しました。" });
    }

    res.download(filepath, filename, (err) => {
      fs.unlink(filepath, () => {});
      if (err && !res.headersSent) {
        res.status(500).json({ error: "ファイルの送信に失敗しました。" });
      }
    });
  } catch (err) {
    console.error("Download error:", err.message);
    fs.unlink(filepath, () => {});
    res.status(500).json({ error: "動画のダウンロードに失敗しました。" });
  }
});

// 古い一時ファイルを5分ごとにクリーンアップ
const CLEANUP_INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MS || String(5 * 60 * 1000), 10);
setInterval(() => {
  const now = Date.now();
  fs.readdir(DOWNLOADS_DIR, (err, files) => {
    if (err) return;
    for (const file of files) {
      const fp = path.join(DOWNLOADS_DIR, file);
      fs.stat(fp, (statErr, stats) => {
        if (statErr) return;
        if (now - stats.mtimeMs > CLEANUP_INTERVAL) {
          fs.unlink(fp, () => {});
        }
      });
    }
  });
}, CLEANUP_INTERVAL);

// yt-dlpバイナリのセットアップとサーバー起動
async function start() {
  // binフォルダ作成
  const binDir = path.join(__dirname, "bin");
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // yt-dlpバイナリがなければダウンロード
  if (!fs.existsSync(YT_DLP_PATH)) {
    console.log("yt-dlpをダウンロード中...");
    await YTDlpWrap.downloadFromGithub(YT_DLP_PATH);
    console.log("yt-dlpのダウンロード完了");
  }

  ytDlp = new YTDlpWrap(YT_DLP_PATH);

  // バージョン確認
  const version = await ytDlp.execPromise(["--version"]);
  console.log(`yt-dlp version: ${version.trim()}`);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`サーバー起動: http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("起動エラー:", err.message);
  process.exit(1);
});
