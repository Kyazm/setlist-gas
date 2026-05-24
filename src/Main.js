/* eslint-disable no-unused-vars */

/**
 * セットリストテキストから全シート＋wavを生成するメイン処理。
 * @param {string} setlistText - セットリストのテキスト
 * @returns {string} 結果メッセージ
 */

function generate(setlistText) {
  const cfg = loadConfig();
  const setlist = parseSetlist(setlistText);

  Logger.log("イベント: " + setlist.event + " @ " + setlist.venue + " (" + shortDate(setlist) + ")");

  // 設定の検証
  validateConfig_(cfg);

  // SongInfo 読み込み
  const songInfoSS = openSpreadsheet_(cfg[CONFIG_KEYS.SONG_INFO_ID], "SongInfo");
  const songInfoSheet = songInfoSS.getSheetByName("SongInfo") || songInfoSS.getSheets()[0];
  const songRows = songInfoSheet.getDataRange().getDisplayValues();
  const entries = loadSongInfoFromRows(songRows);
  const matcher = createMatcher(entries);

  // イベントフォルダ作成（同名がある場合は連番付き）
  const liveInfoFolder = openFolder_(cfg[CONFIG_KEYS.LIVE_INFO_FOLDER_ID], "LiveInfo");
  const evtFolderName = uniqueFolderName_(liveInfoFolder, folderName(setlist));
  const evtFolder = liveInfoFolder.createFolder(evtFolderName);
  Logger.log("フォルダ作成: " + evtFolderName);
  const folderId = evtFolder.getId();

  // シート生成
  const prefix = filePrefix(setlist);
  const artistName = cfg[CONFIG_KEYS.ARTIST_NAME] || "";
  const artistSuffix = artistName ? artistName + " " : "";
  const results = [];

  const templates = [
    { name: "Sound Sheet", id: cfg[CONFIG_KEYS.SOUND_SHEET_ID], type: "sound", suffix: artistSuffix + "SOUND SHEET" },
    { name: "Lightning Sheet", id: cfg[CONFIG_KEYS.LIGHTNING_SHEET_ID], type: "lightning", suffix: artistSuffix + "LIGHTNING SHEET" },
  ];

  for (const t of templates) {
    Logger.log(t.name + " 生成中...");
    const title = prefix + " - " + t.suffix;
    const ssId = generateStandardSheet_(setlist, matcher, t.id, t.type, folderId, title);
    const url = "https://docs.google.com/spreadsheets/d/" + ssId;
    results.push(t.name + ": " + url);
    Logger.log("  作成完了: " + url);
  }

  // Mnp Sheet
  Logger.log("Mnp Sheet 生成中...");
  const mnpTitle = prefix + " - " + artistSuffix + "MNP SHEET";
  const mnpId = generateMnpSheet_(setlist, matcher, cfg[CONFIG_KEYS.MNP_SHEET_ID], folderId, mnpTitle);
  const mnpUrl = "https://docs.google.com/spreadsheets/d/" + mnpId;
  results.push("Mnp Sheet: " + mnpUrl);
  Logger.log("  作成完了: " + mnpUrl);

  // Music Data コピー
  if (cfg[CONFIG_KEYS.MUSIC_DATA_FOLDER_ID]) {
    Logger.log("Music Data コピー中...");
    copyMusicData(cfg[CONFIG_KEYS.MUSIC_DATA_FOLDER_ID], folderId, setlist, matcher);
    Logger.log("Music Data コピー完了");
    results.push("Music Data: コピー完了");
  } else {
    results.push("Music Data: フォルダ未設定 → スキップ");
  }

  const folderUrl = "https://drive.google.com/drive/folders/" + folderId;
  results.push("\nフォルダ: " + folderUrl);

  Logger.log("完了!");
  return results.join("\n");
}

function openSpreadsheet_(id, label) {
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error(label + " を開けません（ID: " + id + "）。Google Sheets形式のファイルを指定してください。xlsxの場合はGoogle Sheetsに変換してください。");
  }
}

function openFolder_(id, label) {
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error(label + " フォルダを開けません（ID: " + id + "）。正しいフォルダURLを設定してください。");
  }
}

function validateConfig_(cfg) {
  openFolder_(cfg[CONFIG_KEYS.LIVE_INFO_FOLDER_ID], "LiveInfo");
  if (cfg[CONFIG_KEYS.MUSIC_DATA_FOLDER_ID]) {
    openFolder_(cfg[CONFIG_KEYS.MUSIC_DATA_FOLDER_ID], "MusicData");
  }
  openSpreadsheet_(cfg[CONFIG_KEYS.SONG_INFO_ID], "SongInfo");
  openSpreadsheet_(cfg[CONFIG_KEYS.SOUND_SHEET_ID], "SoundSheet テンプレート");
  openSpreadsheet_(cfg[CONFIG_KEYS.LIGHTNING_SHEET_ID], "LightningSheet テンプレート");
  openSpreadsheet_(cfg[CONFIG_KEYS.MNP_SHEET_ID], "MnpSheet テンプレート");
}

/**
 * 指定フォルダ内の xlsx を全て Google Sheets に変換する（一度だけ実行）。
 * スクリプトエディタから手動実行する。
 */
function convertXlsxToSheets() {
  const raw = PropertiesService.getScriptProperties().getProperty(CONFIG_KEYS.TEMP_FOLDER_ID) || "";
  let inputId = extractId_(raw);

  if (!inputId) {
    const ui = SpreadsheetApp.getUi();
    const resp = ui.prompt("Tempフォルダ", "TempフォルダのURLまたはIDを入力してください", ui.ButtonSet.OK_CANCEL);
    if (resp.getSelectedButton() !== ui.Button.OK) return;
    inputId = extractId_(resp.getResponseText());
  }

  const folder = DriveApp.getFolderById(inputId);
  const files = folder.getFiles();
  let count = 0;

  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    if (mime !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") continue;

    const name = file.getName().replace(/\.xlsx$/i, "");
    const blob = file.getBlob();
    const resource = { title: name, mimeType: MimeType.GOOGLE_SHEETS, parents: [{ id: inputId }] };
    const created = Drive.Files.insert(resource, blob, { convert: true });
    Logger.log(name + " → https://docs.google.com/spreadsheets/d/" + created.id);
    count++;
  }

  Logger.log(count + " 件変換しました");
}

function uniqueFolderName_(parentFolder, baseName) {
  if (!parentFolder.getFoldersByName(baseName).hasNext()) return baseName;
  let n = 2;
  while (true) {
    const candidate = baseName + " (" + n + ")";
    if (!parentFolder.getFoldersByName(candidate).hasNext()) return candidate;
    n++;
  }
}
