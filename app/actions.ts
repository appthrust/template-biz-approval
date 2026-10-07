"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decideApproval, insertKind, submitApproval } from "@/lib/db";
import { InputError, parseFields, text, type ActionState } from "@/lib/approval";

function failure(error: unknown): ActionState {
  return { error: error instanceof InputError ? error.message : "保存できませんでした。入力内容は残っています。接続を確認して、もう一度お試しください。" };
}

export async function saveRequest(_previous: ActionState, form: FormData): Promise<ActionState> {
  let id: number;
  try { id = await submitApproval(form); } catch (error) { return failure(error); }
  revalidatePath("/", "layout");
  redirect(`/requests/${id}?saved=1`);
}

export async function saveDecision(_previous: ActionState, form: FormData): Promise<ActionState> {
  let id: number;
  try { id = await decideApproval(form); } catch (error) { return failure(error); }
  revalidatePath("/", "layout");
  redirect(`/requests/${id}?saved=1`);
}

export async function saveKind(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    await insertKind(text(form, "name", "種別名", 60), text(form, "description", "説明", 240, false), parseFields(text(form, "fields", "入力項目", 10000)));
  } catch (error) { return failure(error); }
  revalidatePath("/", "layout");
  redirect("/kinds?saved=1");
}
