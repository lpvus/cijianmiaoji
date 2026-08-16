export function buildShareRows(notes, userId, hash) {
  const rows = [];
  const seen = new Set();

  for (const [wordKey, entry] of Object.entries(notes || {})) {
    if (!entry || !Array.isArray(entry.items) || !wordKey.includes(":")) continue;
    for (const item of entry.items) {
      const text = String((item && item.t) || "").trim();
      // Book notes use at=0. Only notes created or edited by the user are theirs to share.
      if (!text || !Number(item.at)) continue;
      const noteId = "h" + hash(wordKey + "::" + text);
      const rowKey = wordKey + "::" + noteId;
      if (seen.has(rowKey)) continue;
      seen.add(rowKey);
      rows.push({ note_id: noteId, word_key: wordKey, text, user_id: userId });
    }
  }

  return rows;
}
