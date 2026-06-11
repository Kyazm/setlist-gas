/* eslint-disable no-unused-vars */

/**
 * SongInfo の行データから SongEntry 配列を生成する。
 * @param {Array<Array<string>>} rows - Sheets API のレスポンス形式
 * @returns {Array<{ name: string, duration: string, bpm: string, key: string, aliases: string[] }>}
 */
function loadSongInfoFromRows(rows) {
  if (rows.length < 2) throw new Error("songinfo has no data rows");

  const header = rows[0].map(String);
  const cols = findSongInfoColumns_(header);
  const entries = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].map(String);
    const name = getCell_(cells, cols.name);
    if (!name || name.toLowerCase() === "mc") continue;
    if (name.includes("方針") || name.includes("結論")) break;

    const aliasStr = getCell_(cells, cols.aliases);
    const aliases = aliasStr ? aliasStr.split(",").map((s) => s.trim()).filter(Boolean) : [];

    entries.push({
      name,
      duration: getCell_(cells, cols.duration),
      bpm: getCell_(cells, cols.bpm),
      key: getCell_(cells, cols.key),
      aliases,
    });
  }

  return entries;
}

function findSongInfoColumns_(header) {
  const cols = { name: 1, aliases: -1, duration: 2, bpm: 3, key: 4 };
  for (let i = 0; i < header.length; i++) {
    const h = header[i].trim();
    if (h === "曲") cols.name = i;
    else if (h === "エイリアス") cols.aliases = i;
    else if (h.startsWith("時間")) cols.duration = i;
    else if (h === "BPM") cols.bpm = i;
    else if (h === "Key") cols.key = i;
  }
  return cols;
}

function getCell_(cells, idx) {
  if (idx < 0 || idx >= cells.length) return "";
  return (cells[idx] || "").trim();
}

/**
 * 照合キーを正規化する。
 * macOS 由来のファイル名(NFD)と入力テキスト(NFC)の濁点表現差を吸収するため NFC へ統一する。
 * @param {string} s
 * @returns {string}
 */
function normalizeKey_(s) {
  return s.trim().normalize("NFC").toLowerCase();
}

/**
 * Matcher を作成する。
 * @param {Array<{ name: string, aliases?: string[] }>} entries
 * @returns {Object.<string, object>} lowercase key → entry
 */
function createMatcher(entries) {
  const map = {};
  for (const e of entries) {
    map[normalizeKey_(e.name)] = e;
    if (e.aliases) {
      for (const alias of e.aliases) {
        const key = normalizeKey_(alias);
        if (key) map[key] = e;
      }
    }
  }
  return map;
}

/**
 * @param {Object} matcher
 * @param {string} name
 * @returns {object|null}
 */
function matchSong(matcher, name) {
  return matcher[normalizeKey_(name)] || null;
}
