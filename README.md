# Bobブラウザ + 高速MultiTab Puppeteerプロキシ

## 概要
- BobブラウザUIで任意Webサイトを完全表示
- PuppeteerによるJS生成コンテンツ完全対応
- CSS内url(), 画像, フォーム, SPA対応
- 複数タブ同時表示可能
- Render Free/Starterプランでも安定

## デプロイ手順（Render）
1. GitHubにpush
2. Renderで「New → Web Service」
3. GitHubリポジトリ選択
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Environment: Node
7. Create Web Service → デプロイ完了
