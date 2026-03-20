import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "personalweb-admin-session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const ADMIN_COOKIE_PATH = "/";

function getAdminPasswordValue() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
}

function createSessionToken(adminPassword: string) {
  const secret = getAdminSessionSecret() || adminPassword;

  return createHmac("sha256", secret)
    .update(`personalweb-admin:${adminPassword}`)
    .digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminConfigured() {
  return getAdminPasswordValue().length > 0;
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function getAdminCookieMaxAge() {
  return ADMIN_COOKIE_MAX_AGE;
}

export function getAdminCookiePath() {
  return ADMIN_COOKIE_PATH;
}

export function getAdminSessionValue() {
  const adminPassword = getAdminPasswordValue();

  if (!adminPassword) {
    return null;
  }

  return createSessionToken(adminPassword);
}

export async function isAdminAuthenticated() {
  const expectedValue = getAdminSessionValue();

  if (!expectedValue) {
    return false;
  }

  const cookieStore = await cookies();
  const currentValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? "";

  return safeEqual(currentValue, expectedValue);
}

export function verifyAdminPassword(password: string) {
  const adminPassword = getAdminPasswordValue();

  if (!adminPassword) {
    return false;
  }

  return safeEqual(password, adminPassword);
}
