/* eslint-disable no-unused-vars */

function assert_(condition, message) {
  if (!condition) throw new Error("FAIL: " + message);
}

function assertEqual_(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      "FAIL: " + message + " — got " + JSON.stringify(actual) + ", want " + JSON.stringify(expected)
    );
  }
}

// === Parser Tests ===

function testParse() {
  const input = [
    "20260530 HubSlice6@WWW X",
    "Intro",
    "新時代 extended 5min",
    "TOKYO FOREVER 3min",
    "21 century boys 3min",
    "RAINBOW 2.5min",
    "ゆらせJP 4min",
    "Paradox 3min",
    "",
    "MC 1min",
    "",
    "Interlude",
    "愛し合うとして 4.5min",
    "Supersonic 4min",
    "Seventeen 2.5min",
    "Fuse 2.5min",
    "",
    "MC 1min",
    "",
    "WORLD END LOVESONG 2.5min",
  ].join("\n");

  const result = parseSetlist(input);
  assertEqual_(result.date, "20260530", "date");
  assertEqual_(result.event, "HubSlice6", "event");
  assertEqual_(result.venue, "WWW X", "venue");
  assertEqual_(shortDate(result), "260530", "shortDate");
  assertEqual_(folderName(result), "260530 HubSlice6@WWW X", "folderName");
  assertEqual_(filePrefix(result), "260530 HubSlice6", "filePrefix");
  assertEqual_(result.sections.length, 5, "sections count");

  // Section 1: Intro ~ Paradox
  assertEqual_(result.sections[0].items.length, 7, "section 1 items");
  assertEqual_(result.sections[0].items[0].name, "Intro", "section 1 item 0");
  assertEqual_(result.sections[0].items[0].type, "song", "section 1 item 0 type");
  assertEqual_(result.sections[0].items[1].name, "新時代 extended", "time suffix removed");
  assertEqual_(result.sections[0].items[2].name, "TOKYO FOREVER", "time suffix removed 2");

  // Section 2: MC
  assertEqual_(result.sections[1].items.length, 1, "section 2 items");
  assertEqual_(result.sections[1].items[0].type, "mc", "section 2 MC type");
  assertEqual_(result.sections[1].items[0].name, "MC", "section 2 MC name");

  // Section 3: Interlude ~ Fuse
  assertEqual_(result.sections[2].items.length, 5, "section 3 items");

  // Section 5: WORLD END LOVESONG
  assertEqual_(result.sections[4].items.length, 1, "section 5 items");
  assertEqual_(result.sections[4].items[0].name, "WORLD END LOVESONG", "section 5 item");
}

function testParseConsecutiveEmptyLines() {
  const input = "20260530 Test@Venue\nSong1\n\n\nSong2";
  const result = parseSetlist(input);
  assertEqual_(result.sections.length, 2, "consecutive empty lines → 2 sections");
}

function testParseMCCaseInsensitive() {
  const input = "20260530 Test@Venue\nmc";
  const result = parseSetlist(input);
  assertEqual_(result.sections[0].items[0].type, "mc", "lowercase mc detected");
}

function testParseNoVenue() {
  const input = "20260530 SoloEvent\nSong1";
  const result = parseSetlist(input);
  assertEqual_(result.event, "SoloEvent", "event without venue");
  assertEqual_(result.venue, "", "venue is empty when no @");
  assertEqual_(folderName(result), "260530 SoloEvent", "folderName omits @ when no venue");
  assertEqual_(filePrefix(result), "260530 SoloEvent", "filePrefix without venue");
}

function testParseInvalidHeader() {
  const inputs = ["", "20260530", "2026053 Short@Date"];
  for (const input of inputs) {
    try {
      parseSetlist(input);
      throw new Error("FAIL: expected error for " + JSON.stringify(input));
    } catch (e) {
      if (e.message.startsWith("FAIL:")) throw e;
      // expected error
    }
  }
}

// === Matcher Tests ===

function testMatchExact() {
  const entries = [{ name: "TOKYO FOREVER" }, { name: "21 Century boys" }];
  const m = createMatcher(entries);
  const e = matchSong(m, "TOKYO FOREVER");
  assert_(e !== null, "exact match");
  assertEqual_(e.name, "TOKYO FOREVER", "exact match name");
}

function testMatchCaseInsensitive() {
  const entries = [{ name: "TOKYO FOREVER" }];
  const m = createMatcher(entries);
  assert_(matchSong(m, "tokyo forever") !== null, "case-insensitive match");
}

function testMatchAlias() {
  const entries = [{ name: "ゆらせ JP", aliases: ["ゆらせJP", "ゆらせ"] }];
  const m = createMatcher(entries);

  const e1 = matchSong(m, "ゆらせJP");
  assert_(e1 !== null, "alias match 1");
  assertEqual_(e1.name, "ゆらせ JP", "alias match 1 name");

  const e2 = matchSong(m, "ゆらせ");
  assert_(e2 !== null, "alias match 2");
  assertEqual_(e2.name, "ゆらせ JP", "alias match 2 name");
}

function testMatchNotFound() {
  const entries = [{ name: "TOKYO FOREVER" }];
  const m = createMatcher(entries);
  assertEqual_(matchSong(m, "Unknown Song"), null, "not found returns null");
}

function testMatchNFDvsNFC() {
  // ファイル名は macOS 由来の NFD(濁点分解)、入力は NFC を想定
  const nfc = "モナリザ";
  const nfd = nfc.normalize("NFD");
  assert_(nfc !== nfd, "precondition: NFC and NFD differ as raw strings");

  const m1 = createMatcher([{ name: nfd }]);
  assert_(matchSong(m1, nfc) !== null, "NFC input matches NFD entry");

  const m2 = createMatcher([{ name: nfc }]);
  assert_(matchSong(m2, nfd) !== null, "NFD input matches NFC entry");
}

function testLoadSongInfoFromSheet() {
  const rows = [
    ["セトリ セクション", "曲", "時間(合計: 30:00)", "BPM", "Key", "エイリアス"],
    ["", "新時代", "3:00", "180", "C", "新時代 extended"],
    ["", "MC", "5:00", "", "", ""],
    ["", "RAINBOW", "2:12", "220", "F", "RAINBOW(+intro)"],
    ["方針 結論："],
  ];
  const entries = loadSongInfoFromRows(rows);
  assertEqual_(entries.length, 2, "entries count");
  assertEqual_(entries[0].name, "新時代", "entry 0 name");
  assertEqual_(entries[0].aliases.length, 1, "entry 0 aliases count");
  assertEqual_(entries[0].aliases[0], "新時代 extended", "entry 0 alias");
  assertEqual_(entries[1].name, "RAINBOW", "entry 1 name");
}

// === Test Runner ===

function runAllTests() {
  const tests = [
    testParse,
    testParseConsecutiveEmptyLines,
    testParseMCCaseInsensitive,
    testParseNoVenue,
    testParseInvalidHeader,
    testMatchExact,
    testMatchCaseInsensitive,
    testMatchAlias,
    testMatchNotFound,
    testMatchNFDvsNFC,
    testLoadSongInfoFromSheet,
  ];

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const test of tests) {
    try {
      test();
      passed++;
      Logger.log("PASS: " + test.name);
    } catch (e) {
      failed++;
      failures.push(test.name + ": " + e.message);
      Logger.log("FAIL: " + test.name + " — " + e.message);
    }
  }

  const summary = passed + " passed, " + failed + " failed";
  Logger.log(summary);
  if (failures.length > 0) {
    Logger.log("Failures:\n  " + failures.join("\n  "));
  }
  return summary;
}
