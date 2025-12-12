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
  address?: string | null;
  phone?: string | null;
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
          address: null,
          phone: null,
        });
      }
    }
  }
  return schools;
}

/**
 * 東京私学協会の会員校一覧ページ（中学/高校）向けパーサ。
 * 想定URL:
 *  - 中学: https://www.tokyoshigaku.com/schools/
 *  - 高校: https://www.tokyoshigaku.com/schools/highschool.html
 *
 * 形式が比較的素朴なため、見出し<h2>単位で切り出し、
 *  - 見出しテキスト: 学校名
 *  - 直後の a[href] (Web site) をサイトURL
 *  - 「〒」を含む行を住所
 *  - 住所以降に登場する電話番号行を電話
 */
export function parseTokyoSchools(html: string): SchoolRow[] {
  const schools: SchoolRow[] = [];
  const headingRe = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches: { nameRaw: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html))) {
    const nameRaw = m[1] ?? "";
    const start = m.index ?? 0;
    matches.push({ nameRaw, start, end: 0 });
  }
  for (let i = 0; i < matches.length; i++) {
    matches[i].end = i + 1 < matches.length ? matches[i + 1].start : html.length;
  }

  for (const item of matches) {
    const chunk = html.slice(item.start, item.end);
    const name = cleanText(item.nameRaw);
    const websiteMatch = chunk.match(/<a[^>]+href="([^"]+)"[^>]*>\s*(?:Web site|WEBサイト)/i);
    const addressMatch = chunk.match(/〒[\s\S]*?(?:(?:<br\s*\/?>)|\n)/i);
    const telMatch = chunk.match(/(?:TEL[:：]?|電話[:：]?)\s*([\d（）\(\)\-\s]+)|\b0\d{1,3}[-－]?\d{2,4}[-－]?\d{3,4}\b/);
    schools.push({
      name,
      website: websiteMatch ? normalizeUrl(websiteMatch[1]) : null,
      map: null,
      area: null,
      category: null,
      attributes: [],
      address: addressMatch ? cleanText(addressMatch[0]) : null,
      phone: telMatch ? cleanText(telMatch[1] || telMatch[0]) : null,
    });
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
