# デプロイ手順

## 前提条件

- EC2インスタンス (Amazon Linux 2023) が起動済み
- セキュリティグループでSSH(22)、HTTP(80)、HTTPS(443)が開放済み
- `.pem` キーファイルが `~/.ssh/` に配置済み
- 独自ドメインを取得済み（HTTPS設定時に必要）

## 1. SSH接続

```bash
ssh -i ~/.ssh/sns-downloader.pem ec2-user@<パブリックIP>
```

## 2. セットアップ実行

EC2内で以下を実行:

```bash
curl -sL https://raw.githubusercontent.com/minaR0404/sns-downloader/main/deploy/setup.sh | bash
```

## 3. HTTPS設定

### 3-1. ドメインのDNS設定

ドメイン管理画面でAレコードにEC2のパブリックIPを登録する。

### 3-2. SSL証明書の取得

```bash
cd ~/sns-downloader
bash deploy/init-letsencrypt.sh <ドメイン名> <メールアドレス>
```

例:
```bash
bash deploy/init-letsencrypt.sh example.com user@example.com
```

### 3-3. 動作確認

ブラウザで `https://<ドメイン名>` にアクセス。
`http://` でアクセスすると自動的に `https://` にリダイレクトされる。

## コンテナ操作

```bash
# ログ確認
cd ~/sns-downloader && sudo docker-compose logs -f

# 再起動
cd ~/sns-downloader && sudo docker-compose restart

# 停止
cd ~/sns-downloader && sudo docker-compose down

# コード更新時の再デプロイ
cd ~/sns-downloader && git pull && sudo docker-compose up -d --build
```

## SSL証明書の更新

証明書はCertbotコンテナが12時間ごとに自動更新を確認する。手動で更新する場合:

```bash
cd ~/sns-downloader && sudo docker-compose run --rm certbot renew
sudo docker-compose exec nginx nginx -s reload
```
