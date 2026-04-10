import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import type {
  InstagramConnectionCandidate,
  InstagramConnectionResult,
  InstagramFeedResult,
  InstagramMediaAsset,
  InstagramProfileAsset,
} from "@/lib/instagram-types";

const FACEBOOK_GRAPH_BASE_URL = "https://graph.facebook.com";
const FACEBOOK_LOGIN_BASE_URL = "https://www.facebook.com";
const INSTAGRAM_GRAPH_API_VERSION =
  process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || "v21.0";
const INSTAGRAM_SCOPE_LIST = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
] as const;
const INSTAGRAM_STATE_COOKIE_NAME = "personalweb-instagram-auth-state";
const INSTAGRAM_STATE_COOKIE_MAX_AGE = 60 * 10;
const INSTAGRAM_LOGIN_PATH = "/api/instagram/login";
const INSTAGRAM_CALLBACK_PATH = "/api/instagram/callback";

type FacebookOAuthTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type FacebookPageResponse = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: {
    id?: string;
    username?: string;
    profile_picture_url?: string;
  } | null;
};

type FacebookPagesListResponse = {
  data?: FacebookPageResponse[];
};

type InstagramProfileResponse = {
  id: string;
  username?: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  media_count?: number;
};

type InstagramMediaChildResponse = {
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
};

type InstagramMediaResponse = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  children?: {
    data?: InstagramMediaChildResponse[];
  };
};

type InstagramMediaListResponse = {
  data?: InstagramMediaResponse[];
};

function normalizeEnvValue(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function normalizeRemoteValue(value: string | undefined | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function getInstagramAppId() {
  return normalizeEnvValue(process.env.INSTAGRAM_APP_ID);
}

function getInstagramAppSecret() {
  return normalizeEnvValue(process.env.INSTAGRAM_APP_SECRET);
}

function getInstagramPageAccessToken() {
  return normalizeEnvValue(process.env.INSTAGRAM_PAGE_ACCESS_TOKEN);
}

function getInstagramUserId() {
  return normalizeEnvValue(process.env.INSTAGRAM_IG_USER_ID);
}

function getInstagramLoginConfigId() {
  return normalizeEnvValue(process.env.INSTAGRAM_LOGIN_CONFIG_ID);
}

export function getInstagramRedirectUri() {
  return normalizeEnvValue(process.env.INSTAGRAM_REDIRECT_URI);
}

export function getInstagramLoginPath() {
  return INSTAGRAM_LOGIN_PATH;
}

export function getInstagramCallbackPath() {
  return INSTAGRAM_CALLBACK_PATH;
}

export function getInstagramScopes() {
  return [...INSTAGRAM_SCOPE_LIST];
}

export function getInstagramStateCookieName() {
  return INSTAGRAM_STATE_COOKIE_NAME;
}

export function getInstagramStateCookieMaxAge() {
  return INSTAGRAM_STATE_COOKIE_MAX_AGE;
}

export function isInstagramConfigured() {
  return Boolean(
    getInstagramAppId() &&
      getInstagramAppSecret() &&
      getInstagramRedirectUri(),
  );
}

export function isInstagramConnected() {
  return Boolean(getInstagramPageAccessToken() && getInstagramUserId());
}

export function createInstagramAuthState() {
  return randomUUID().replaceAll("-", "");
}

export function verifyInstagramAuthState(
  expectedState: string,
  currentState: string,
) {
  const expectedBuffer = Buffer.from(expectedState);
  const currentBuffer = Buffer.from(currentState);

  if (
    expectedBuffer.length === 0 ||
    currentBuffer.length === 0 ||
    expectedBuffer.length !== currentBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, currentBuffer);
}

function buildFacebookGraphUrl(
  path: string,
  params?: Readonly<Record<string, string | null | undefined>>,
) {
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(
    `${FACEBOOK_GRAPH_BASE_URL}/${INSTAGRAM_GRAPH_API_VERSION}/${normalizedPath}`,
  );

  for (const [key, value] of Object.entries(params ?? {})) {
    const normalizedValue = value?.trim();

    if (normalizedValue) {
      url.searchParams.set(key, normalizedValue);
    }
  }

  return url;
}

async function readFacebookError(response: Response) {
  const text = await response.text();

  if (!text) {
    return `Facebook devolvió ${response.status}.`;
  }

  try {
    const payload = JSON.parse(text) as {
      error?: {
        message?: string;
      };
    };
    const message = payload.error?.message?.trim();

    return message
      ? `Facebook devolvió ${response.status}: ${message}`
      : `Facebook devolvió ${response.status}: ${text}`;
  } catch {
    return `Facebook devolvió ${response.status}: ${text}`;
  }
}

async function fetchFacebookJson<T>(input: URL | string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readFacebookError(response));
  }

  return (await response.json()) as T;
}

