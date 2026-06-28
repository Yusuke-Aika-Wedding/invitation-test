# セットアップ手順

## 1. GitHubにファイルを置く

1. ZIPを解凍します。
2. GitHubにログインします。
3. ユーザー `Yusuke-Aika-Wedding` で、リポジトリ `invitation-test` を開きます。
4. `Add file` → `Upload files` を押します。
5. 解凍した `invitation-test` フォルダの「中身」をすべてアップロードします。
   - `invitation-test` フォルダごと入れないでください。
   - `index.html` がリポジトリ直下に見える状態が正解です。
6. `Commit changes` を押します。

## 2. GitHub Pagesを有効化する

1. リポジトリの `Settings` を開きます。
2. 左メニューの `Pages` を開きます。
3. `Build and deployment` の `Source` を `Deploy from a branch` にします。
4. `Branch` を `main`、フォルダを `/root` にします。
5. `Save` を押します。
6. 数分待ちます。

公開URL：

```text
https://Yusuke-Aika-Wedding.github.io/invitation-test/
```

この時点では見た目の確認はできますが、フォーム送信・メール送信はまだ動きません。

## 3. Apps Scriptを準備する

1. スプレッドシート `結婚式` を開きます。
2. `拡張機能` → `Apps Script` を開きます。
3. `Code.gs` に、ZIP内 `gas/Code.gs` の全文を貼り付けます。
4. 左の歯車アイコン `プロジェクトの設定` を開きます。
5. `「appsscript.json」マニフェスト ファイルをエディタで表示する` をオンにします。
6. 左に表示された `appsscript.json` を開きます。
7. ZIP内 `gas/appsscript.json` の全文を貼り付けます。
8. 保存します。

## 4. setup()を1回実行する

1. Apps Script上部の関数選択で `setup` を選びます。
2. `実行` を押します。
3. 初回は権限承認が出ます。
4. 自分のGoogleアカウントを選びます。
5. 「詳細」→「安全ではないページに移動」→「許可」を押します。
6. スプレッドシートにG〜L列が追加され、リマインド用トリガーが作成されます。

## 5. Webアプリとしてデプロイする

1. Apps Script右上の `デプロイ` を押します。
2. `新しいデプロイ` を押します。
3. 種類の選択で `ウェブアプリ` を選びます。
4. 次のように設定します。

```text
説明：Wedding RSVP API
次のユーザーとして実行：自分
アクセスできるユーザー：全員
```

5. `デプロイ` を押します。
6. 表示された `ウェブアプリURL` をコピーします。

## 6. js/config.jsを書き換える

`js/config.js` の次の部分を、コピーしたWebアプリURLに差し替えます。

```js
gasWebAppUrl: 'PASTE_YOUR_GAS_WEB_APP_URL_HERE',
```

例：

```js
gasWebAppUrl: 'https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec',
```

差し替えたら、`js/config.js` をGitHubに再アップロードします。

## 7. 動作確認する

1. `https://Yusuke-Aika-Wedding.github.io/invitation-test/kekkon-hanako/` を開きます。
2. 室内写真背景のメッセージが出るか確認します。
3. 画面をタップし、招待状ページが開くか確認します。
4. カウントダウンが秒単位で動くか確認します。
5. フォームに氏名・メール・挙式出欠・披露宴出欠・アレルギーを入力します。
6. `Send Reply` を押します。
7. スプレッドシートC〜F列に保存されるか確認します。
8. 入力したメールアドレスに確認メールが届くか確認します。
9. もう一度同じURLを開き、フォームが消えているか確認します。

## 8. リマインドメールの確認

本番では、毎日9時ごろ `sendReminderEmails` が動きます。

送信条件：

- 回答済み
- メールアドレスあり
- 挙式または披露宴のどちらかが「ご出席」
- 結婚式の7日前、または1日前
- まだ同じリマインドを送っていない

テストしたい場合は、Apps Scriptで次を実行します。

- `testReminder7Days()`：1週間前リマインドのテスト送信
- `testReminder1Day()`：前日リマインドのテスト送信

## 9. ゲストを増やす方法

例：A列URLが `sato-ichiro`、B列ゲスト名が `佐藤一郎` の場合。

### GitHub側

1. `kekkon-hanako` フォルダをコピーします。
2. フォルダ名を `sato-ichiro` にします。
3. `sato-ichiro/index.html` を開きます。
4. `data-guest-id="kekkon-hanako"` を `data-guest-id="sato-ichiro"` に変えます。
5. `結婚太郎` を `佐藤一郎` に変えます。
6. `js/config.js` の `guests` に追加します。

```js
'sato-ichiro': {
  displayName: '佐藤一郎',
  path: 'sato-ichiro/'
}
```

### Apps Script側

`gas/Code.gs` の `APP_CONFIG.guests` に追加します。

```js
{ url: 'sato-ichiro', displayName: '佐藤一郎' }
```

その後、Apps Scriptで `setup()` をもう一度実行します。
