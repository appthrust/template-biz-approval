import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: { default: "申請ボード – 申請・承認", template: "%s – 申請・承認" },
  description: "経費・休暇・購買の申請から承認、差戻し、履歴の確認まで。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <a href="#main" className="skip-link">本文へ移動</a>
        <header className="site-header"><div className="shell">
          <a href="/" className="brand"><span aria-hidden="true" className="brand-mark">承</span>申請・承認</a>
          <nav aria-label="メインメニュー"><a href="/">申請ボード</a><a href="/?view=mine">自分の申請</a><a href="/kinds">種別の管理</a></nav>
        </div></header>
        <main id="main" className="shell main-content">{children}</main>
        <footer className="shell site-footer">名前でつなぐ、チームの申請。<span>本人確認やメール通知は行いません。URLを共有してお使いください。</span></footer>
      </body>
    </html>
  );
}
