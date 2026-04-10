import { NextResponse } from "next/server";
import {
  createInstagramAuthState,
  createInstagramAuthorizationUrl,
  getInstagramStateCookieMaxAge,
  getInstagramStateCookieName,
  isInstagramConfigured,
} from "@/lib/instagram";

export const runtime = "nodejs";

function createHtmlResponse(title: string, description: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #07111f;
        color: #f3f4f6;
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 48px 24px;
      }
      .panel {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 28px;
        background: rgba(15,23,42,0.72);
        padding: 24px;
      }
      a {
        color: #67e8f9;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="panel">
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
    </main>
  </body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

export async function GET() {
  if (!isInstagramConfigured()) {
    return createHtmlResponse(
      "Instagram no está configurado",
      "Faltan INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET o INSTAGRAM_REDIRECT_URI.",
      500,
    );
  }

  const state = createInstagramAuthState();
  const authorizationUrl = createInstagramAuthorizationUrl(state);

  if (!authorizationUrl) {
    return createHtmlResponse(
      "No he podido iniciar Instagram",
      "No se ha podido construir la URL de autorización de Instagram.",
      500,
    );
  }

  const response = NextResponse.redirect(authorizationUrl, { status: 303 });

  response.cookies.set({
    name: getInstagramStateCookieName(),
    value: state,
    httpOnly: true,
    maxAge: getInstagramStateCookieMaxAge(),
    path: "/",
    sameSite: "lax",
    secure: true,
  });

  return response;
}
