import type { Metadata } from "next";
import { databaseStatus, listKinds } from "@/lib/db";
import { fieldTypeLabels } from "@/lib/approval";
import { ConnectionNotice, PageHeader } from "../components";
import { KindForm } from "../forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "申請種別の管理" };

export default async function Kinds({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const status = await databaseStatus();
  const kinds = status === "ready" ? await listKinds() : [];
  const { saved } = await searchParams;
  return <><PageHeader title="申請種別の管理" description="管理する人向け。仕事に合うフォームを、項目名と形式で追加できます。" />
    {status !== "ready" ? <ConnectionNotice status={status} /> : <>
      {saved === "1" && <p className="notice success" role="status">申請種別を追加しました。新しい申請で選べます。</p>}
      <p className="notice">このアプリには権限の区別がありません。開ける人は誰でも種別を追加できます。社内の運用ルールを決めてお使いください。</p>
      <div className="kinds-grid"><section><h2>使える種別 <span className="count">{kinds.length}</span></h2><div className="kind-list">{kinds.map(kind => <article key={kind.id} className="paper"><h3>{kind.name}</h3><p className="hint">{kind.description}</p><ul>{kind.fields.map(field => <li key={field.key}><span>{field.label}</span><span className="hint">{fieldTypeLabels[field.type]}・{field.required ? "必須" : "任意"}</span></li>)}</ul></article>)}</div></section>
      <section className="paper"><h2>種別を追加する</h2><KindForm /></section></div>
    </>}
  </>;
}
