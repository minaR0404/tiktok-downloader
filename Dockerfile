FROM node:20-slim

WORKDIR /app

# 依存パッケージインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl ca-certificates python3 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# yt-dlpをダウンロード
RUN curl -fSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# パッケージインストール
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# アプリケーションコード
COPY server.js ./
COPY public/ ./public/

# ダウンロード用一時ディレクトリ
RUN mkdir -p downloads

ENV PORT=3000
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
