import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  connectInstagramAccountFromCode,
  getInstagramStateCookieName,
  verifyInstagramAuthState,
} from "@/lib/instagram";
import type { InstagramConnectionCandidate } from "@/lib/instagram-types";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: getInstagramStateCookieName(),
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
}

function renderCandidate(candidate: InstagramConnectionCandidate) {
  const envBlock = [
    `INSTAGRAM_PAGE_ID="${candidate.pageId}"`,
    `INSTAGRAM_PAGE_ACCESS_TOKEN="${candidate.pageAccessToken}"`,
    `INSTAGRAM_IG_USER_ID="${candidate.instagramUserId}"`,
  ].join("\n");

  return `
    <article class="candidate">
      <div class="candidate-head">
        ${
          candidate.profilePictureUrl
            ? `<img src="${escapeHtml(candidate.profilePictureUrl)}" alt="" class="avatar" />`
            : `<div class="avatar avatar-fallback">IG</div>`
        }
        <div>
          <h2>${escapeHtml(candidate.pageName)}</h2>
          <p>${candidate.instagramUsername ? `@${escapeHtml(candidate.instagramUsername)}` : "Cuenta de Instagram conectada"}</p>
        </div>
      </div>
      <p>Copia estas variables en <code>.env.local</code>:</p>
      <pre><code>${escapeHtml(envBlock)}</code></pre>
    </article>
  `;
}

function renderPage({
  title,
  description,
  status = 200,
  candidates,
}: {
  title: string;
  description: string;
  status?: number;
  candidates?: InstagramConnectionCandidate[];
}) {
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);

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
        max-width: 920px;
        margin: 0 auto;
        padding: 48px 24px;
      }
      .panel {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 28px;
        background: rgba(15,23,42,0.72);
        padding: 24px;
      }
      .stack {
        display: grid;
        gap: 18px;
      }
      .candidate {
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 22px;
        background: rgba(2,6,23,0.4);
        padding: 18px;
      }
      .candidate-head {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 12px;
      }
      .candidate-head h2 {
        margin: 0;
        font-size: 1.1rem;
      }
      .candidate-head p {
        margin: 4px 0 0;
        color: #cbd5e1;
      }
      .avatar {
        width: 52px;
        height: 52px;
        border-radius: 999px;
        object-fit: cover;
        border: 1px solid rgba(255,255,255,0.14);
      }
      .avatar-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(34,211,238,0.14);
        color: #cffafe;
        font-weight: 700;
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
        <div class="stack">
          <div>
            <h1>${escapedTitle}</h1>
            <p>${escapedDescription}</p>
          </div>
          ${
            candidates?.length
              ? `<div class="stack">
                  ${candidates.map(renderCandidate).join("")}
                 </div>
                 <ul>
                   <li>Añade estas variables en <code>.env.local</code>.</li>
                   <li>Si despliegas en Vercel, súbelas también allí.</li>
                   <li>Reinicia <code>npm run dev -- --experimental-https</code>.</li>
                   <li>Luego vuelve a <a href="/instagram">/instagram</a>.</li>
                 </ul>`
              : `<p><a href="/instagram">Volver a Instagram</a></p>`
          }
        </div>
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
    cookieStore.get(getInstagramStateCookieName())?.value ?? "";

  if (error) {
    const response = renderPage({
      title: "Instagram ha rechazado la autorización",
      description: `Facebook devolvió el error: ${error}.`,
      status: 400,
    });

    clearStateCookie(response);
    return response;
  }

  if (!code) {
    const response = renderPage({
      title: "Falta el código de Instagram",
      description: "La callback ha llegado sin el parámetro code.",
      status: 400,
    });

    clearStateCookie(response);
    return response;
  }

  if (!verifyInstagramAuthState(expectedState, currentState)) {
    const response = renderPage({
      title: "Estado de Instagram inválido",
      description:
        "La verificación de seguridad de Instagram ha fallado. Repite la autorización desde la web.",
      status: 400,
    });

    clearStateCookie(response);
    return response;
  }

  try {
    const connection = await connectInstagramAccountFromCode(code);
    const response = renderPage({
      title:
        connection.candidates.length === 1
          ? "Instagram conectado"
          : "Instagram conectado con varias páginas disponibles",
      description:
        connection.candidates.length === 1
          ? "La autorización ha ido bien. Ya puedes guardar las variables para que la web lea tus publicaciones."
          : "La autorización ha ido bien. Elige abajo la página que corresponde a tu cuenta y guarda sus variables.",
      candidates: connection.candidates,
    });

    clearStateCookie(response);
    return response;
  } catch (error) {
    const response = renderPage({
      title: "No he podido completar la conexión con Instagram",
      description:
        error instanceof Error
          ? error.message
          : "Ha fallado el intercambio del código de Instagram.",
      status: 500,
    });

    clearStateCookie(response);
    return response;
  }
}
