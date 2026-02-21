const urlInput = document.getElementById("url-input");
const fetchBtn = document.getElementById("fetch-btn");
const errorMsg = document.getElementById("error-msg");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const downloadBtn = document.getElementById("download-btn");
const downloadLoading = document.getElementById("download-loading");

let currentUrl = "";

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCount(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

// 情報取得
fetchBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  hideError();

  if (!url) {
    showError("URLを入力してください。");
    return;
  }

  fetchBtn.disabled = true;
  result.classList.add("hidden");
  loading.classList.remove("hidden");

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "エラーが発生しました。");
      return;
    }

    currentUrl = url;

    document.getElementById("thumbnail").src = data.thumbnail || "";
    document.getElementById("video-title").textContent = data.title;
    document.getElementById("video-author").textContent = data.author;
    document.getElementById("video-duration").textContent = data.duration
      ? `${formatDuration(data.duration)}`
      : "";
    document.getElementById("video-views").textContent = data.view_count
      ? `${formatCount(data.view_count)} 再生`
      : "";
    document.getElementById("video-likes").textContent = data.like_count
      ? `${formatCount(data.like_count)} いいね`
      : "";
    document.getElementById("video-desc").textContent = data.description || "";

    result.classList.remove("hidden");
  } catch {
    showError("サーバーに接続できませんでした。");
  } finally {
    loading.classList.add("hidden");
    fetchBtn.disabled = false;
  }
});

// Enterキーで取得
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchBtn.click();
});

// ダウンロード
downloadBtn.addEventListener("click", async () => {
  if (!currentUrl) return;

  downloadBtn.disabled = true;
  downloadLoading.classList.remove("hidden");

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl }),
    });

    if (!res.ok) {
      const data = await res.json();
      showError(data.error || "ダウンロードに失敗しました。");
      return;
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tiktok_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch {
    showError("ダウンロード中にエラーが発生しました。");
  } finally {
    downloadBtn.disabled = false;
    downloadLoading.classList.add("hidden");
  }
});
