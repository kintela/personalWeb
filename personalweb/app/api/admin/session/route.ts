import { NextResponse } from "next/server";
import {
  getAdminCookieMaxAge,
  getAdminCookieName,
  getAdminCookiePath,
  getAdminSessionValue,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin/auth";

export const runtime = "nodejs";

function jsonResponse(
  body: Record<string, string | boolean>,
  status = 200,
) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return jsonResponse(
      {
        ok: false,
        error: "Falta ADMIN_PASSWORD en el entorno del servidor.",
      },
      500,
    );
  }

  const { password } = (await request.json().catch(() => ({ password: "" }))) as {
    password?: string;
  };

  if (!verifyAdminPassword(String(password ?? ""))) {
    return jsonResponse(
      {
        ok: false,
        error: "La contraseña no es correcta.",
      },
      401,
    );
  }

  const sessionValue = getAdminSessionValue();
  const response = jsonResponse({ ok: true });

  if (sessionValue) {
    response.cookies.set({
      name: getAdminCookieName(),
      value: sessionValue,
      httpOnly: true,
      maxAge: getAdminCookieMaxAge(),
      path: getAdminCookiePath(),
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export async function DELETE() {
  const response = jsonResponse({ ok: true });

  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: getAdminCookiePath(),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
