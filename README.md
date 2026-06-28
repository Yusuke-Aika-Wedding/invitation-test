# Yusuke & Aika Wedding Invitation

GitHub Pages + Google Apps Script + Googleスプレッドシートで動く、結婚式Web招待状です。

## できること

- スマホ・PC両対応のWeb招待状
- 最初に新郎新婦メッセージページを表示
- メッセージページをタップすると招待状ページへ遷移
- 回答前・回答後でメッセージを自動切替
- 室内写真をメッセージ背景に表示
- 屋外写真を招待状上部に表示
- 2027年3月21日10:00までの秒単位カウントダウン
- キンプトン新宿東京のGoogleマップ表示
- 行き方動画の仮動画入り
- 氏名・メールアドレス・挙式出欠・披露宴出欠・アレルギー入力
- スプレッドシートへの回答保存
- 回答確認メールの自動送信
- 1週間前・1日前のリマインドメール自動送信

## デザイン仕様

- 英語見出し：`Alex Brush` を使用。筆記体らしい特別感を保ちつつ、比較的読みやすい上品な表示
- 数字：`Old Standard TT`
- 日本語本文：`Noto Serif JP`
- 色：ワインレッド、シャンパン、アイボリーを基調
- フェードイン演出あり

## フォルダ構成

```text
invitation-test/
├── index.html
├── kekkon-hanako/index.html      # 結婚太郎様
├── konninn-hanako/index.html     # 婚姻花子様
├── taro.html                     # 旧URL互換リダイレクト
├── hanako.html                   # 旧URL互換リダイレクト
├── css/style.css
├── js/config.js
├── js/script.js
├── assets/message-bg.jpg
├── assets/hero-outdoor.jpg
├── assets/access-poster.jpg
├── assets/access-placeholder.mp4
├── gas/Code.gs
├── gas/appsscript.json
└── docs/SETUP_GUIDE.md
```

## ゲスト専用URL

GitHub Pages公開後、以下のURLになります。

- 結婚太郎様  
  `https://Yusuke-Aika-Wedding.github.io/invitation-test/kekkon-hanako/`

- 婚姻花子様  
  `https://Yusuke-Aika-Wedding.github.io/invitation-test/konninn-hanako/`

## スプレッドシート列

既存の列に合わせています。

| 列 | 内容 |
|---|---|
| A | URL |
| B | ゲスト名 |
| C | メールアドレス |
| D | 挙式出欠 |
| E | 披露宴出欠 |
| F | アレルギー |
| G | 回答日時 |
| H | 確認メール送信日時 |
| I | 1週間前リマインド送信日時 |
| J | 前日リマインド送信日時 |
| K | 更新日時 |
| L | 招待状URL |

## 最短セットアップ

詳しい手順は `docs/SETUP_GUIDE.md` を確認してください。

1. このフォルダの中身を、GitHubリポジトリ `invitation-test` の直下にアップロードします。
2. GitHub Pages を `main` / `/root` で有効化します。
3. 添付スプレッドシートで `拡張機能` → `Apps Script` を開きます。
4. `gas/Code.gs` の全文を貼り付けます。
5. `appsscript.json` を表示し、`gas/appsscript.json` の全文を貼り付けます。
6. Apps Scriptで `setup()` を1回実行します。
7. Apps Scriptを「ウェブアプリ」としてデプロイします。
8. 取得したWebアプリURLを `js/config.js` の `gasWebAppUrl` に貼ります。
9. `js/config.js` をGitHubに再アップロードします。
10. ゲスト専用URLで動作確認します。
