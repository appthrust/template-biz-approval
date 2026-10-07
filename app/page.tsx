import Link from "next/link";
import { databaseStatus, listNames, listRequests } from "@/lib/db";
import { formatDate, statusLabels, type ApprovalStatus } from "@/lib/approval";
import { ConnectionNotice, PageHeader, StatusBadge } from "./components";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ applicant?: string; view?: string }> }) {
  const params = await searchParams;
  const mine = params.view === "mine";
  const applicant = typeof params.applicant === "string" ? params.applicant.trim() : "";
  const status = await databaseStatus();
  const [requests, names] = status === "ready" ? await Promise.all([mine && !applicant ? Promise.resolve([]) : listRequests(mine ? applicant : ""), listNames()]) : [[], []];
  return <>
    <PageHeader title={mine ? "自分の申請" : "申請ボード"} description={mine ? "申請者名を入れると、あなたの申請をまとめて確認できます。" : "出した申請も、届いた申請も。いまの状態がひと目で分かります。"} action={<Link href="/new" className="button">新しい申請</Link>} />
    <nav className="tabs" aria-label="申請の表示"><Link href="/" aria-current={!mine ? "page" : undefined}>すべての申請</Link><Link href="/?view=mine" aria-current={mine ? "page" : undefined}>自分の申請</Link></nav>
    {status !== "ready" ? <ConnectionNotice status={status} /> : <>
      {mine && <form method="get" className="filter"><input type="hidden" name="view" value="mine" /><label>申請者名<input name="applicant" defaultValue={applicant} list="applicants" maxLength={100} required /></label><datalist id="applicants">{names.map(name => <option key={name} value={name} />)}</datalist><button className="secondary">表示する</button><span className="hint">名前が完全に一致する申請を表示します。</span></form>}
      {mine && !applicant ? <div className="empty"><h2>まずは申請者名を入力</h2><p>申請したときと同じ名前を使ってください。</p></div> : <>
        <div className="list-toolbar"><p>{mine ? `${applicant} さんの申請` : "すべての申請"} <strong>{requests.length}</strong> 件</p><a className="button secondary" href={`/export?applicant=${encodeURIComponent(mine ? applicant : "")}`}>CSV 書き出し</a></div>
        <div className="board">{(Object.keys(statusLabels) as ApprovalStatus[]).map(state => {
          const items = requests.filter(request => request.status === state);
          return <section key={state} className={`board-column ${state}`} aria-label={statusLabels[state]}><h2><StatusBadge status={state} /><span className="count">{items.length}</span></h2>
            {items.length === 0 ? <p className="column-empty">{statusLabels[state]}の申請はありません。</p> : items.map(request => <Link href={`/requests/${request.id}`} className="request-card" key={request.id}>
              <div className="card-meta"><span>{request.kind_name}</span><span>#{request.id}</span></div><h3>{request.title}</h3>
              <dl><div><dt>申請者</dt><dd>{request.applicant}</dd></div><div><dt>承認者</dt><dd>{request.approver}</dd></div></dl>
              <p className="card-date">{formatDate(request.updated_at)}</p><span className="card-link">内容・履歴を見る →</span>
            </Link>)}
          </section>;
        })}</div>
        {requests.length === 0 && <div className="empty"><h2>最初の申請を出してみましょう</h2><p>経費・休暇・購買のフォームが用意されています。</p><Link className="button secondary" href="/new">申請を作る</Link></div>}
      </>}
    </>}
  </>;
}
