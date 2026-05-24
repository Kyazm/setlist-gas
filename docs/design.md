# setlist-gas 設計書

## 概要

ライブ準備資料をセットリストから自動生成するGoogle Apps Scriptアプリケーション。
Go版 `setlist` のGAS移植版。

## アーキテクチャ

Google Sheets をホストとしたコンテナバインド型スクリプト。
カスタムメニューからダイアログを開き、セットリストテキストを入力して実行する。

## ファイル構成

```
src/
├── appsscript.json      # GASマニフェスト
├── Config.js            # スクリプトプロパティによる設定管理
├── Parser.js            # セットリストテキスト解析
├── Matcher.js           # SongInfo読み込み・曲名マッチング
├── SheetGenerator.js    # Sound/Lightning/Mnpシート生成
├── MusicCopier.js       # wavファイルの連番コピー
├── Main.js              # generate() エントリーポイント
├── UI.js                # メニュー・ダイアログ
└── Tests.js             # テスト関数
```

## データフロー

```
セットリストテキスト
  → Parser.parseSetlist()
  → Matcher: SongInfo読み込み → createMatcher()
  → SheetGenerator: テンプレート読み込み → 曲マッチング → シート生成
  → MusicCopier: wavファイル連番コピー
  → 結果URL表示
```

## Go版との差異

| 項目 | Go版 | GAS版 |
|------|------|-------|
| テンプレート形式 | xlsx (excelize) | Google Sheets (SpreadsheetApp) |
| 認証 | gcloud auth | GAS組み込み認証 |
| 設定 | config.yaml | スクリプトプロパティ |
| UI | CLI (cobra) | Sheets カスタムメニュー + ダイアログ |
| Drive操作 | Drive API (REST) | DriveApp (GAS組み込み) |
| Sheets操作 | Sheets API (REST) | SpreadsheetApp (GAS組み込み) |

## 設定（スクリプトプロパティ）

| キー | 説明 |
|------|------|
| song_info_id | SongInfo スプレッドシートID |
| sound_sheet_id | SoundSheet テンプレートID |
| lightning_sheet_id | LightningSheet テンプレートID |
| mnp_sheet_id | MnpSheet テンプレートID |
| live_info_folder_id | LiveInfo フォルダID |
| music_data_folder_id | MusicData フォルダID |

## テンプレート移行

Go版ではxlsx形式のテンプレートを使用していたが、GAS版ではGoogle Sheets形式に変換して使用する。
テンプレートの構造（ヘッダー行、曲行、列構成）はそのまま維持。
