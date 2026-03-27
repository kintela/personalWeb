import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

export const alt = "Vista previa de kintela.es";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const brandIconBuffer = await readFile(new URL("./icon.png", import.meta.url));
  const brandIconUrl = `data:image/png;base64,${brandIconBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(34,211,238,0.28), transparent 30%), radial-gradient(circle at bottom right, rgba(16,185,129,0.22), transparent 28%), linear-gradient(135deg, #020617 0%, #0f172a 52%, #111827 100%)",
          color: "#f8fafc",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 28,
            borderRadius: 36,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.68), rgba(2,6,23,0.72))",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 82,
            left: 84,
            right: 84,
            bottom: 82,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 44,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 40,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                maxWidth: 650,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: "#22d3ee",
                    boxShadow: "0 0 24px rgba(34,211,238,0.45)",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    letterSpacing: "0.34em",
                    textTransform: "uppercase",
                    color: "rgba(103,232,249,0.92)",
                  }}
                >
                  kintela.es
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 88,
                  fontWeight: 700,
                  lineHeight: 0.95,
                  letterSpacing: "-0.045em",
                }}
              >
                Personal Web
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 36,
                  lineHeight: 1.35,
                  color: "rgba(226,232,240,0.9)",
                }}
              >
                Cositas que me molan: fotos, conciertos, discos, libros,
                historia, guitarra, playlists y vídeos.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: 320,
                height: 320,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 40,
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "linear-gradient(180deg, rgba(15,23,42,0.84), rgba(2,6,23,0.84))",
                boxShadow: "0 28px 70px rgba(2,6,23,0.38)",
              }}
            >
              <img
                src={brandIconUrl}
                alt="Icono de marca de kintela.es"
                width={240}
                height={240}
                style={{
                  display: "flex",
                  width: 240,
                  height: 240,
                  objectFit: "contain",
                  borderRadius: 28,
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            {["Fotos", "Conciertos", "Historia", "Guitarra", "Spotify"].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 22px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(15,23,42,0.62)",
                    fontSize: 24,
                    color: "rgba(226,232,240,0.96)",
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
