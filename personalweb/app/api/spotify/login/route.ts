import { NextResponse } from "next/server";
import {
  createSpotifyAuthState,
  createSpotifyAuthorizationUrl,
  getSpotifyStateCookieMaxAge,
  getSpotifyStateCookieName,
  isSpotifyConfigured,
} from "@/lib/spotify";

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
  if (!isSpotifyConfigured()) {
    return createHtmlResponse(
      "Spotify no está configurado",
      "Faltan SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET o SPOTIFY_REDIRECT_URI.",
      500,
    );
  }

  const state = createSpotifyAuthState();
  const authorizationUrl = createSpotifyAuthorizationUrl(state);

  if (!authorizationUrl) {
    return createHtmlResponse(
      "No he podido iniciar Spotify",
      "No se ha podido construir la URL de autorización de Spotify.",
      500,
    );
  }

  const response = NextResponse.redirect(authorizationUrl, { status: 303 });

  response.cookies.set({
    name: getSpotifyStateCookieName(),
    value: state,
    httpOnly: true,
    maxAge: getSpotifyStateCookieMaxAge(),
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
