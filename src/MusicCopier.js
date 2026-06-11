/* eslint-disable no-unused-vars */

/**
 * MusicData フォルダから wav ファイルをセトリ順にコピーする。
 * @param {string} musicDataFolderId - テンプレート wav が置いてあるフォルダID
 * @param {string} targetFolderId - イベントフォルダID
 * @param {object} setlist - parseSetlist の結果
 * @param {object} matcher - createMatcher の結果
 */
function copyMusicData(musicDataFolderId, targetFolderId, setlist, matcher) {
  const srcFolder = DriveApp.getFolderById(musicDataFolderId);
  const files = srcFolder.getFiles();

  // Build lookup: lowercase song name → File
  const wavMap = {};
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (!name.toLowerCase().endsWith(".wav")) continue;

    const songName = name.replace(/\.wav$/i, "");
    wavMap[normalizeKey_(songName)] = { file, songName };

    const entry = matchSong(matcher, songName);
    if (entry) {
      wavMap[normalizeKey_(entry.name)] = { file, songName };
    }
  }

  // Create MUSIC DATA subfolder
  const targetFolder = DriveApp.getFolderById(targetFolderId);
  const musicFolder = targetFolder.createFolder("MUSIC DATA");

  let no = 1;
  for (const section of setlist.sections) {
    for (const item of section.items) {
      if (item.type === "mc") continue;

      const entry = matchSong(matcher, item.name);
      const canonicalName = entry ? entry.name : item.name;

      let wav = wavMap[normalizeKey_(canonicalName)];
      if (!wav) wav = wavMap[normalizeKey_(item.name)];

      if (!wav) {
        Logger.log("警告: wav未検出 " + item.name + " → スキップ");
        continue;
      }

      const title = String(no).padStart(2, "0") + " " + canonicalName + ".wav";
      wav.file.makeCopy(title, musicFolder);
      Logger.log("  " + title);
      no++;
    }
  }
}
