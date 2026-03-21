"use server";

import { redirect } from "next/navigation";
import {
  setBookmark,
  addTag,
  removeTag,
  setNotes,
} from "@/lib/session-metadata";

export async function toggleBookmarkAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const current = formData.get("bookmarked") === "true";
  await setBookmark(sessionId, !current);
  redirect(returnUrl);
}

export async function addTagAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const tag = (formData.get("tag") as string || "").toLowerCase().trim();

  try {
    await addTag(sessionId, tag);
  } catch {
    const url = new URL(returnUrl, "http://localhost");
    url.searchParams.set("error", "invalid-tag");
    redirect(url.pathname + url.search);
    return;
  }
  redirect(returnUrl);
}

export async function removeTagAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const tag = formData.get("tag") as string;
  if (!tag) return redirect(returnUrl);
  await removeTag(sessionId, tag);
  redirect(returnUrl);
}

export async function saveNotesAction(formData: FormData): Promise<void> {
  const sessionId = formData.get("sessionId") as string | null;
  const returnUrl = (formData.get("returnUrl") as string | null) || "/";
  if (!sessionId) return redirect(returnUrl);
  const notes = (formData.get("notes") as string || "").trim();
  await setNotes(sessionId, notes);
  redirect(returnUrl);
}
