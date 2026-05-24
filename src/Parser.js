/* eslint-disable no-unused-vars */

const TIME_REGEX = /\s+\d+(\.\d+)?min$/;

/**
 * @param {string} text
 * @returns {{ date: string, event: string, venue: string, sections: Array<{ items: Array<{ name: string, type: string }> }> }}
 */
function parseSetlist(text) {
  const lines = text.split("\n");
  if (lines.length === 0 || lines[0].trim() === "") {
    throw new Error("empty input");
  }

  const header = lines[0].trim();
  const spaceIdx = header.indexOf(" ");
  if (spaceIdx === -1) {
    throw new Error("invalid header: missing space between date and event: " + header);
  }

  const date = header.substring(0, spaceIdx);
  if (date.length !== 8) {
    throw new Error("invalid date format (expected YYYYMMDD): " + date);
  }

  const rest = header.substring(spaceIdx + 1);
  const atIdx = rest.indexOf("@");
  if (atIdx === -1) {
    throw new Error("invalid header: missing '@' between event and venue: " + header);
  }

  const event = rest.substring(0, atIdx);
  const venue = rest.substring(atIdx + 1);

  const sections = [];
  let currentItems = [];
  let lastWasEmpty = false;

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line === "") {
      if (lastWasEmpty) continue;
      if (currentItems.length > 0) {
        sections.push({ items: currentItems });
        currentItems = [];
      }
      lastWasEmpty = true;
      continue;
    }
    lastWasEmpty = false;

    line = line.replace(TIME_REGEX, "").trim();

    const type = line.toLowerCase() === "mc" ? "mc" : "song";
    currentItems.push({ name: line, type });
  }

  if (currentItems.length > 0) {
    sections.push({ items: currentItems });
  }

  return { date, event, venue, sections };
}

function shortDate(setlist) {
  return setlist.date.substring(2);
}

function folderName(setlist) {
  return shortDate(setlist) + " " + setlist.event + "@" + setlist.venue;
}

function filePrefix(setlist) {
  return shortDate(setlist) + " " + setlist.event;
}
