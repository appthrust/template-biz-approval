import { Pool, type PoolClient } from "pg";
import { InputError, parseAnswers, positiveId, text, type ApprovalEvent, type ApprovalKind, type ApprovalRequest } from "./approval";

let pool: Pool | undefined;
export type DatabaseStatus = "ready" | "missing-url" | "migration-pending" | "unavailable";

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("Database connection is not configured");
  pool ??= new Pool({ connectionString, max: 4, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000 });
  return pool;
}

async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function databaseStatus(): Promise<DatabaseStatus> {
  if (!process.env.DATABASE_URL?.trim()) return "missing-url";
  try {
    await getPool().query("SELECT 1 FROM approval_kinds, approval_requests, approval_events LIMIT 0");
    return "ready";
  } catch (error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "42P01" ? "migration-pending" : "unavailable";
  }
}

export async function listKinds(): Promise<ApprovalKind[]> {
  return (await getPool().query<ApprovalKind>("SELECT id, name, description, fields FROM approval_kinds ORDER BY id")).rows;
}

export async function listRequests(applicant = ""): Promise<ApprovalRequest[]> {
  return (await getPool().query<ApprovalRequest>(
    "SELECT *, created_at::text, updated_at::text FROM approval_requests WHERE ($1 = '' OR applicant = $1) ORDER BY id DESC", [applicant],
  )).rows;
}

export async function listNames(): Promise<string[]> {
  return (await getPool().query<{ name: string }>("SELECT applicant AS name FROM approval_requests UNION SELECT approver AS name FROM approval_requests ORDER BY name")).rows.map(row => row.name);
}

export async function getRequest(id: number): Promise<ApprovalRequest | undefined> {
  return (await getPool().query<ApprovalRequest>("SELECT *, created_at::text, updated_at::text FROM approval_requests WHERE id = $1", [id])).rows[0];
}

export async function getHistory(id: number): Promise<ApprovalEvent[]> {
  return (await getPool().query<ApprovalEvent>("SELECT id, action, actor, comment, snapshot, created_at::text FROM approval_events WHERE request_id = $1 ORDER BY id DESC", [id])).rows;
}

async function recordEvent(client: PoolClient, request: ApprovalRequest, action: ApprovalEvent["action"], actor: string, comment: string) {
  const { title, applicant, approver, answers, fields } = request;
  await client.query("INSERT INTO approval_events (request_id, action, actor, comment, snapshot) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [request.id, action, actor, comment, JSON.stringify({ title, applicant, approver, answers, fields })]);
}

const staleMessage = "ほかの人がこの申請を更新しました。ページを再読み込みして、最新の内容を確認してください。";

export async function submitApproval(form: FormData): Promise<number> {
  const title = text(form, "title", "件名", 120);
  const applicant = text(form, "applicant", "申請者名");
  const approver = text(form, "approver", "承認者名");
  const editId = form.get("requestId");
  return transaction(async client => {
    let existing: ApprovalRequest | undefined;
    if (editId) {
      const id = positiveId(editId);
      existing = (await client.query<ApprovalRequest>("SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE", [id])).rows[0];
      if (!existing) throw new InputError("申請が見つかりません。一覧から開き直してください。");
      if (existing.status !== "returned" || existing.version !== positiveId(form.get("version"))) throw new InputError(staleMessage);
    }
    const kindId = existing?.kind_id ?? positiveId(form.get("kindId"));
    const kind = (await client.query<ApprovalKind>("SELECT id, name, description, fields FROM approval_kinds WHERE id = $1", [kindId])).rows[0];
    if (!kind) throw new InputError("申請種別を選び直してください。");
    const fields = existing?.fields ?? kind.fields;
    const answers = parseAnswers(form, fields);
    if (kind.name === "休暇" && answers.start_on && answers.end_on && answers.end_on < answers.start_on) throw new InputError("終了日は開始日以降にしてください。");
    let request: ApprovalRequest;
    if (existing) {
      request = (await client.query<ApprovalRequest>("UPDATE approval_requests SET title=$1, applicant=$2, approver=$3, answers=$4::jsonb, status='pending', version=version+1, updated_at=NOW() WHERE id=$5 RETURNING *", [title, applicant, approver, JSON.stringify(answers), existing.id])).rows[0];
    } else {
      request = (await client.query<ApprovalRequest>("INSERT INTO approval_requests (kind_id, kind_name, title, applicant, approver, fields, answers) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) RETURNING *", [kind.id, kind.name, title, applicant, approver, JSON.stringify(fields), JSON.stringify(answers)])).rows[0];
    }
    await recordEvent(client, request, existing ? "resubmitted" : "submitted", applicant, existing ? text(form, "comment", "再申請のコメント", 2000) : "");
    return request.id;
  });
}

export async function decideApproval(form: FormData): Promise<number> {
  const id = positiveId(form.get("requestId"));
  const version = positiveId(form.get("version"));
  const action = form.get("decision");
  if (action !== "approved" && action !== "returned") throw new InputError("承認または差戻しを選んでください。");
  const actor = text(form, "actor", "確認する人の名前");
  const comment = text(form, "comment", "コメント", 2000);
  return transaction(async client => {
    const request = (await client.query<ApprovalRequest>("SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE", [id])).rows[0];
    if (!request) throw new InputError("申請が見つかりません。一覧から開き直してください。");
    if (request.status !== "pending" || request.version !== version) throw new InputError(staleMessage);
    if (actor !== request.approver) throw new InputError("承認者名と同じ名前を入力してください。本人確認を行う機能ではありません。");
    await client.query("UPDATE approval_requests SET status=$1, version=version+1, updated_at=NOW() WHERE id=$2", [action, id]);
    await recordEvent(client, request, action, actor, comment);
    return id;
  });
}

export async function insertKind(name: string, description: string, fields: ApprovalKind["fields"]) {
  const result = await getPool().query("INSERT INTO approval_kinds (name, description, fields) VALUES ($1, $2, $3::jsonb) ON CONFLICT (name) DO NOTHING RETURNING id", [name, description, JSON.stringify(fields)]);
  if (!result.rowCount) throw new InputError("同じ名前の申請種別があります。別の名前にしてください。");
}

export async function exportRequests(applicant: string) {
  return (await getPool().query<ApprovalRequest & { history: ApprovalEvent[] }>(`
    SELECT r.*, r.created_at::text, r.updated_at::text,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('action', e.action, 'actor', e.actor, 'comment', e.comment, 'snapshot', e.snapshot, 'created_at', e.created_at) ORDER BY e.id)
        FROM approval_events e WHERE e.request_id = r.id), '[]'::jsonb) AS history
    FROM approval_requests r WHERE ($1 = '' OR r.applicant = $1) ORDER BY r.id DESC
  `, [applicant])).rows;
}
