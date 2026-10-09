-- コンソールのデータタブに表示する日本語の表名・列名
COMMENT ON TABLE appthrust_demo_messages IS 'メッセージ';
COMMENT ON COLUMN appthrust_demo_messages.id IS '番号';
COMMENT ON COLUMN appthrust_demo_messages.body IS '@long 本文';
COMMENT ON COLUMN appthrust_demo_messages.created_at IS '登録日時';

COMMENT ON TABLE approval_kinds IS '申請種別';
COMMENT ON COLUMN approval_kinds.id IS '番号';
COMMENT ON COLUMN approval_kinds.name IS '種別名';
COMMENT ON COLUMN approval_kinds.description IS '@long 説明';
COMMENT ON COLUMN approval_kinds.fields IS '入力項目';
COMMENT ON COLUMN approval_kinds.created_at IS '登録日時';

COMMENT ON TABLE approval_requests IS '申請';
COMMENT ON COLUMN approval_requests.id IS '番号';
COMMENT ON COLUMN approval_requests.kind_id IS '申請種別';
COMMENT ON COLUMN approval_requests.kind_name IS '種別名';
COMMENT ON COLUMN approval_requests.title IS '件名';
COMMENT ON COLUMN approval_requests.applicant IS '申請者';
COMMENT ON COLUMN approval_requests.approver IS '承認者';
COMMENT ON COLUMN approval_requests.fields IS '入力項目';
COMMENT ON COLUMN approval_requests.answers IS '申請内容';
COMMENT ON COLUMN approval_requests.status IS '状態';
COMMENT ON COLUMN approval_requests.version IS '@hidden';
COMMENT ON COLUMN approval_requests.created_at IS '登録日時';
COMMENT ON COLUMN approval_requests.updated_at IS '更新日時';

COMMENT ON TABLE approval_events IS '申請履歴';
COMMENT ON COLUMN approval_events.id IS '番号';
COMMENT ON COLUMN approval_events.request_id IS '申請';
COMMENT ON COLUMN approval_events.action IS '操作';
COMMENT ON COLUMN approval_events.actor IS '操作者';
COMMENT ON COLUMN approval_events.comment IS '@long コメント';
COMMENT ON COLUMN approval_events.snapshot IS '申請内容の控え';
COMMENT ON COLUMN approval_events.created_at IS '登録日時';
