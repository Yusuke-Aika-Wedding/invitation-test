# Yusuke & Aika Wedding Invitation

GitHub Pages、Google Apps Script（GAS）、Googleスプレッドシートで動く結婚式Web招待状です。

## 公開URL

`https://Yusuke-Aika-Wedding.github.io/invitation-test/`

サイトはゲスト全員で共通です。ゲストは最初に招待状記載のIDを入力し、GASがスプレッドシート「ゲスト一覧」シートのA列と照合します。認証済みIDはブラウザの `localStorage` に保存されるため、同じ端末・同じブラウザでは2回目以降の入力を省略できます。

## 主な機能

- 共通URL＋ID認証
- ゲスト名を反映したオープニングメッセージ
- スマートフォン・PC対応のレスポンシブデザイン
- フェード表示、桜の花びら、5秒ごとの写真スライド
- 2027年3月21日10:00までのカウントダウン
- 会場案内、Googleマップ、行き方動画
- 挙式・披露宴の出欠フォーム
- 食物アレルギーの「あり／なし」必須選択と、「あり」の場合だけ表示する詳細欄
- GASによる回答保存、確認メール、リマインドメール、御礼メール
- 招待状ページ、白紙の2人紹介ページ
- 2026年8月11日18:00（日本時間）からメニューに現れる「本当の最後の謎」ページ

## フォルダ構成

```text
invitation-test/
├─ index.html
├─ 404.html
├─ css/style.css
├─ js/config.js
├─ js/script.js
├─ assets/
├─ gas/Code.gs
├─ gas/appsscript.json
├─ docs/SETUP_GUIDE.md
├─ .nojekyll
└─ robots.txt
```

## 最初に行うこと

1. `gas/Code.gs` と `gas/appsscript.json` をGASへ貼り付けます。
2. GASで `setup` を1回実行します。
3. GASをウェブアプリとしてデプロイします。
4. 発行されたURLを `js/config.js` の `gasWebAppUrl` に貼り付けます。
5. このフォルダの中身をGitHubリポジトリ `Yusuke-Aika-Wedding/invitation-test` のルートへアップロードします。

詳しい手順は `docs/SETUP_GUIDE.md` をご覧ください。

## 日時の変更

「本当の最後の謎」を表示する日時は、`js/config.js` の次の1行だけで変更できます。

```js
finalPuzzleMenuOpenIso: '2026-08-11T18:00:00+09:00',
```

日本時間を表す `+09:00` を残し、`YYYY-MM-DDTHH:mm:ss+09:00` 形式で指定してください。

## 写真・動画

- ID入力・オープニング背景：`assets/gallery-1.jpg`
- 招待状上部の写真：`assets/gallery-2.jpg`〜`gallery-4.jpg`
- 行き方動画：`assets/access-placeholder.mp4`
- 動画のポスター：`assets/access-poster.jpg`

行き方動画は、同じファイル名で差し替えればHTMLの変更は不要です。
