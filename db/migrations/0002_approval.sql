CREATE TABLE IF NOT EXISTS approval_kinds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '',
  fields JSONB NOT NULL CHECK (jsonb_typeof(fields) = 'array' AND jsonb_array_length(fields) BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id SERIAL PRIMARY KEY,
  kind_id INTEGER NOT NULL REFERENCES approval_kinds(id),
  kind_name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  applicant TEXT NOT NULL CHECK (char_length(applicant) BETWEEN 1 AND 100),
  approver TEXT NOT NULL CHECK (char_length(approver) BETWEEN 1 AND 100),
  fields JSONB NOT NULL,
  answers JSONB NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'returned')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS approval_requests_applicant_idx ON approval_requests (applicant, id DESC);
CREATE INDEX IF NOT EXISTS approval_requests_status_idx ON approval_requests (status, id DESC);

CREATE TABLE IF NOT EXISTS approval_events (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES approval_requests(id),
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'returned', 'resubmitted')),
  actor TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS approval_events_request_idx ON approval_events (request_id, id);

INSERT INTO approval_kinds (name, description, fields) VALUES
('経費', '交通費や立替経費の精算に。', '[{"key":"amount","label":"金額（円）","type":"number","required":true},{"key":"spent_on","label":"利用日","type":"date","required":true},{"key":"purpose","label":"用途・理由","type":"textarea","required":true}]'),
('休暇', '休暇の期間と理由を届けます。', '[{"key":"start_on","label":"開始日","type":"date","required":true},{"key":"end_on","label":"終了日","type":"date","required":true},{"key":"reason","label":"理由・連絡事項","type":"textarea","required":false}]'),
('購買', '備品や消耗品の購入前に。', '[{"key":"item","label":"購入するもの","type":"text","required":true},{"key":"quantity","label":"数量","type":"number","required":true},{"key":"amount","label":"予定金額（円）","type":"number","required":true},{"key":"purpose","label":"購入理由","type":"textarea","required":true}]')
ON CONFLICT (name) DO NOTHING;
