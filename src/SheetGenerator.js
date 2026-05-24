/* eslint-disable no-unused-vars */

/**
 * テンプレート（Google Sheets）から曲行を読み取る。
 * @param {string} templateId - テンプレートのスプレッドシートID
 * @param {string} type - "sound" | "lightning" | "mnp"
 * @returns {object}
 */
function readTemplate_(templateId, type) {
  const ss = SpreadsheetApp.openById(templateId);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getDisplayValues();

  if (type === "mnp") return parseMnpTemplate_(data);
  if (type === "lightning") return parseLightningTemplate_(data);
  return parseSoundTemplate_(data);
}

function parseSoundTemplate_(rows) {
  if (rows.length < 2) return { headerRows: [], songRows: [] };

  const headerRows = [rows[0].map(String)];

  // Row 2: 「全体の質感について」
  if (rows.length > 1 && String(rows[1][1] || "").includes("全体の質感")) {
    headerRows.push(rows[1].map(String));
  }

  const songRows = [];
  for (let i = headerRows.length; i < rows.length; i++) {
    const name = String(rows[i][1] || "").trim();
    if (!name) continue;
    if (name.includes("ここから下は使わない")) break;
    songRows.push({ songName: name, cells: rows[i].map(String), trailingRows: [] });
  }

  return { headerRows, songRows };
}

function parseLightningTemplate_(rows) {
  if (rows.length < 1) return { headerRows: [], songRows: [] };

  const headerRows = [rows[0].map(String)];
  const songRows = [];
  let lastSongRow = null;

  for (let i = 1; i < rows.length; i++) {
    const a = String(rows[i][0] || "").trim();
    const b = String(rows[i][1] || "").trim();
    if (!b) continue;

    if (a && /^\d+$/.test(a)) {
      lastSongRow = { songName: b, cells: rows[i].map(String), trailingRows: [] };
      songRows.push(lastSongRow);
    } else if (lastSongRow) {
      lastSongRow.trailingRows.push(rows[i].map(String));
    } else {
      songRows.push({ songName: b, cells: rows[i].map(String), trailingRows: [] });
    }
  }

  return { headerRows, songRows };
}

function parseMnpTemplate_(rows) {
  if (rows.length < 2) return {};

  const header = rows[0].map(String);
  let nameIdx = 1, autoTuneIdx = -1, mnpMemoIdx = -1;
  for (let i = 0; i < header.length; i++) {
    const h = header[i].trim();
    if (h === "名称") nameIdx = i;
    else if (h.includes("AutoTune")) autoTuneIdx = i;
    else if (h.includes("Mnpメモ")) mnpMemoIdx = i;
  }

  const songs = {};
  for (let i = 1; i < rows.length; i++) {
    const name = String(rows[i][nameIdx] || "").trim();
    if (!name || name.toLowerCase() === "mc") continue;
    if (name.includes("ここから下は使わない") || name.includes("全体の質感")) continue;
    const key = name.toLowerCase();
    if (!songs[key]) {
      songs[key] = {
        autoTune: autoTuneIdx >= 0 ? String(rows[i][autoTuneIdx] || "").trim() : "",
        mnpMemo: mnpMemoIdx >= 0 ? String(rows[i][mnpMemoIdx] || "").trim() : "",
      };
    }
  }

  return { songs };
}

/**
 * Sound / Lightning シートを生成する。
 */
function generateStandardSheet_(setlist, matcher, templateId, type, folderId, title) {
  const tmpl = readTemplate_(templateId, type);
  const songMap = buildSongMap_(tmpl.songRows, matcher);
  const outputRows = buildOutputRows_(setlist, tmpl, songMap, type, matcher);

  const sheetNames = ["シート1"];
  if (type === "lightning") sheetNames.push("セットリスト");

  const ss = SpreadsheetApp.create(title);
  const sheet = ss.getSheets()[0];
  sheet.setName("シート1");

  if (outputRows.length > 0) {
    const maxCols = outputRows.reduce((max, r) => Math.max(max, r.length), 0);
    const normalized = outputRows.map((r) => {
      const row = r.slice();
      while (row.length < maxCols) row.push("");
      return row;
    });
    if (normalized.length > 0 && maxCols > 0) {
      sheet.getRange(1, 1, normalized.length, maxCols).setValues(normalized);
      sheet.autoResizeRows(1, normalized.length);
      autoResizeCols_(sheet, maxCols);
    }
  }

  if (type === "lightning") {
    const setlistSheet = ss.insertSheet("セットリスト");
    const summaryRows = buildSetlistSummary_(setlist);
    if (summaryRows.length > 0) {
      setlistSheet.getRange(1, 1, summaryRows.length, 1).setValues(summaryRows);
      setlistSheet.autoResizeRows(1, summaryRows.length);
      autoResizeCols_(setlistSheet, 1);
    }
  }

  // Move to target folder
  const file = DriveApp.getFileById(ss.getId());
  DriveApp.getFolderById(folderId).addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return ss.getId();
}

/**
 * Mnp シートを生成する。
 */
function generateMnpSheet_(setlist, matcher, templateId, folderId, title) {
  const mnpTmpl = readTemplate_(templateId, "mnp");
  const outputRows = buildMnpOutputRows_(setlist, mnpTmpl, matcher);

  const ss = SpreadsheetApp.create(title);
  const sheet = ss.getSheets()[0];
  sheet.setName("シート1");

  if (outputRows.length > 0) {
    const maxCols = outputRows.reduce((max, r) => Math.max(max, r.length), 0);
    const normalized = outputRows.map((r) => {
      const row = r.slice();
      while (row.length < maxCols) row.push("");
      return row;
    });
    sheet.getRange(1, 1, normalized.length, maxCols).setValues(normalized);
    sheet.autoResizeRows(1, normalized.length);
    autoResizeCols_(sheet, maxCols);
  }

  const file = DriveApp.getFileById(ss.getId());
  DriveApp.getFolderById(folderId).addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return ss.getId();
}

