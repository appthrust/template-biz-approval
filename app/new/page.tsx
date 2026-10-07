import type { Metadata } from "next";
import { databaseStatus, listKinds, listNames } from "@/lib/db";
import { ConnectionNotice, PageHeader } from "../components";
import { RequestForm } from "../forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "新しい申請" };

export default async function NewRequest() {
  const status = await databaseStatus();
  const [kinds, names] = status === "ready" ? await Promise.all([listKinds(), listNames()]) : [[], []];
  return <><PageHeader title="新しい申請" description="種別を選んで内容を入力し、承認してほしい人を指定します。" />
    {status !== "ready" ? <ConnectionNotice status={status} /> : <div className="paper form-paper"><RequestForm kinds={kinds} names={names} /></div>}
  </>;
}
