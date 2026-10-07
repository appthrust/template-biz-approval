import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, parseAnswers, parseFields, positiveId, text } from "../lib/approval.ts";

const form = entries => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

test("種別の項目定義を正規化し、重複・不正な形式を拒否する", () => {
  assert.deepEqual(parseFields('[{"label":" 金額 ","type":"number","required":true}]'), [{ key: "field_1", label: "金額", type: "number", required: true }]);
  assert.throws(() => parseFields("[]"), /1〜20/);
  assert.throws(() => parseFields("null"), /1〜20/);
  assert.throws(() => parseFields("not-json"), /入力項目/);
  assert.throws(() => parseFields('[{"label":"a","type":"text","required":true},{"label":" a ","type":"date","required":false}]'), /重複/);
  assert.throws(() => parseFields('[{"label":"a","type":"__proto__","required":true}]'), /形式/);
});

test("必須・数値・実在日付をサーバーでも検証する", () => {
  const fields = [{ key: "amount", label: "金額", type: "number", required: true }, { key: "date", label: "日付", type: "date", required: false }];
  assert.deepEqual(parseAnswers(form({ answer_amount: " 123.45 ", answer_date: "2024-02-29" }), fields), { amount: "123.45", date: "2024-02-29" });
  assert.throws(() => parseAnswers(form({ answer_amount: "" }), fields), /金額を入力/);
  for (const amount of ["-1", "Infinity", "1e999", "1,000", "text"]) assert.throws(() => parseAnswers(form({ answer_amount: amount }), fields), /数値/);
  for (const date of ["2026-02-29", "2026-02-31", "2026-13-01", "today"]) assert.throws(() => parseAnswers(form({ answer_amount: "0", answer_date: date }), fields), /正しい日付/);
  assert.deepEqual(parseAnswers(form({ answer_amount: "0" }), fields), { amount: "0", date: "" });
});

test("識別子の不正値と必須・長さ違反を拒否する", () => {
  assert.equal(positiveId("12"), 12);
  for (const id of ["", "0", "-1", "1 OR 1=1", "1.5", "9007199254740992", null]) assert.throws(() => positiveId(id));
  assert.equal(text(form({ name: " 山田 " }), "name", "名前"), "山田");
  assert.throws(() => text(form({ name: " " }), "name", "名前"), /入力/);
  assert.throws(() => text(form({ name: "abc" }), "name", "名前", 2), /2文字/);
});

test("CSVは引用符・改行を保持し、数式セルを無害化する", () => {
  assert.equal(csvCell('申請,"内容"\n次の行'), '"申請,""内容""\n次の行"');
  for (const value of ["=1+1", "+SUM(A1)", "-1", "@x", "  =x", "\t=x", "\r=x"]) assert.equal(csvCell(value), `"'${value}"`);
  assert.equal(csvCell("経費"), '"経費"');
});