function autoResizeCols_(sheet, numCols) {
  for (let i = 1; i <= numCols; i++) {
    sheet.autoResizeColumn(i);
  }
}

function buildSongMap_(songRows, matcher) {
  const songMap = {};
  for (const row of songRows) {
    const key = row.songName.toLowerCase();
    const entry = matchSong(matcher, row.songName);
    const lookup = { row, entry };

    if (!songMap[key]) songMap[key] = lookup;
    if (entry) {
      const canonicalKey = entry.name.toLowerCase();
      if (!songMap[canonicalKey]) songMap[canonicalKey] = lookup;
    }
  }
  return songMap;
}

function buildOutputRows_(setlist, tmpl, songMap, type, matcher) {
  const addBpm = type === "lightning";
  const rows = tmpl.headerRows.map((r) => {
    const row = r.slice();
    if (addBpm) row.push("BPM");
    return row;
  });
  let no = 1;
  let totalMinutes = 0;
  let totalSeconds = 0;

  for (let si = 0; si < setlist.sections.length; si++) {
    if (si > 0) rows.push([]);

    for (const item of setlist.sections[si].items) {
      if (item.type === "mc") {
        const row = makeEmptyRow_(tmpl);
        if (row.length > 1) row[1] = "MC";
        if (addBpm) row.push("");
        rows.push(row);
        continue;
      }

      const entry = matchSong(matcher, item.name);
      let lookup = null;
      if (entry) lookup = songMap[entry.name.toLowerCase()];
      if (!lookup) lookup = songMap[item.name.toLowerCase()];

      if (lookup && lookup.row) {
        const row = lookup.row.cells.slice();
        if (row.length > 0) row[0] = String(no);
        if (addBpm) row.push(lookup.entry ? lookup.entry.bpm : "");
        no++;
        rows.push(row);

        if (type === "lightning") {
          for (const tr of lookup.row.trailingRows) {
            const trRow = tr.slice();
            if (addBpm) trRow.push("");
            rows.push(trRow);
          }
        }

        if (lookup.entry) {
          const [min, sec] = parseDuration_(lookup.entry.duration);
          totalMinutes += min;
          totalSeconds += sec;
        }
      } else {
        Logger.log("警告: テンプレートに曲 " + item.name + " が見つかりません");
        const row = makeEmptyRow_(tmpl);
        if (row.length > 0) row[0] = String(no);
        if (row.length > 1) row[1] = item.name;
        if (addBpm) row.push("");
        no++;
        rows.push(row);
      }
    }
  }

  totalMinutes += Math.floor(totalSeconds / 60);
  totalSeconds = totalSeconds % 60;
  updateTotalTime_(rows, totalMinutes, totalSeconds);

  return rows;
}

function buildMnpOutputRows_(setlist, mnpTmpl, matcher) {
  const rows = [["no", "名称", "時間", "BPM", "Key", "AutoTuneの強さ", "Mnpメモ"]];
  let no = 1;
  let totalMinutes = 0;
  let totalSeconds = 0;
  const songs = mnpTmpl.songs || {};

  for (let si = 0; si < setlist.sections.length; si++) {
    if (si > 0) rows.push(["", "", "", "", "", "", ""]);

    for (const item of setlist.sections[si].items) {
      if (item.type === "mc") {
        rows.push(["", "MC", "", "", "", "", ""]);
        continue;
      }

      const entry = matchSong(matcher, item.name);
      const canonicalName = entry ? entry.name : item.name;

      let mnpData = null;
      if (entry) mnpData = songs[entry.name.toLowerCase()];
      if (!mnpData) mnpData = songs[item.name.toLowerCase()];
      if (!mnpData) mnpData = { autoTune: "", mnpMemo: "" };

      const row = [
        String(no),
        canonicalName,
        entry ? entry.duration : "",
        entry ? entry.bpm : "",
        entry ? entry.key : "",
        mnpData.autoTune,
        mnpData.mnpMemo,
      ];

      if (entry) {
        const [min, sec] = parseDuration_(entry.duration);
        totalMinutes += min;
        totalSeconds += sec;
      }

      no++;
      rows.push(row);
    }
  }

  totalMinutes += Math.floor(totalSeconds / 60);
  totalSeconds = totalSeconds % 60;
  rows[0][2] = "時間(合計: " + totalMinutes + ":" + String(totalSeconds).padStart(2, "0") + ")";

  return rows;
}

function makeEmptyRow_(tmpl) {
  const cols = tmpl.headerRows.length > 0 ? tmpl.headerRows[0].length : 9;
  return new Array(cols).fill("");
}

function parseDuration_(d) {
  if (!d) return [0, 0];
  d = String(d).trim();
  const parts = d.split(":");
  if (parts.length === 2) {
    return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
  }
  return [0, 0];
}

function updateTotalTime_(rows, min, sec) {
  if (rows.length === 0 || rows[0].length < 3) return;
  if (String(rows[0][2]).includes("合計")) {
    rows[0][2] = "時間(合計: " + min + ":" + String(sec).padStart(2, "0") + ")";
  }
}

function buildSetlistSummary_(setlist) {
  const rows = [["セットリスト"]];
  for (const section of setlist.sections) {
    for (const item of section.items) {
      rows.push([item.name]);
    }
  }
  return rows;
}
