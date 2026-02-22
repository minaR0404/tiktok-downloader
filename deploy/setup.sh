#!/bin/bash
set -e

echo "=== Dockerインストール ==="
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

echo "=== Docker Buildxインストール ==="
sudo mkdir -p /usr/libexec/docker/cli-plugins
BUILDX_URL=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep "browser_download_url.*linux-amd64\"" | cut -d '"' -f 4)
sudo curl -fSL "$BUILDX_URL" -o /usr/libexec/docker/cli-plugins/docker-buildx
sudo chmod +x /usr/libexec/docker/cli-plugins/docker-buildx

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
