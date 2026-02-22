# デプロイ手順

## 前提条件

- EC2インスタンス (Amazon Linux 2023) が起動済み
- セキュリティグループでSSH(22)とHTTP(80)が開放済み
- `.pem` キーファイルが `~/.ssh/` に配置済み

## 1. SSH接続

```bash
ssh -i ~/.ssh/tiktok-downloader.pem ec2-user@<パブリックIP>
```

## 2. セットアップ実行

EC2内で以下を実行:

```bash
curl -sL https://raw.githubusercontent.com/minaR0404/tiktok-downloader/main/deploy/setup.sh | bash
```

## 3. 動作確認

ブラウザで `http://<パブリックIP>` にアクセス

## コンテナ操作

```bash
# ログ確認
cd ~/tiktok-downloader && sudo docker-compose logs -f

# 再起動
cd ~/tiktok-downloader && sudo docker-compose restart

# 停止
cd ~/tiktok-downloader && sudo docker-compose down

# コード更新時の再デプロイ
cd ~/tiktok-downloader && git pull && sudo docker-compose up -d --build
```
