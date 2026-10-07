"use client";

import { useActionState, useState } from "react";
import { saveDecision, saveKind, saveRequest } from "./actions";
import { fieldTypeLabels, type ApprovalField, type ApprovalKind, type ApprovalRequest, type FieldType } from "@/lib/approval";

export function RequestForm({ kinds, names, request }: { kinds: ApprovalKind[]; names: string[]; request?: ApprovalRequest }) {
  const [state, action, pending] = useActionState(saveRequest, { error: "" });
  const [kindId, setKindId] = useState(request?.kind_id ?? kinds[0]?.id);
  const [draft, setDraft] = useState({ title: request?.title ?? "", applicant: request?.applicant ?? "", approver: request?.approver ?? "", comment: "" });
  const [answers, setAnswers] = useState<Record<string, string>>(request?.answers ?? {});
  const kind = kinds.find(item => item.id === kindId);
  const fields = request?.fields ?? kind?.fields ?? [];
  return <form action={action} className="form-stack">
    {request && <><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="version" value={request.version} /></>}
    <fieldset disabled={pending} className="form-stack">
      <label>申請種別<select name="kindId" value={kindId} disabled={Boolean(request)} onChange={event => { setKindId(Number(event.target.value)); setAnswers({}); }}>
        {kinds.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <p className="hint">{kind?.description}</p>
      <label>件名 <span className="required">必須</span><input name="title" required maxLength={120} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
      <div className="form-pair">
        <label>申請者名 <span className="required">必須</span><input name="applicant" required maxLength={100} list="people" value={draft.applicant} onChange={event => setDraft({ ...draft, applicant: event.target.value })} autoComplete="name" /></label>
        <label>承認者名 <span className="required">必須</span><input name="approver" required maxLength={100} list="people" value={draft.approver} onChange={event => setDraft({ ...draft, approver: event.target.value })} /></label>
      </div>
      <datalist id="people">{names.map(name => <option key={name} value={name} />)}</datalist>
      <p className="hint">名前を入力するか、これまで使った名前から選べます。承認者へ、この申請のURLを共有してください。</p>
      <div className="field-section">
        <h2>申請内容</h2>
        {fields.map(field => <label key={field.key}>{field.label} <span className={field.required ? "required" : "hint"}>{field.required ? "必須" : "任意"}</span>
          {field.type === "textarea" ? <textarea name={`answer_${field.key}`} required={field.required} maxLength={2000} rows={4} value={answers[field.key] ?? ""} onChange={event => setAnswers({ ...answers, [field.key]: event.target.value })} /> : <input name={`answer_${field.key}`} type={field.type} required={field.required} maxLength={2000} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? "any" : undefined} value={answers[field.key] ?? ""} onChange={event => setAnswers({ ...answers, [field.key]: event.target.value })} />}
        </label>)}
      </div>
      {request && <label>再申請のコメント <span className="required">必須</span><textarea name="comment" required maxLength={2000} rows={3} value={draft.comment} onChange={event => setDraft({ ...draft, comment: event.target.value })} /><span className="hint">どこを直したか、承認者に伝えましょう。</span></label>}
    </fieldset>
    {state.error && <p role="alert" className="notice error">{state.error}</p>}
    <div className="form-actions"><button disabled={pending || !kind}>{pending ? "送信しています…" : request ? "修正して再申請する" : "申請する"}</button><a href={request ? `/requests/${request.id}` : "/"} className="button secondary">キャンセル</a></div>
    <p className="hint">名前は自己申告です。ログインや本人確認、メール通知は行いません。</p>
  </form>;
}

export function DecisionForm({ request }: { request: ApprovalRequest }) {
  const [state, action, pending] = useActionState(saveDecision, { error: "" });
  const [actor, setActor] = useState("");
  const [comment, setComment] = useState("");
  return <form action={action} className="form-stack">
    <input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="version" value={request.version} />
    <p><strong>{request.approver}</strong> さんへの申請です。</p>
    <fieldset disabled={pending} className="form-stack">
      <label>確認する人の名前 <span className="required">必須</span><input name="actor" required maxLength={100} value={actor} onChange={event => setActor(event.target.value)} /><span className="hint">承認者と同じ名前を入力します。本人確認ではありません。</span></label>
      <label>コメント <span className="required">必須</span><textarea name="comment" required maxLength={2000} rows={4} value={comment} onChange={event => setComment(event.target.value)} /><span className="hint">承認のひと言や、見直してほしい点を残せます。</span></label>
    </fieldset>
    {state.error && <p role="alert" className="notice error">{state.error}</p>}
    <div className="form-actions"><button name="decision" value="approved" disabled={pending}>{pending ? "保存しています…" : "承認する"}</button><button className="secondary" name="decision" value="returned" disabled={pending}>差し戻す</button></div>
  </form>;
}

export function KindForm() {
  const [state, action, pending] = useActionState(saveKind, { error: "" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<ApprovalField[]>([{ key: "1", label: "", type: "text", required: true }]);
  const update = (index: number, patch: Partial<ApprovalField>) => setFields(fields.map((field, current) => current === index ? { ...field, ...patch } : field));
  return <form action={action} className="form-stack">
    <input type="hidden" name="fields" value={JSON.stringify(fields)} />
    <fieldset disabled={pending} className="form-stack">
      <label>種別名 <span className="required">必須</span><input name="name" required maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>説明 <span className="hint">任意</span><input name="description" maxLength={240} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <div className="field-section"><h3>入力項目</h3><p className="hint">項目名と形式を選ぶだけ。20個まで追加できます。</p>
        {fields.map((field, index) => <div className="kind-field" key={field.key}>
          <label>項目名 {index + 1}<input aria-label={`項目名 ${index + 1}`} required maxLength={60} value={field.label} onChange={event => update(index, { label: event.target.value })} /></label>
          <label>形式<select aria-label={`形式 ${index + 1}`} value={field.type} onChange={event => update(index, { type: event.target.value as FieldType })}>{Object.entries(fieldTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="checkbox"><input type="checkbox" checked={field.required} onChange={event => update(index, { required: event.target.checked })} />必須</label>
          <button type="button" className="secondary" disabled={fields.length === 1} aria-label={`項目 ${index + 1} を外す`} onClick={() => setFields(fields.filter((_, current) => current !== index))}>外す</button>
        </div>)}
        <button type="button" className="secondary" disabled={fields.length >= 20} onClick={() => setFields([...fields, { key: crypto.randomUUID(), label: "", type: "text", required: false }])}>項目を追加</button>
      </div>
    </fieldset>
    {state.error && <p role="alert" className="notice error">{state.error}</p>}
    <button disabled={pending}>{pending ? "保存しています…" : "申請種別を追加する"}</button>
  </form>;
}
