export function buildShareRows(notes, userId, hash) {
  const rows = [];
  const seen = new Set();

  for (const [wordKey, entry] of Object.entries(notes || {})) {
    if (!entry || !Array.isArray(entry.items) || !wordKey.includes(":")) continue;
    for (const item of entry.items) {
      const text = String((item && item.t) || "").trim();
      // Legacy user notes use an o* id with at=0; book notes use b* with at=0.
      const userAuthored = String((item && item.id) || "").startsWith("o") || Number(item.at) > 0;
      if (!text || !userAuthored) continue;
      const noteId = "h" + hash(wordKey + "::" + text);
      const rowKey = wordKey + "::" + noteId;
      if (seen.has(rowKey)) continue;
      seen.add(rowKey);
      rows.push({ note_id: noteId, word_key: wordKey, text, user_id: userId });
    }
  }

  return rows;
}
