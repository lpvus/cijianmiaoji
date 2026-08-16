export function buildShareRows(notes, userId, hash, bookNotes = {}) {
  const rows = [];
  const seen = new Set();

  for (const [wordKey, entry] of Object.entries(notes || {})) {
    if (!entry || !Array.isArray(entry.items) || !wordKey.includes(":")) continue;
    for (const item of entry.items) {
      const text = String((item && item.t) || "").trim();
      const id = String((item && item.id) || "");
      const at = Number((item && item.at) || 0);
      const bookText = String(bookNotes[wordKey] || "").trim();
      const isLegacy = id.startsWith("o");
      const userAuthored = at > 0 || (isLegacy && (!bookText || text !== bookText));
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
