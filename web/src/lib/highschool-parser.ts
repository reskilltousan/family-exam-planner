const AREA_LABELS = ["道北エリア", "道東エリア", "道南エリア", "道央エリア"];
const CATEGORY_LABELS = ["私立高等学校", "私立中学校", "中高一貫校"];
const ATTR_KEYWORDS = ["共学", "女子校", "男子校", "学生寮", "全日制", "通信制", "大学併設校", "短大併設校", "定時制"];

export type AssociationRow = {
  pref: string;
  associationName: string;
  url: string | null;
  address: string | null;
  phone: string | null;
};

export type SchoolRow = {
  name: string;
  website: string | null;
  map: string | null;
  area: string | null;
  category: string | null;
  attributes: string[];
};

export function parseAssociationTable(html: string): AssociationRow[] {
  const rows: AssociationRow[] = [];
  const tableMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const row of tableMatches) {
    // skip header if contains 地区
    if (/地区/.test(row) && /団体名/.test(row)) continue;
    const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    if (cells.length < 3) continue;
    const pref = cleanText(cells[0]);
    const assocName = cleanText(cells[1]);
    const urlMatch = cells[1].match(/href="([^"]+)"/i);
    const addressRaw = cells[2].replace(/<br\s*\/?>/gi, "\n");
    const address = cleanText(addressRaw);
    const phoneMatch = addressRaw.match(/電話：?([\d（）\(\)\-\s]+)/);
    rows.push({
      pref,
      associationName: assocName,
      url: urlMatch ? normalizeUrl(urlMatch[1]) : null,
      address: address || null,
      phone: phoneMatch ? phoneMatch[1].trim() : null,
    });
  }
  return rows;
}

export function parseHokkaidoSchools(html: string): SchoolRow[] {
  const schools: SchoolRow[] = [];
  const areaBlocks = sliceByMarkers(html, AREA_LABELS);
  for (const block of areaBlocks) {
    const area = block.label;
    const categoryBlocks = sliceByMarkers(block.content, CATEGORY_LABELS);
    for (const cblock of categoryBlocks) {
      const category = cblock.label;
      const schoolMatches = [...cblock.content.matchAll(/<h4[^>]*>(.*?)<\/h4>/gi)];
      for (let i = 0; i < schoolMatches.length; i++) {
        const name = cleanText(schoolMatches[i][1]);
        const start = schoolMatches[i].index ?? 0;
        const end = schoolMatches[i + 1]?.index ?? cblock.content.length;
        const chunk = cblock.content.slice(start, end);
        const websiteMatch = chunk.match(/<a[^>]+href="([^"]+)"[^>]*>\s*WEBサイト/iu);
        const mapMatch = chunk.match(/<a[^>]+href="([^"]+)"[^>]*>\s*MAP/iu);
        const text = cleanText(chunk);
        const attributes = ATTR_KEYWORDS.filter((k) => text.includes(k));
        schools.push({
          name,
          website: websiteMatch ? normalizeUrl(websiteMatch[1]) : null,
          map: mapMatch ? normalizeUrl(mapMatch[1]) : null,
          area,
          category,
          attributes,
        });
      }
    }
  }
  return schools;
}

function sliceByMarkers(source: string, markers: string[]) {
  const result: { label: string | null; content: string }[] = [];
  const positions: { label: string; index: number }[] = [];
  for (const label of markers) {
    const re = new RegExp(label);
    const m = re.exec(source);
    if (m && typeof m.index === "number") {
      positions.push({ label, index: m.index });
    }
  }
  positions.sort((a, b) => a.index - b.index);
  if (!positions.length) {
    result.push({ label: null, content: source });
    return result;
  }
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = positions[i + 1]?.index ?? source.length;
    result.push({
      label: positions[i].label,
      content: source.slice(start, end),
    });
  }
  return result;
}

function cleanText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("//")) return "https:" + url;
  return url;
}
