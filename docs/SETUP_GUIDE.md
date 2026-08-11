# Wedding Invitation セットアップ手順

このサイトは、GitHub Pagesを画面、Google Apps Script（GAS）を処理、Googleスプレッドシートをデータ保存先として使います。

## 0. 使用するもの

- GitHubユーザー名：`Yusuke-Aika-Wedding`
- リポジトリ名：`invitation-test`
- 公開URL：`https://Yusuke-Aika-Wedding.github.io/invitation-test/`
- スプレッドシート：`https://docs.google.com/spreadsheets/d/1micDJFsf6ktwZrq_tlIz9TiC4PjbBbv-7dlWgbhMjbs/edit`
- 使用するシート：`ゲスト一覧`
- ID列：A列

ゲストごとのフォルダやURLは作りません。全員が同じ公開URLへアクセスし、最初にIDを入力します。

## 1. スプレッドシートを確認する

「ゲスト一覧」シートの1行目は、次の列構成で使用します。

| 列 | 見出し | 用途 |
|---|---|---|
| A | ID | ゲストへ個別に伝えるID |
| B | ゲスト名 | ID認証後に画面へ表示 |
| C | メールアドレス | 回答時に保存 |
| D | 挙式出欠 | 出席／欠席 |
| E | 披露宴出欠 | 出席／欠席 |
| F | アレルギー | 「なし」または具体的な食材 |
| G | 回答日時 | GASが自動入力 |
| H | 確認メール送信日時 | GASが自動入力 |
| I | 1週間前リマインド送信日時 | GASが自動入力 |
| J | 前日リマインド送信日時 | GASが自動入力 |
| K | 更新日時 | GASが自動入力 |
| L | 招待状URL | 共通URLをGASが自動入力 |
| M | メッセージ | 任意回答 |
| N | 参加ありがとうメール送信日時 | GASが自動入力 |

現在A〜K列まである場合でも問題ありません。後述の `setup` を実行するとL〜N列が追加されます。

### ID作成時の注意

- A列のIDはゲストごとに重複しない文字列にします。
- 推測されにくいように、英大文字・英小文字・数字を混ぜた8〜12文字程度を推奨します。
- IDは大文字・小文字を区別します。
- 空白や `/` は使わないでください。

## 2. GASプロジェクトを作成する

1. Googleドライブで「新規」→「その他」→「Google Apps Script」を開きます。
2. `gas/Code.gs` の内容を、GASの `Code.gs` へすべて貼り付けます。
3. GAS左側の歯車を開き、「appsscript.json マニフェスト ファイルをエディタで表示する」をONにします。
4. `gas/appsscript.json` の内容を、GASの `appsscript.json` へすべて貼り付けます。
5. 保存します。

`Code.gs` には、指定されたスプレッドシートIDとシート名が設定済みです。

## 3. 初期設定を1回実行する

1. GAS上部の関数一覧から `setup` を選びます。
2. 「実行」を押します。
3. 初回のみGoogleの権限確認を承認します。

`setup` は次の処理を行います。

- A〜N列の見出しを整える
- L列へ共通の招待状URLを入れる
- 表の見た目を整える
- 毎日9時のリマインド確認トリガーを作る
- 毎日15時の御礼メール確認トリガーを作る

## 4. GASをウェブアプリとしてデプロイする

1. GAS右上の「デプロイ」→「新しいデプロイ」を押します。
2. 種類は「ウェブアプリ」を選びます。
3. 実行ユーザーは「自分」を選びます。
4. アクセスできるユーザーは「全員」を選びます。
5. 「デプロイ」を押します。
6. 表示された `https://script.google.com/macros/s/.../exec` 形式のURLをコピーします。

コードを後日変更した場合は、「デプロイを管理」から既存デプロイの新しいバージョンを反映してください。

## 5. GitHub側へGAS URLを設定する

`js/config.js` を開き、次の値をコピーしたGASのウェブアプリURLへ置き換えます。

```js
gasWebAppUrl: 'PASTE_YOUR_GAS_WEB_APP_URL_HERE',
```

引用符は残してください。

## 6. GitHubへアップロードする

1. GitHubで `Yusuke-Aika-Wedding/invitation-test` リポジトリを開きます。
2. `Add file` → `Upload files` を選びます。
3. ZIPを解凍し、`invitation-test` フォルダの「中身」をすべてアップロードします。
4. `Commit changes` を押します。

フォルダそのものを入れ子にせず、リポジトリ直下に `index.html` がある状態にしてください。

## 7. GitHub Pagesを有効化する

1. リポジトリの `Settings` → `Pages` を開きます。
2. `Source` を `Deploy from a branch` にします。
3. Branchを `main`、フォルダを `/root` にします。
4. `Save` を押します。
5. 数分後、次のURLを開きます。

`https://Yusuke-Aika-Wedding.github.io/invitation-test/`

## 8. 動作確認する

次の順番で確認してください。

1. 初回アクセスでID入力画面が出る。
2. A列にないIDでは開けない。
3. A列にあるIDでは、B列のゲスト名が表示される。
4. 同じ端末・同じブラウザで再読込すると、ID入力が省略される。
5. 右上メニューに「招待状ページ」「2人の紹介ページ」がある。
6. 食物アレルギーは「あり」「なし」の選択が必須になっている。
7. 「あり」を選んだときだけ詳細欄が表示され、詳細入力も必須になる。
8. 出欠を送信するとC〜N列へ反映され、確認メールが届く。
9. 右上メニューの「IDを変更する」で保存済みIDを解除できる。

ブラウザのシークレットウィンドウを使うと、初回アクセスの確認を繰り返せます。

## 9. 「本当の最後の謎」の表示日時を変える

`js/config.js` の次の1行を変更します。

```js
finalPuzzleMenuOpenIso: '2026-08-11T18:00:00+09:00',
```

- 現在の設定：2026年8月11日18:00（日本時間）
- 指定時刻より前：メニューに表示されず、URLのハッシュを直接指定しても招待状ページへ戻る
- 指定時刻以降：メニューに「本当の最後の謎ページ」が現れる

日時は `YYYY-MM-DDTHH:mm:ss+09:00` 形式で入力します。

## 10. 2人の紹介・最後の謎へ内容を追加する

現在はどちらも白紙です。`index.html` の次の要素内へHTMLを追加してください。

- 2人の紹介：`<div class="blank-card" aria-label="2人の紹介ページ">...</div>`
- 最後の謎：`<div id="finalPuzzleContent" class="blank-card">...</div>`

## 11. 写真・動画を差し替える

- ID入力・オープニング背景：`assets/gallery-1.jpg`
- 招待状上部の写真：`assets/gallery-2.jpg`、`gallery-3.jpg`、`gallery-4.jpg`
- 会場までの動画：`assets/access-placeholder.mp4`
- 動画ポスター：`assets/access-poster.jpg`

同じファイル名で置き換えると、HTMLやCSSを変更せずに差し替えられます。

## 12. 自動メールをテストする

GASの関数一覧から、必要に応じて次のテスト関数を実行できます。

- `testReminder7Days`：1週間前メールをテスト送信
- `testReminder1Day`：前日メールをテスト送信
- `testAfterReceptionThanksEmails`：御礼メールをテスト送信

テスト関数は条件を一部省略して送信します。実データのメールアドレスへ届くため、実行前に対象を確認してください。
