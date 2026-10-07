import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { databaseStatus, getHistory, getRequest, listKinds, listNames } from "@/lib/db";
import { formatDate } from "@/lib/approval";
import { ConnectionNotice, PageHeader, StatusBadge } from "../../components";
import { DecisionForm, RequestForm } from "../../forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "申請の内容・履歴" };
const eventLabels = { submitted: "申請しました", approved: "承認しました", returned: "差し戻しました", resubmitted: "再申請しました" };

export default async function RequestDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  const status = await databaseStatus();
  if (status !== "ready") return <ConnectionNotice status={status} />;
  const request = await getRequest(Number(id));
  if (!request) notFound();
  const search = await searchParams;
  const history = await getHistory(request.id);
  if (search.edit === "1" && request.status === "returned") {
    const [kinds, names] = await Promise.all([listKinds(), listNames()]);
    return <><PageHeader title="修正して再申請" description="差戻しのコメントを確認して内容を直します。前の内容も履歴に残ります。" />
      <div className="notice"><strong>差戻しのコメント</strong><p className="pre-wrap">{history.find(event => event.action === "returned")?.comment}</p></div>
      <div className="paper form-paper"><RequestForm request={request} kinds={kinds} names={names} /></div></>;
  }
  return <>
    <Link className="back-link" href="/">← 申請ボードへ</Link>
    <PageHeader title={request.title} description={`${request.kind_name} ・ 申請 #${request.id}`} action={<StatusBadge status={request.status} />} />
    {search.saved === "1" && <p className="notice success" role="status">保存しました。内容と履歴に反映されています。</p>}
    <div className="detail-grid"><div>
      <section className="paper"><h2>申請内容</h2><dl className="details">
        <div><dt>申請者</dt><dd>{request.applicant}</dd></div><div><dt>承認者</dt><dd>{request.approver}</dd></div><div><dt>申請日時</dt><dd>{formatDate(request.created_at)}</dd></div>
        {request.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd className="pre-wrap">{request.answers[field.key] || "未記入"}</dd></div>)}
      </dl></section>
      <section className="history"><h2>履歴 <span className="count">{history.length}</span></h2><ol>{history.map(event => <li key={event.id}>
        <div className="history-heading"><strong>{eventLabels[event.action]}</strong><time>{formatDate(event.created_at)}</time></div><p className="hint">{event.actor}</p>
        {event.comment && <p className="history-comment pre-wrap">{event.comment}</p>}
        <details><summary>この時点の申請内容</summary><dl className="details"><div><dt>件名</dt><dd>{event.snapshot.title}</dd></div><div><dt>申請者</dt><dd>{event.snapshot.applicant}</dd></div><div><dt>承認者</dt><dd>{event.snapshot.approver}</dd></div>{event.snapshot.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd className="pre-wrap">{event.snapshot.answers[field.key] || "未記入"}</dd></div>)}</dl></details>
      </li>)}</ol></section>
    </div><aside className="paper decision">
      {request.status === "pending" ? <><h2>内容を確認する</h2><DecisionForm request={request} /></> : request.status === "returned" ? <><h2>見直して、もう一度</h2><p>履歴にある差戻しのコメントを確認し、内容を直して再申請できます。</p><Link href={`/requests/${request.id}?edit=1`} className="button">修正して再申請</Link></> : <><h2>承認が完了しました</h2><p>承認者のコメントは履歴で確認できます。承認済の内容は変更できません。</p><Link href="/new" className="button secondary">別の申請を作る</Link></>}
    </aside></div>
  </>;
}
