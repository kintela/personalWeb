import { NextResponse } from "next/server";
import {
  getAdminCookieMaxAge,
  getAdminCookieName,
  getAdminSessionValue,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const redirectUrl = new URL("/admin", request.url);

  if (!isAdminConfigured()) {
    redirectUrl.searchParams.set("error", "missing-config");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  if (!verifyAdminPassword(password)) {
    redirectUrl.searchParams.set("error", "invalid-password");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  const sessionValue = getAdminSessionValue();
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  if (sessionValue) {
    response.cookies.set({
      name: getAdminCookieName(),
      value: sessionValue,
      httpOnly: true,
      maxAge: getAdminCookieMaxAge(),
      path: "/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
