export type ParsedExam = {
  id: string;
  name: string;
  location?: string;
  deviation?: string;
  examCalendar: ParsedSection[];
  recommendationExams: ParsedSection[];
  generalExams: ParsedSection[];
  application: {
    method?: string;
    url?: string;
    note?: string;
  };
};

export type ParsedSection = {
  title: string;
  period: string;
  detail?: string;
};

/**
 * Passnavi の HTML から最小限の情報を抽出するためのひな型。
 * 依存を増やさないために、実際のCSSセレクタ実装は後続で追加予定。
 *
 * - 想定入力: 大学詳細ページ（一般/推薦/出願/日程が含まれるページ）
 * - TODO: 実際の HTML 構造を確認し、セクションごとのセレクタを実装する
 */
export function parseExamHtml(html: string, opts?: { fallbackId?: string; nameHint?: string }): ParsedExam {
  const clean = html ?? "";
  const fallbackId = opts?.fallbackId || `tmp-${Math.random().toString(16).slice(2, 8)}`;

  // TODO: セクション抽出（CSSセレクタ実装）
  // - 入試日程: 「入試日程」テーブル/リスト
  // - 推薦試験: 「推薦」や「学校推薦型選抜」セクション
  // - 一般試験: 「一般選抜」セクション
  // - 出願: 出願方法・URL・備考
  //
  // 現状は空データを返し、スクレイプ実装時にここを置き換える。

  return {
    id: fallbackId,
    name: opts?.nameHint || "unknown",
    location: undefined,
    deviation: undefined,
    examCalendar: [],
    recommendationExams: [],
    generalExams: [],
    application: { method: undefined, url: undefined, note: undefined },
    // 将来: メモ/学部別などを拡張する
  };
}
