// Combos Fries: tells the website which items are sold out right now.

// Reads the "Stock" Google Sheet and returns the ids marked NO.
// The sheet must be shared as "Anyone with the link: Viewer".
const SHEET_ID = "1OamGMwRBHnEcjTK97jOcjUZOT2tSqruhwlSrYyAhQhw";
const URL = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&sheet=Stock";

function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Returns an array of sold-out ids. If the sheet can't be read, returns [] (everything stays orderable).
async function getSoldOut() {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(URL, { signal: ctrl.signal }); clearTimeout(t);
    if (!r.ok) return [];
    const text = await r.text();
    if (text.trim().startsWith("<")) return []; // not shared publicly (got a login page)
    return parseCsv(text).slice(1)
      .filter(r => r[0] && /^\s*no\b/i.test(r[2] || ""))
      .map(r => r[0].trim());
  } catch (e) { return []; }
};

module.exports = async (req, res) => {
  const soldOut = await getSoldOut();
  res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
  res.status(200).json({ soldOut });
};
