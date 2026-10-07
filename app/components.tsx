import Link from "next/link";
import { statusLabels, type ApprovalStatus } from "@/lib/approval";
import type { DatabaseStatus } from "@/lib/db";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return <span className={`status ${status}`}>{statusLabels[status]}</span>;
}

export function ConnectionNotice({ status }: { status: DatabaseStatus }) {
  const messages = {
    ready: "",
    "missing-url": "保存先がまだつながっていません。基盤の担当者に、保存先の接続を依頼してください。",
    "migration-pending": "保存先を準備しています。しばらくしてから再読み込みしてください。続く場合は、基盤の担当者に準備状況を確認してください。",
    unavailable: "保存先に接続できません。少し待って再読み込みしてください。続く場合は、基盤の担当者にお知らせください。",
  };
  return <div className="notice" role="status"><h2>まだ申請を使えません</h2><p>{messages[status]}</p><Link href="/" className="button secondary">再読み込み</Link></div>;
}
