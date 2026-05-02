import "server-only";

type LanguageInferenceCode = "es" | "en" | "unknown" | "instrumental";

type InferTrackLanguageFromTextInput = {
  trackName: string;
  artistsLabel: string;
  albumName?: string | null;
  albumReleaseYear?: string | null;
  youtubeTitle?: string | null;
  youtubeDescription?: string | null;
  youtubeChannelTitle?: string | null;
  matchedQuery?: string | null;
};

export type TrackLanguageInferenceResult = {
  languageCode: LanguageInferenceCode;
  confidence: number;
  reason: string;
};

type OpenAIResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function normalizeEnvValue(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function getOpenAiApiKey() {
  return normalizeEnvValue(process.env.OPENAI_API_KEY);
}

function getOpenAiLanguageModel() {
  return normalizeEnvValue(process.env.OPENAI_LANGUAGE_MODEL) || "gpt-4o-mini";
}

function extractResponsesText(payload: OpenAIResponsesApiPayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const textChunks =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((contentItem) => contentItem.text?.trim() ?? "")
      .filter(Boolean) ?? [];

  return textChunks.join("\n").trim();
}

function normalizeConfidence(value: unknown) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  if (numericValue < 0) {
    return 0;
  }

  if (numericValue > 1) {
    return 1;
  }

  return numericValue;
}

export function isOpenAiLanguageInferenceConfigured() {
  return Boolean(getOpenAiApiKey());
}

export async function inferTrackLanguageFromText(
  input: InferTrackLanguageFromTextInput,
): Promise<TrackLanguageInferenceResult> {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY para inferir el idioma con IA.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAiLanguageModel(),
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Clasifica el idioma principal probable de una canción usando solo metadatos textuales.",
                "Devuelve un JSON estricto.",
                "Valores permitidos para languageCode: es, en, unknown, instrumental.",
                "Usa unknown si la evidencia no es clara.",
                "Usa instrumental solo si los metadatos apuntan claramente a que no hay voz o letra.",
                "No inventes letras ni supongas idioma solo por el país del artista.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                {
                  trackName: input.trackName,
                  artistsLabel: input.artistsLabel,
                  albumName: input.albumName ?? null,
                  albumReleaseYear: input.albumReleaseYear ?? null,
                  youtubeTitle: input.youtubeTitle ?? null,
                  youtubeDescription: input.youtubeDescription ?? null,
                  youtubeChannelTitle: input.youtubeChannelTitle ?? null,
                  matchedQuery: input.matchedQuery ?? null,
                },
                null,
                2,
              ),
            },
          ],
        },
      ],
      max_output_tokens: 180,
      text: {
        format: {
          type: "json_schema",
          name: "track_language_inference",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["languageCode", "confidence", "reason"],
            properties: {
              languageCode: {
                type: "string",
                enum: ["es", "en", "unknown", "instrumental"],
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
              reason: {
                type: "string",
                minLength: 1,
                maxLength: 240,
              },
            },
          },
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponsesApiPayload & {
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        "OpenAI no ha podido inferir el idioma a partir del texto del vídeo.",
    );
  }

  const rawText = extractResponsesText(payload);

  if (!rawText) {
    throw new Error("OpenAI no ha devuelto una clasificación de idioma.");
  }

  let parsed: Partial<TrackLanguageInferenceResult> = {};

  try {
    parsed = JSON.parse(rawText) as Partial<TrackLanguageInferenceResult>;
  } catch {
    throw new Error("La respuesta de OpenAI no ha llegado en JSON válido.");
  }

  const languageCode = parsed.languageCode;

  if (
    languageCode !== "es" &&
    languageCode !== "en" &&
    languageCode !== "unknown" &&
    languageCode !== "instrumental"
  ) {
    throw new Error("OpenAI ha devuelto un código de idioma no soportado.");
  }

  return {
    languageCode,
    confidence: normalizeConfidence(parsed.confidence),
    reason:
      typeof parsed.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim()
        : "Sin explicación adicional.",
  };
}
