import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin", request.url), {
    status: 303,
  });

  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
