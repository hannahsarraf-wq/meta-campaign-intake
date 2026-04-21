import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

const EXCHANGE_TOKEN_PATH = "/webdev.v1.WebDevAuthPublicService/ExchangeToken";
const GET_USER_INFO_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfo";
const GET_USER_INFO_WITH_JWT_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt";

export function parseCookies(cookieHeader: string | null): Map<string, string> {
  if (!cookieHeader) return new Map();
  return new Map(
    cookieHeader.split(";").map((c) => {
      const eq = c.indexOf("=");
      return [c.slice(0, eq).trim(), c.slice(eq + 1).trim()];
    })
  );
}

export async function exchangeCodeForToken(
  oAuthServerUrl: string,
  appId: string,
  code: string,
  state: string
): Promise<{ accessToken: string }> {
  const redirectUri = atob(state);
  const res = await fetch(`${oAuthServerUrl}${EXCHANGE_TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: appId, grantType: "authorization_code", code, redirectUri }),
  });
  return res.json() as Promise<{ accessToken: string }>;
}

export async function getUserInfo(oAuthServerUrl: string, accessToken: string): Promise<any> {
  const res = await fetch(`${oAuthServerUrl}${GET_USER_INFO_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  return res.json();
}

export async function getUserInfoWithJwt(
  oAuthServerUrl: string,
  appId: string,
  jwtToken: string
): Promise<any> {
  const res = await fetch(`${oAuthServerUrl}${GET_USER_INFO_WITH_JWT_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jwtToken, projectId: appId }),
  });
  return res.json();
}

export async function createSessionToken(
  cookieSecret: string,
  appId: string,
  openId: string,
  name: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(cookieSecret);
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId, appId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secretKey);
}

export async function verifySession(
  cookieSecret: string,
  cookieValue: string | undefined
): Promise<{ openId: string; appId: string; name: string } | null> {
  if (!cookieValue) return null;
  try {
    const secretKey = new TextEncoder().encode(cookieSecret);
    const { payload } = await jwtVerify(cookieValue, secretKey, { algorithms: ["HS256"] });
    const { openId, appId, name } = payload as Record<string, unknown>;
    if (typeof openId !== "string" || typeof appId !== "string" || typeof name !== "string") return null;
    return { openId, appId, name };
  } catch {
    return null;
  }
}

export function buildSessionCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=None; Secure`;
}

export function buildClearCookie(name: string): string {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=None; Secure`;
}
