# 開発する人・AIへの指示

このアプリは「申請・承認」の業務ひな形です。READMEの操作方法・制約を先に確認してください。

## 構成とデータモデル

- `app/page.tsx`: 状態ボードと申請者名での絞り込み。
- `app/new`, `app/requests/[id]`, `app/kinds`: 新規申請、詳細・判断・履歴・再申請、種別管理。
- `app/forms.tsx`: `useActionState`で入力値とエラーを保持する画面。保存中の二重操作を抑止。
- `app/actions.ts`: Server Actions。期待する入力エラーは日本語で返し、成功時のみ再検証・リダイレクト。
- `lib/approval.ts`: ブラウザーで共有できる型、項目定義、検証、表示、CSVエスケープ。
- `lib/db.ts`: `pg`のサーバー専用接続、パラメーター化SQL、申請・履歴のトランザクション。
- `approval_kinds`: 種別名と`fields`（キー・表示名・形式・必須のJSONB配列）。
- `approval_requests`: 種別への参照、件名、申請者名、承認者名、項目定義の写し、回答、状態、楽観的排他用`version`、日時。
- `approval_events`: 申請への参照、操作、操作した名前、コメント、当時の申請内容の写し、日時。追記専用。

## 守る契約

1. `pending`からのみ承認・差戻し、`returned`からのみ再申請。承認済の変更を認めない。
2. 更新は行ロック+`version`確認。申請の更新と履歴の追加を必ず同じトランザクションで実施する。
3. 名前は自己申告。ログイン、本人確認、管理者だけの権限制御、通知があるかのように表示しない。追加の認証を勝手に作らない。
4. `pg`と環境変数をクライアントに取り込まない。生の接続情報・SQLエラーを画面に出さない。
5. 初期種別は経費・休暇・購買のみ。架空の申請を本番へ投入しない。
6. SQL変更は番号付き`db/migrations/*.sql`。再適用可能にする。AppThrustのDatabaseChangeが適用するため、起動時マイグレーションは禁止。
7. `Dockerfile`と`.github/workflows/deploy.yml`は変更しない。npmとlockfile、Next.js standalone、3000番ポートを維持。
8. ビルド時の保存先・外部フォントへの接続は不要。追加依存は目的が明確な場合のみ。
9. 日本語、ラベル付き入力、エラー・空・保存中状態、狭い画面での利用を維持する。

## 確認

Node.js 24で`npm ci && npm run build`。`node --test tests/approval.test.mjs`で純粋関数を確認します。実際のPostgreSQLとブラウザーでも申請→差戻し→修正再申請→承認、重複判断防止、種別追加、名前での絞り込み、CSVを確認してください。

## Next.jsの注意

このNext.jsは16.2.6です。慣れた旧APIを前提にせず、変更箇所に関する`node_modules/next/dist/docs/`を先に読んでください。ページの`params`と`searchParams`はPromiseです。
