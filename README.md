# 申請・承認

経費・休暇・購買を、申請 → 承認 / 差戻し → 履歴まで管理する社内アプリのひな形です。Next.js App Router、Server Actions、PostgreSQL（`pg`）を使います。スマートフォンでも申請・確認できます。

## できること

- 申請ボードで「申請中 / 承認済 / 差戻し」を確認。
- 「新しい申請」で種別・件名・申請者名・承認者名と入力項目を記入。以前使った名前も選べます。
- 承認者へ詳細ページのURLを共有し、承認者名とコメントを入力して「承認する / 差し戻す」。両方ともコメント必須。
- 差戻しされた申請は、内容を直しコメントを添えて再申請。承認済は変更できません。
- 履歴には操作した人・日時・コメント・その時点の申請内容が残ります。
- 「自分の申請」は申請者名の完全一致で絞り込みます（前後の空白は除去）。
- 管理する人は「種別の管理」で種別を追加。項目名・短い文章 / 長い文章 / 数値 / 日付・必須 / 任意を指定（1〜20項目）。既存の申請種別の編集・削除は行いません。
- CSV書き出しは、表示中の全申請または申請者で絞った全申請を出力。申請内容と全履歴はJSON列です。UTF-8 BOM付き、カンマ・改行・引用符をエスケープし、数式として解釈される値を無害化します。

## 名前と公開範囲について

**このアプリ自体にはログイン・権限の区別・本人確認・メール通知がありません。** 管理者向けの種別追加も、アプリを開ける人は誰でも操作できます。入力した承認者名は業務上の宛先であり、認証情報ではありません。名前が一致すれば承認操作ができるため、監査・本人性の保証を要する用途には使わないでください。

AppThrustの入口で必要なSSO・公開範囲を設定し、信頼できる社内の利用者だけに公開してください。自分の申請による絞り込みは閲覧制限ではありません。承認依頼はURLを手動で共有します。

## 初期の申請種別

| 種別 | 項目 |
| --- | --- |
| 経費 | 金額（円）、利用日、用途・理由 |
| 休暇 | 開始日、終了日、理由・連絡事項（任意） |
| 購買 | 購入するもの、数量、予定金額（円）、購入理由 |

数値は0以上、日付は実在する日付を受け付けます。休暇の終了日は開始日以降です。申請のサンプル行は投入しません。

## ローカルで動かす

Node.js 24 と PostgreSQL を用意します。

```bash
npm ci
export DATABASE_URL='postgresql://app:password@localhost:5432/app'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0002_approval.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0003_labels.sql
npm run dev
```

`http://localhost:3000` を開きます。接続が未設定・準備中・利用不可の場合は、その理由と次の操作を表示し、保存を始めません。秘密の接続情報は画面に出しません。

AppThrustでは接続から`DATABASE_URL`が渡され、`db/migrations/*.sql` は基盤の **DatabaseChange** が適用します。**アプリ起動時にマイグレーションは実行しません。** SQLは再適用でき、初期種別の重複を作りません。`0001_init.sql` は元ひな形の履歴として保持していますが、旧メッセージ機能は使いません。`0002_approval.sql` は申請・承認の表と初期種別を作成し、`0003_labels.sql` はコンソールのデータタブで使う日本語の表名・列名を設定します。

## データモデル

| テーブル | 主な列・役割 |
| --- | --- |
| `approval_kinds` | `id`, 一意の`name`, `description`, `fields`（JSONBの項目配列）、`created_at` |
| `approval_requests` | `id`, `kind_id`（種別への外部キー）, `kind_name`, `title`, `applicant`, `approver`, `fields`（項目定義の写し）, `answers`（項目キー→文字列のJSONB）, `status`, `version`, 作成・更新日時 |
| `approval_events` | `id`, `request_id`（申請への外部キー）, `action`, `actor`, `comment`, `snapshot`（件名・両者名・項目定義・回答の写し）, `created_at` |

状態は `pending`（申請中）→ `approved`（承認済）または `returned`（差戻し）。`returned`のみ再申請で`pending`に戻せます。履歴操作は`submitted / approved / returned / resubmitted`。申請更新と履歴追加は1トランザクションで行います。行ロックと`version`の照合により、古い画面からの承認や二重操作で履歴を上書きしません。

## 開発・公開

```bash
node --test tests/approval.test.mjs
npm run build
```

ビルドに接続情報・保存先・外部フォント取得は不要です。`Dockerfile`、`.github/workflows/deploy.yml`、`output: "standalone"` は元の`appthrust/template-nextjs`規約を維持します。`main`へのpushでActionsが`ghcr.io/appthrust/template-biz-approval:edge-<日時>`を生成します。パッケージをpublicにしてからひな形として利用してください。
