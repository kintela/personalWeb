import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeSpotifyAuthorizationCode,
  getSpotifyStateCookieName,
  verifySpotifyAuthState,
} from "@/lib/spotify";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPage({
  title,
  description,
  status = 200,
  refreshToken,
}: {
  title: string;
  description: string;
  status?: number;
  refreshToken?: string;
}) {
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedToken = refreshToken ? escapeHtml(refreshToken) : "";

  return new NextResponse(
    `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedTitle}</title>
    <style>
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #07111f;
        color: #f3f4f6;
      }
      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 48px 24px;
      }
      .panel {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 28px;
        background: rgba(15,23,42,0.72);
        padding: 24px;
      }
      pre {
        overflow-x: auto;
        padding: 16px;
        border-radius: 18px;
        background: rgba(2,6,23,0.88);
        border: 1px solid rgba(255,255,255,0.1);
        color: #a5f3fc;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      a {
        color: #67e8f9;
      }
      ul {
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="panel">
        <h1>${escapedTitle}</h1>
        <p>${escapedDescription}</p>
        ${
          refreshToken
            ? `<p>Copia este valor y guárdalo como <code>SPOTIFY_REFRESH_TOKEN</code>:</p>
               <pre><code>${escapedToken}</code></pre>
               <ul>
                 <li>Añádelo en <code>.env.local</code>.</li>
                 <li>Añádelo también en las variables de entorno de Vercel.</li>
                 <li>Después reinicia <code>npm run dev</code> o despliega otra vez.</li>
               </ul>
               <p><a href="/spotify">Volver a Spotify</a></p>`
            : `<p><a href="/spotify">Volver a Spotify</a></p>`
        }
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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code") ?? "";
  const currentState = requestUrl.searchParams.get("state") ?? "";
  const cookieStore = await cookies();
  const expectedState =
    cookieStore.get(getSpotifyStateCookieName())?.value ?? "";

  if (error) {
    const response = renderPage({
      title: "Spotify ha rechazado la autorización",
      description: `Spotify devolvió el error: ${error}.`,
      status: 400,
    });

    response.cookies.set({
      name: getSpotifyStateCookieName(),
      value: "",
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  }

  if (!code) {
    return renderPage({
      title: "Falta el código de Spotify",
      description: "La callback ha llegado sin el parámetro code.",
      status: 400,
    });
  }

  if (!verifySpotifyAuthState(expectedState, currentState)) {
    return renderPage({
      title: "Estado de Spotify inválido",
      description:
        "La verificación de seguridad de Spotify ha fallado. Repite la autorización desde la web.",
      status: 400,
    });
  }

  try {
    const tokenResponse = await exchangeSpotifyAuthorizationCode(code);
    const refreshToken = tokenResponse.refresh_token?.trim() ?? "";
    const response = renderPage({
      title: refreshToken
        ? "Spotify conectado"
        : "Spotify no devolvió refresh token",
      description: refreshToken
        ? "La autorización ha ido bien. Ya puedes guardar el token para que la web lea tus playlists."
        : "Spotify ha aceptado la autorización, pero no ha devuelto refresh token. Vuelve a lanzar la autorización y, si hace falta, revoca antes el acceso de esta app en tu cuenta de Spotify.",
      refreshToken: refreshToken || undefined,
    });

    response.cookies.set({
      name: getSpotifyStateCookieName(),
      value: "",
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    const response = renderPage({
      title: "No he podido completar la conexión con Spotify",
      description:
        error instanceof Error
          ? error.message
          : "Ha fallado el intercambio del código de Spotify.",
      status: 500,
    });

    response.cookies.set({
      name: getSpotifyStateCookieName(),
      value: "",
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  }
}
