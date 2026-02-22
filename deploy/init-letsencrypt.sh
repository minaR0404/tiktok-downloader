#!/bin/bash
# Let's Encrypt 証明書の初回取得スクリプト
set -e

DOMAIN="$1"
EMAIL="$2"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "使い方: ./init-letsencrypt.sh <ドメイン名> <メールアドレス>"
  echo "例: ./init-letsencrypt.sh example.com user@example.com"
  exit 1
fi

echo "=== ドメイン: $DOMAIN ==="
echo "=== メール: $EMAIL ==="

# 認証用ディレクトリ作成
mkdir -p certbot/www certbot/conf

# HTTPのみのNginxで起動（証明書取得用）
echo "=== Nginxを起動 ==="
sudo docker-compose up -d nginx

# Certbotで証明書を取得
echo "=== SSL証明書を取得中 ==="
sudo docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# nginx-ssl.conf にドメインを埋め込んでnginx.confに上書き
echo "=== SSL設定を有効化 ==="
sed "s/\${DOMAIN}/$DOMAIN/g" deploy/nginx-ssl.conf > deploy/nginx.conf

# 全サービスを再起動（SSL有効化）
echo "=== 全サービスを再起動 ==="
sudo docker-compose down
sudo docker-compose up -d

echo ""
echo "=== HTTPS設定完了 ==="
echo "https://$DOMAIN でアクセスできます"