function getInstagramMediaDisplayUrl(media: InstagramMediaResponse) {
  const children = media.children?.data ?? [];
  const firstChild = children.find(
    (child) => normalizeRemoteValue(child.media_url) || normalizeRemoteValue(child.thumbnail_url),
  );

  if (media.media_type === "VIDEO") {
    return (
      normalizeRemoteValue(media.thumbnail_url) ||
      normalizeRemoteValue(firstChild?.thumbnail_url) ||
      null
    );
  }

  if (media.media_type === "CAROUSEL_ALBUM") {
    if (firstChild?.media_type === "VIDEO") {
      return normalizeRemoteValue(firstChild.thumbnail_url);
    }

    return (
      normalizeRemoteValue(firstChild?.media_url) ||
      normalizeRemoteValue(firstChild?.thumbnail_url) ||
      normalizeRemoteValue(media.media_url) ||
      null
    );
  }

  return (
    normalizeRemoteValue(media.media_url) ||
    normalizeRemoteValue(firstChild?.media_url) ||
    normalizeRemoteValue(firstChild?.thumbnail_url) ||
    null
  );
}

function formatInstagramTimestampLabel(value: string | undefined) {
  const normalizedValue = normalizeRemoteValue(value);

  if (!normalizedValue) {
    return null;
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function mapInstagramMedia(media: InstagramMediaResponse): InstagramMediaAsset | null {
  const permalink = normalizeRemoteValue(media.permalink);

  if (!permalink) {
    return null;
  }

  return {
    id: media.id,
    caption: normalizeRemoteValue(media.caption),
    mediaType: normalizeRemoteValue(media.media_type) ?? "UNKNOWN",
    permalink,
    mediaUrl: normalizeRemoteValue(media.media_url),
    thumbnailUrl: normalizeRemoteValue(media.thumbnail_url),
    displayUrl: getInstagramMediaDisplayUrl(media),
    timestamp: normalizeRemoteValue(media.timestamp),
    timestampLabel: formatInstagramTimestampLabel(media.timestamp),
    childCount: media.children?.data?.length ?? 0,
  };
}

function mapInstagramProfile(
  profile: InstagramProfileResponse,
): InstagramProfileAsset {
  return {
    id: profile.id,
    username: normalizeRemoteValue(profile.username),
    name: normalizeRemoteValue(profile.name),
    biography: normalizeRemoteValue(profile.biography),
    profilePictureUrl: normalizeRemoteValue(profile.profile_picture_url),
    mediaCount:
      typeof profile.media_count === "number" &&
      Number.isFinite(profile.media_count)
        ? profile.media_count
        : null,
  };
}

export function createInstagramAuthorizationUrl(state: string) {
  if (!isInstagramConfigured()) {
    return null;
  }

  const configId = getInstagramLoginConfigId();
  const params = new URLSearchParams({
    client_id: getInstagramAppId(),
    redirect_uri: getInstagramRedirectUri(),
    response_type: "code",
    state,
  });

  if (configId) {
    params.set("config_id", configId);
    params.set("override_default_response_type", "true");
  } else {
    params.set("scope", INSTAGRAM_SCOPE_LIST.join(","));
  }

  return `${FACEBOOK_LOGIN_BASE_URL}/${INSTAGRAM_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

async function exchangeInstagramAuthorizationCode(code: string) {
  if (!isInstagramConfigured()) {
    throw new Error(
      "Faltan INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET o INSTAGRAM_REDIRECT_URI.",
    );
  }

  const params: Record<string, string> = {
    client_id: getInstagramAppId(),
    client_secret: getInstagramAppSecret(),
    code,
  };

  if (!getInstagramLoginConfigId()) {
    params.redirect_uri = getInstagramRedirectUri();
  }

  return fetchFacebookJson<FacebookOAuthTokenResponse>(
    buildFacebookGraphUrl("oauth/access_token", params),
  );
}

async function exchangeInstagramForLongLivedUserToken(accessToken: string) {
  return fetchFacebookJson<FacebookOAuthTokenResponse>(
    buildFacebookGraphUrl("oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: getInstagramAppId(),
      client_secret: getInstagramAppSecret(),
      fb_exchange_token: accessToken,
    }),
  );
}

async function fetchInstagramManagedPages(
  accessToken: string,
): Promise<InstagramConnectionCandidate[]> {
  const response = await fetchFacebookJson<FacebookPagesListResponse>(
    buildFacebookGraphUrl("me/accounts", {
      access_token: accessToken,
      fields:
        "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
    }),
  );

  return (response.data ?? [])
    .map((page) => {
      const pageId = normalizeRemoteValue(page.id);
      const pageName = normalizeRemoteValue(page.name) ?? "Página sin nombre";
      const pageAccessToken = normalizeRemoteValue(page.access_token);
      const instagramUserId = normalizeRemoteValue(
        page.instagram_business_account?.id,
      );

      if (!pageId || !pageAccessToken || !instagramUserId) {
        return null;
      }

      return {
        pageId,
        pageName,
        instagramUserId,
        instagramUsername: normalizeRemoteValue(
          page.instagram_business_account?.username,
        ),
        pageAccessToken,
        profilePictureUrl: normalizeRemoteValue(
          page.instagram_business_account?.profile_picture_url,
        ),
      } satisfies InstagramConnectionCandidate;
    })
    .filter(
      (candidate): candidate is InstagramConnectionCandidate => candidate !== null,
    );
}

export async function connectInstagramAccountFromCode(
  code: string,
): Promise<InstagramConnectionResult> {
  const tokenResponse = await exchangeInstagramAuthorizationCode(code);
  const shortLivedUserAccessToken = normalizeRemoteValue(tokenResponse.access_token);

  if (!shortLivedUserAccessToken) {
    throw new Error("Facebook no ha devuelto un user access token.");
  }

  const longLivedTokenResponse =
    await exchangeInstagramForLongLivedUserToken(shortLivedUserAccessToken);
  const longLivedUserAccessToken = normalizeRemoteValue(
    longLivedTokenResponse.access_token,
  );

  if (!longLivedUserAccessToken) {
    throw new Error("No he podido obtener el long-lived user access token.");
  }

  const candidates = await fetchInstagramManagedPages(longLivedUserAccessToken);

  if (candidates.length === 0) {
    throw new Error(
      "No he encontrado ninguna Facebook Page conectada a una cuenta de Instagram Creator o Business para este usuario.",
    );
  }

  return {
    longLivedUserAccessToken,
    expiresIn:
      typeof longLivedTokenResponse.expires_in === "number" &&
      Number.isFinite(longLivedTokenResponse.expires_in)
        ? longLivedTokenResponse.expires_in
        : null,
    candidates,
  };
}

async function fetchInstagramProfile(
  instagramUserId: string,
  pageAccessToken: string,
) {
  return fetchFacebookJson<InstagramProfileResponse>(
    buildFacebookGraphUrl(instagramUserId, {
      access_token: pageAccessToken,
      fields: "id,username,name,biography,profile_picture_url,media_count",
    }),
  );
}

async function fetchInstagramMedia(
  instagramUserId: string,
  pageAccessToken: string,
) {
  const response = await fetchFacebookJson<InstagramMediaListResponse>(
    buildFacebookGraphUrl(`${instagramUserId}/media`, {
      access_token: pageAccessToken,
      fields:
        "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url,permalink}",
      limit: "50",
    }),
  );

  return (response.data ?? [])
    .map(mapInstagramMedia)
    .filter((media): media is InstagramMediaAsset => media !== null);
}

export async function getInstagramFeed(): Promise<InstagramFeedResult> {
  const configured = isInstagramConfigured();
  const connected = isInstagramConnected();

  if (!connected) {
    return {
      profile: null,
      media: [],
      configured,
      connected: false,
      error: configured
        ? null
        : "Faltan variables de entorno de Instagram. Revisa INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET y INSTAGRAM_REDIRECT_URI.",
      accountName: null,
      loginHref: getInstagramLoginPath(),
      callbackPath: getInstagramCallbackPath(),
    };
  }

  try {
    const [profileResponse, media] = await Promise.all([
      fetchInstagramProfile(getInstagramUserId(), getInstagramPageAccessToken()),
      fetchInstagramMedia(getInstagramUserId(), getInstagramPageAccessToken()),
    ]);
    const profile = mapInstagramProfile(profileResponse);

    return {
      profile,
      media,
      configured,
      connected: true,
      error: null,
      accountName: profile.name ?? profile.username,
      loginHref: getInstagramLoginPath(),
      callbackPath: getInstagramCallbackPath(),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No he podido leer tus publicaciones de Instagram.";

    return {
      profile: null,
      media: [],
      configured,
      connected: true,
      error: `No he podido leer Instagram: ${message}`,
      accountName: null,
      loginHref: getInstagramLoginPath(),
      callbackPath: getInstagramCallbackPath(),
    };
  }
}
