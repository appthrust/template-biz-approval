import { exportRequests } from "@/lib/db";
import { csvCell, statusLabels } from "@/lib/approval";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const applicant = new URL(request.url).searchParams.get("applicant")?.trim() ?? "";
  if (applicant.length > 100) return new Response("申請者名は100文字以内で指定してください。", { status: 400 });
  try {
    const requests = await exportRequests(applicant);
    const rows = [["申請番号", "申請種別", "件名", "申請者", "承認者", "状態", "申請日時", "更新日時", "申請内容", "履歴"]];
    for (const item of requests) {
      const answers = Object.fromEntries(item.fields.map(field => [field.label, item.answers[field.key] ?? ""]));
      rows.push([String(item.id), item.kind_name, item.title, item.applicant, item.approver, statusLabels[item.status], item.created_at, item.updated_at, JSON.stringify(answers), JSON.stringify(item.history)]);
    }
    return new Response("\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n", {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="approval-requests.csv"', "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("書き出せませんでした。保存先の接続を確認して、もう一度お試しください。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
}
