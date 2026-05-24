/* eslint-disable no-unused-vars */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("セットリスト")
    .addItem("生成", "showGenerateDialog")
    .addItem("設定", "showConfigDialog")
    .addItem("xlsx → スプシ変換", "convertXlsxToSheets")
    .addToUi();
}

function showGenerateDialog() {
  const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (authInfo.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    const authUrl = authInfo.getAuthorizationUrl();
    const html = HtmlService.createHtmlOutput(
      '<p>このスクリプトの実行には承認が必要です。</p>'
      + '<p><a href="' + authUrl + '" target="_blank">こちらをクリックして承認してください</a></p>'
      + '<p>承認後、このダイアログを閉じてもう一度「生成」を押してください。</p>'
    ).setWidth(400).setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(html, "承認が必要です");
    return;
  }
  const html = HtmlService.createHtmlOutput(GENERATE_DIALOG_HTML_)
    .setWidth(500)
    .setHeight(500)
    .setTitle("セットリスト生成");
  SpreadsheetApp.getUi().showModalDialog(html, "セットリスト生成");
}

function generateFromDialog(setlistText) {
  try {
    return generate(setlistText);
  } catch (e) {
    throw new Error(e.message + "\n\n" + e.stack);
  }
}

function writeUsageToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  sheet.clear();
  sheet.setName("使い方");

  const data = [
    ["Setlist Generator — 使い方"],
    [""],
    ["■ 初回セットアップ（管理者）"],
    ["1. メニュー「セットリスト」→「設定」を開く"],
    ["2. 各URLまたはIDを入力して「保存」を押す"],
    ["   - SongInfo（曲マスター）"],
    ["   - SoundSheet / LightningSheet / MnpSheet テンプレート（Google Sheets形式）"],
    ["   - LiveInfo フォルダ（生成先）"],
    ["   - MusicData フォルダ（wavファイルの置き場所）"],
    ["   ※ Google DriveのURLをそのまま貼り付けてOK（IDは自動抽出）"],
    [""],
    ["■ メンバーと共有する場合"],
    ["以下のGoogle Drive共有設定が必要です："],
    ["   - このスプレッドシート → 編集者"],
    ["   - LiveInfo フォルダ → 編集者（フォルダ作成・ファイル配置のため）"],
    ["   - MusicData フォルダ → 閲覧者（wavコピー元の読み取り）"],
    ["   - SongInfo → 閲覧者"],
    ["   - 各テンプレート → 閲覧者"],
    ["初回利用時は「生成」を押すと承認リンクが表示されます。クリックして許可してください。"],
    [""],
    ["■ セットリスト生成"],
    ["1. メニュー「セットリスト」→「生成」を開く"],
    ["2. セットリストテキストを入力して「生成」ボタンを押す"],
    ["3. LiveInfoフォルダにシート3枚 + MUSIC DATAフォルダが生成される"],
    ["4. 完了後、各シートとフォルダのURLが表示される"],
    ["※ 同名フォルダが既にある場合は確認後、中身を削除して再生成します"],
    [""],
    ["■ セットリストの書式"],
    ["1行目: YYYYMMDD イベント名@会場名"],
    ["2行目以降: 1行1曲（末尾の 3min 等は自動除去）"],
    ["空行: セクション区切り"],
    ["MC: そのまま「MC」行として出力"],
    [""],
    ["■ 入力例"],
    ["20260101 EventName@VenueName"],
    ["Song A 5min"],
    ["Song B 3min"],
    ["Song C 3min"],
    [""],
    ["MC 1min"],
    [""],
    ["Song D 4.5min"],
    ["Song E 4min"],
    ["Song F 2.5min"],
    [""],
    ["MC 1min"],
    [""],
    ["Song G 3min"],
  ];

  sheet.getRange(1, 1, data.length, 1).setValues(data);
  sheet.setColumnWidth(1, 700);
  sheet.getRange(1, 1).setFontSize(16).setFontWeight("bold");
  sheet.getRange("A3").setFontWeight("bold");
  sheet.getRange("A12").setFontWeight("bold");
  sheet.getRange("A21").setFontWeight("bold");
  sheet.getRange("A28").setFontWeight("bold");
  sheet.getRange("A34").setFontWeight("bold");
}

const GENERATE_DIALOG_HTML_ = [
  '<style>',
  'body{font-family:sans-serif;padding:12px;}',
  'textarea{width:100%;height:300px;font-size:14px;font-family:monospace;padding:8px;box-sizing:border-box;}',
  'button{margin-top:12px;padding:10px 28px;font-size:15px;cursor:pointer;}',
  '#result{margin-top:12px;white-space:pre-wrap;font-size:13px;color:#333;} #result a{color:#1a73e8;}',
  '#error{margin-top:12px;color:red;font-size:13px;white-space:pre-wrap;}',
  '.spinner{display:none;margin-top:12px;font-size:13px;color:#666;}',
  '</style>',
  '<textarea id="setlist" placeholder="20260101 EventName@VenueName\nSong A 5min\nSong B 3min\n..."></textarea>',
  '<button onclick="run()">生成</button>',
  '<div class="spinner" id="spinner">生成中...</div>',
  '<div id="error"></div>',
  '<div id="result"></div>',
  '<script>',
  'function linkify(text){return text.replace(/(https:\\/\\/[^\\s]+)/g,function(url){return \'<a href="\'+url+\'" target="_blank">\'+url+\'</a>\';}).replace(/\\n/g,"<br>");}',
  'function run(){',
  '  var t=document.getElementById("setlist").value;',
  '  if(!t.trim()){document.getElementById("error").textContent="セットリストを入力してください";return;}',
  '  document.getElementById("error").textContent="";',
  '  document.getElementById("result").textContent="";',
  '  document.getElementById("spinner").style.display="block";',
  '  document.getElementById("spinner").textContent="生成中...";',
  '  google.script.run',
  '    .withSuccessHandler(function(r){document.getElementById("spinner").style.display="none";document.getElementById("result").innerHTML=linkify(r);})',
  '    .withFailureHandler(function(e){document.getElementById("spinner").style.display="none";document.getElementById("error").textContent=e.message;})',
  '    .generateFromDialog(t);',
  '}',
  '</script>',
].join("\n");
