/* eslint-disable no-unused-vars */

const CONFIG_KEYS = {
  LIVE_INFO_FOLDER_ID: "live_info_folder_id",
  MUSIC_DATA_FOLDER_ID: "music_data_folder_id",
  SONG_INFO_ID: "song_info_id",
  SOUND_SHEET_ID: "sound_sheet_id",
  LIGHTNING_SHEET_ID: "lightning_sheet_id",
  MNP_SHEET_ID: "mnp_sheet_id",
  TEMP_FOLDER_ID: "temp_folder_id",
  ARTIST_NAME: "artist_name",
};

function extractId_(urlOrId) {
  if (!urlOrId) return "";
  const m = urlOrId.match(/[-\w]{25,}/);
  return m ? m[0] : urlOrId;
}

function loadConfig() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const optional = new Set([CONFIG_KEYS.TEMP_FOLDER_ID, CONFIG_KEYS.ARTIST_NAME]);
  const missing = Object.values(CONFIG_KEYS).filter((k) => !optional.has(k) && !all[k]);
  if (missing.length > 0) {
    throw new Error("未設定のプロパティ: " + missing.join(", ") + "\n「設定」メニューから設定してください。");
  }
  const noExtract = new Set([CONFIG_KEYS.ARTIST_NAME]);
  const cfg = {};
  for (const k of Object.keys(all)) {
    cfg[k] = noExtract.has(k) ? (all[k] || "") : extractId_(all[k]);
  }
  return cfg;
}

function saveConfig(values) {
  const props = PropertiesService.getScriptProperties();
  props.setProperties(values);
  SpreadsheetApp.getActiveSpreadsheet().toast("設定を保存しました", "完了", 3);
}

function showConfigDialog() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const html = HtmlService.createHtmlOutput(buildConfigHtml_(props))
    .setWidth(500)
    .setHeight(500)
    .setTitle("設定");
  SpreadsheetApp.getUi().showModalDialog(html, "設定");
}

function buildConfigHtml_(props) {
  const fields = [
    { key: CONFIG_KEYS.ARTIST_NAME, label: "アーティスト名（ファイル名に付与）※任意" },
    { key: CONFIG_KEYS.SONG_INFO_ID, label: "SongInfo（URLまたはID）" },
    { key: CONFIG_KEYS.SOUND_SHEET_ID, label: "SoundSheet テンプレート（URLまたはID）" },
    { key: CONFIG_KEYS.LIGHTNING_SHEET_ID, label: "LightningSheet テンプレート（URLまたはID）" },
    { key: CONFIG_KEYS.MNP_SHEET_ID, label: "MnpSheet テンプレート（URLまたはID）" },
    { key: CONFIG_KEYS.LIVE_INFO_FOLDER_ID, label: "LiveInfo フォルダ（URLまたはID）" },
    { key: CONFIG_KEYS.MUSIC_DATA_FOLDER_ID, label: "MusicData フォルダ（URLまたはID）" },
    { key: CONFIG_KEYS.TEMP_FOLDER_ID, label: "Temp フォルダ（URLまたはID）※任意" },
  ];

  let inputs = "";
  for (const f of fields) {
    const val = props[f.key] || "";
    inputs += '<label>' + f.label + '</label><input name="' + f.key + '" value="' + val + '" style="width:100%;margin-bottom:8px;">';
  }

  return '<style>label{font-weight:bold;display:block;margin-top:4px;font-size:13px;}input{padding:4px;font-size:13px;}button{margin-top:12px;padding:8px 24px;font-size:14px;}#msg{margin-top:8px;color:green;font-size:13px;}</style>'
    + '<form onsubmit="submitForm(this);return false;">'
    + inputs
    + '<button type="submit">保存</button></form>'
    + '<div id="msg"></div>'
    + '<script>function submitForm(f){var o={};for(var i=0;i<f.elements.length;i++){var e=f.elements[i];if(e.name)o[e.name]=e.value;}document.getElementById("msg").textContent="保存中...";google.script.run.withSuccessHandler(function(){document.getElementById("msg").textContent="保存しました";}).withFailureHandler(function(e){document.getElementById("msg").style.color="red";document.getElementById("msg").textContent=e.message;}).saveConfig(o);}</script>';
}
