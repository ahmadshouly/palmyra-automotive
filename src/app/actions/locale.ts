"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@/lib/i18n";

export async function setLocaleAction(locale: string) {
  const value = locale === "ar" ? "ar" : "en";
  cookies().set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
