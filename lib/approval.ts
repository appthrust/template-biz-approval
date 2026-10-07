export const statusLabels = { pending: "申請中", approved: "承認済", returned: "差戻し" } as const;
export type ApprovalStatus = keyof typeof statusLabels;
export const fieldTypeLabels = { text: "短い文章", textarea: "長い文章", number: "数値", date: "日付" } as const;
export type FieldType = keyof typeof fieldTypeLabels;
export interface ApprovalField { key: string; label: string; type: FieldType; required: boolean }
export interface ApprovalKind { id: number; name: string; description: string; fields: ApprovalField[] }
export interface ApprovalRequest {
  id: number; kind_id: number; kind_name: string; title: string; applicant: string;
  approver: string; fields: ApprovalField[]; answers: Record<string, string>;
  status: ApprovalStatus; version: number; created_at: string; updated_at: string;
}
export interface ApprovalEvent {
  id: number; action: "submitted" | "approved" | "returned" | "resubmitted";
  actor: string; comment: string; snapshot: Pick<ApprovalRequest, "title" | "applicant" | "approver" | "answers" | "fields">;
  created_at: string;
}
export type ActionState = { error: string };
export class InputError extends Error {}

export function text(form: FormData, key: string, label: string, max = 100, required = true): string {
  const raw = form.get(key);
  const value = typeof raw === "string" ? raw.trim() : "";
  if (required && !value) throw new InputError(`${label}を入力してください。`);
  if (value.length > max) throw new InputError(`${label}は${max}文字以内で入力してください。`);
  return value;
}

export function positiveId(value: unknown): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw new InputError("申請または種別が見つかりません。一覧から開き直してください。");
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw new InputError("申請または種別が見つかりません。一覧から開き直してください。");
  return id;
}

export function parseFields(raw: string): ApprovalField[] {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new InputError("入力項目を確認してください。"); }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20) throw new InputError("入力項目は1〜20個にしてください。");
  const labels = new Set<string>();
  return parsed.map((item: unknown, index) => {
    if (typeof item !== "object" || item === null || !("label" in item) || !("type" in item) || !("required" in item)) throw new InputError("入力項目を確認してください。");
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label || label.length > 60) throw new InputError("項目名は1〜60文字で入力してください。");
    if (labels.has(label)) throw new InputError("項目名が重複しています。別の名前にしてください。");
    if (typeof item.type !== "string" || !Object.hasOwn(fieldTypeLabels, item.type) || typeof item.required !== "boolean") throw new InputError("項目の形式を選んでください。");
    labels.add(label);
    return { key: `field_${index + 1}`, label, type: item.type as FieldType, required: item.required };
  });
}

export function parseAnswers(form: FormData, fields: ApprovalField[]): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const field of fields) {
    const value = text(form, `answer_${field.key}`, field.label, 2000, field.required);
    if (value && field.type === "number" && (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))) throw new InputError(`${field.label}は0以上の数値で入力してください。`);
    if (value && field.type === "date") {
      const date = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new InputError(`${field.label}は正しい日付を入力してください。`);
    }
    answers[field.key] = value;
  }
  return answers;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function csvCell(value: string): string {
  // Excel 等で申請内容が数式として実行されないようにする。
  const safe = /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
