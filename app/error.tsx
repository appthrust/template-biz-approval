"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="notice error" role="alert"><h1>読み込めませんでした</h1><p>少し待ってから、もう一度お試しください。続く場合は基盤の担当者にお知らせください。</p><div className="form-actions"><button onClick={reset}>もう一度読み込む</button><a className="button secondary" href="/">申請ボードへ</a></div></div>;
}
