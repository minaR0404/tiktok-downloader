#!/bin/bash
set -e

echo "=== Dockerインストール ==="
sudo dnf update -y
sudo dnf install -y docker git docker-buildx-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

echo "=== Docker Composeインストール ==="
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "=== アプリをクローン&ビルド ==="
cd ~
if [ -d tiktok-downloader ]; then
  rm -rf tiktok-downloader
fi
git clone https://github.com/minaR0404/tiktok-downloader.git
cd tiktok-downloader

# newgrpでdockerグループを即時反映してビルド実行
sudo docker-compose up -d --build

echo ""
echo "=== デプロイ完了 ==="
echo "http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4) でアクセスできます"
