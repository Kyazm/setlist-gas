# setlist-gas

ライブ準備資料をセットリストから自動生成するGoogle Apps Script版。

## できること

セットリストのテキストを入力すると、Google Drive上に以下を自動生成する：

- **Sound Sheet** - 音響要望シート
- **Lightning Sheet** - 照明要望シート（BPM付き）
- **Mnp Sheet** - マニピュレーションシート
- **MUSIC DATA/** - wavファイルをセトリ順に連番リネームしてコピー

## セットアップ

### 1. GASプロジェクト作成

```bash
npm install -g @google/clasp
clasp login
clasp create --type sheets --title "Setlist Generator"
```

作成されたスクリプトIDを `.clasp.json` に設定。

### 2. デプロイ

```bash
clasp push --force
```

### 3. テンプレート準備

既存のxlsxテンプレートをGoogle Sheetsに変換する。
スプレッドシートのメニュー「セットリスト」→「xlsx → スプシ変換」から実行可能。

### 4. 設定

スプレッドシートを開き、メニュー「セットリスト」→「設定」から各URLまたはIDを入力する。

| 設定項目 | 説明 |
|----------|------|
| SongInfo | 曲マスター（Google Sheets） |
| SoundSheet テンプレート | 音響要望テンプレート（Google Sheets） |
| LightningSheet テンプレート | 照明要望テンプレート（Google Sheets） |
| MnpSheet テンプレート | Mnpテンプレート（Google Sheets） |
| LiveInfo フォルダ | 生成先フォルダ |
| MusicData フォルダ | wavファイルの置き場所 |
| Temp フォルダ | テンプレート置き場（xlsx変換時に使用、任意） |

URLをそのまま貼り付けてOK（IDは自動抽出される）。

### 5. Google Drive 共有設定（メンバーと共有する場合）

スクリプトの実行権限（OAuth）とは別に、Google Drive側のアクセス権限が必要。

| リソース | 必要な権限 | 理由 |
|----------|-----------|------|
| スプレッドシート（本体） | 編集者 | メニューからスクリプトを実行するため |
| LiveInfo フォルダ | 編集者 | フォルダ作成・ファイル配置のため |
| MusicData フォルダ | 閲覧者 | wavファイルのコピー元として読み取るため |
| SongInfo | 閲覧者 | 曲メタデータの読み取りのため |
| 各テンプレート（Sound/Lightning/Mnp） | 閲覧者 | テンプレートデータの読み取りのため |

「リンクを知っている全員」に上記権限を付与すれば、リンク共有で利用可能。

初回利用時はOAuth承認が必要。「生成」を押すと承認リンクが表示されるので、クリックして許可する。

## 使い方

1. スプレッドシートを開く
2. メニュー「セットリスト」→「生成」
3. セットリストテキストを入力して「生成」ボタンを押す
4. 生成完了後、各シートとフォルダのURLが表示される

同名フォルダが既に存在する場合は連番付きで新規作成される。

### セットリストの書式

```
20260101 EventName@VenueName
Song A 5min
Song B 3min
Song C 3min

MC 1min

Song D 4.5min
Song E 4min
Song F 2.5min

MC 1min

Song G 3min
```

- **1行目**: `YYYYMMDD イベント名@会場名`
- **2行目以降**: 1行1曲（末尾の `3min` 等の時間表記は自動除去）
- **空行**: セクション区切り
- **MC**: そのまま「MC」行として出力

## 開発

### clasp でローカル管理

```bash
clasp push --force  # ローカル → GAS
clasp pull          # GAS → ローカル
```

### テスト

スクリプトエディタで `runAllTests` を実行。

## ドキュメント

- [設計書](docs/design.md)
