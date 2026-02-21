FROM node:20-slim

WORKDIR /app

# yt-dlpの依存（ffmpeg）とyt-dlp本体をインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl python3 && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

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
