import { NextResponse } from "next/server";

type ExamSchedule = {
  title: string;
  period: string;
  detail: string;
};

type School = {
  id: string;
  name: string;
  location: string;
  deviation?: string;
  generalExams: ExamSchedule[];
  recommendationExams: ExamSchedule[];
  application: {
    method: string;
    url?: string;
    note?: string;
  };
  examCalendar: ExamSchedule[];
};

const mockSchools: School[] = [
  {
    id: "dokkyo",
    name: "獨協大学",
    location: "埼玉県草加市 / 首都圏",
    deviation: "偏差値目安: 52.5 - 57.5",
    generalExams: [
      { title: "一般選抜 前期", period: "出願 1/4 - 1/22 / 試験 2/4", detail: "共通テスト利用＋個別学力試験" },
      { title: "一般選抜 後期", period: "出願 2/6 - 2/27 / 試験 3/5", detail: "共通テスト利用・面接" },
    ],
    recommendationExams: [
      { title: "学校推薦型選抜（公募）", period: "出願 10/1 - 10/20 / 試験 11/11", detail: "書類＋面接、小論文あり" },
      { title: "総合型選抜", period: "出願 9/1 - 9/25 / 試験 10/8", detail: "プレゼンテーション・面接" },
    ],
    application: {
      method: "インターネット出願（マイページ登録）",
      url: "https://www.dokkyo.ac.jp/",
      note: "出願料決済後に受験票をダウンロード",
    },
    examCalendar: [
      { title: "出願開始", period: "1/4", detail: "一般前期" },
      { title: "試験日", period: "2/4", detail: "一般前期・学部別" },
      { title: "合格発表", period: "2/15", detail: "Web発表・郵送なし" },
    ],
  },
  {
    id: "ompu",
    name: "大阪医科薬科大学",
    location: "大阪府高槻市 / 近畿",
    deviation: "偏差値目安: 65.0 - 70.0",
    generalExams: [
      { title: "一般選抜 医学部", period: "出願 12/18 - 1/15 / 試験 2/1", detail: "数学・理科・英語の学力試験" },
      { title: "一般選抜 薬学部", period: "出願 12/18 - 1/22 / 試験 2/4", detail: "英語・化学を中心に評価" },
    ],
    recommendationExams: [
      { title: "学校推薦型選抜（医学部）", period: "出願 11/1 - 11/15 / 試験 12/2", detail: "書類・面接・小論文" },
    ],
    application: {
      method: "インターネット出願",
      note: "顔写真データアップロード必須",
    },
    examCalendar: [
      { title: "出願開始", period: "12/18", detail: "一般全学部" },
      { title: "試験日", period: "2/1 - 2/4", detail: "学部により異なる" },
      { title: "合格発表", period: "2/10 以降", detail: "Web発表" },
    ],
  },
  {
    id: "tottori",
    name: "鳥取大学",
    location: "鳥取県鳥取市 / 中国地方",
    deviation: "偏差値目安: 47.5 - 60.0",
    generalExams: [
      { title: "一般選抜 前期", period: "試験 2/25", detail: "共通テスト＋個別（数学/理科/外国語）" },
      { title: "一般選抜 後期", period: "試験 3/12", detail: "面接・小論文中心" },
    ],
    recommendationExams: [
      { title: "学校推薦型選抜", period: "試験 11/25", detail: "書類・面接" },
    ],
    application: {
      method: "インターネット出願",
      note: "検定料はクレジット/コンビニ決済",
    },
    examCalendar: [
      { title: "出願", period: "1/22 - 1/31", detail: "前期・後期共通" },
      { title: "合格発表", period: "3/6（前期）/ 3/20（後期）", detail: "Web発表" },
    ],
  },
];

export async function GET() {
  return NextResponse.json({
    source: "mock",
    count: mockSchools.length,
    schools: mockSchools,
    updatedAt: new Date().toISOString(),
  });
}
