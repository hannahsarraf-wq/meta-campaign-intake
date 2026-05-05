import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { Env } from "./env";
import { appRouter } from "./routers";
import { createContext } from "./trpc";
import { getDb } from "./db";
import { users, campaigns, adSets } from "./schema";
import { eq } from "drizzle-orm";
import { generateExcelFile } from "./excel";
import {
  exchangeCodeForToken, getUserInfo, createSessionToken,
  buildSessionCookie, ONE_YEAR_MS, COOKIE_NAME,
} from "./sdk";

const app = new Hono<{ Bindings: Env }>();

// Reflect the request origin back if it matches an allowed origin, enabling credentialed cross-origin requests.
// Wildcard origin cannot be used with credentials:true (browser will block it).
app.use("*", async (c, next) => {
  const allowed = [
    c.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean);
  const corsMiddleware = cors({
    origin: (origin) => (allowed.includes(origin) ? origin : allowed[0]),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Set-Cookie"],
    credentials: true,
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// ─── Password login ────────────────────────────────────────────────────────
app.post("/api/auth/login", async (c) => {
  let body: { password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!body.password) {
    return c.json({ error: "Invalid password" }, 401);
  }

  let openId: string;
  let displayName: string;
  if (body.password === c.env.ADMIN_PASSWORD) {
    openId = "password-admin";
    displayName = "Admin";
  } else if (body.password === c.env.APP_PASSWORD) {
    openId = "password-user";
    displayName = "User";
  } else {
    return c.json({ error: "Invalid password" }, 401);
  }

  const sessionToken = await createSessionToken(c.env.JWT_SECRET, c.env.VITE_APP_ID, openId, displayName);
  const cookie = buildSessionCookie(COOKIE_NAME, sessionToken, ONE_YEAR_MS / 1000);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Set-Cookie": cookie, "Content-Type": "application/json" },
  });
});

// ─── OAuth callback ────────────────────────────────────────────────────────
app.get("/api/oauth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) return c.json({ error: "code and state are required" }, 400);

  try {
    const tokenResponse = await exchangeCodeForToken(c.env.OAUTH_SERVER_URL, c.env.VITE_APP_ID, code, state);
    const userInfo = await getUserInfo(c.env.OAUTH_SERVER_URL, tokenResponse.accessToken);

    if (!userInfo?.openId) return c.json({ error: "openId missing from user info" }, 400);

    const db = getDb(c.env);
    await db.insert(users).values({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email || null,
      loginMethod: userInfo.loginMethod || userInfo.platform || null,
      role: userInfo.openId === c.env.OWNER_OPEN_ID ? "admin" : "user",
    }).onConflictDoUpdate({
      target: users.openId,
      set: { name: userInfo.name || null, lastSignedIn: new Date().toISOString() },
    });

    const sessionToken = await createSessionToken(c.env.JWT_SECRET, c.env.VITE_APP_ID, userInfo.openId, userInfo.name || "");
    const cookie = buildSessionCookie(COOKIE_NAME, sessionToken, ONE_YEAR_MS / 1000);

    const frontendUrl = c.env.FRONTEND_URL || "/";
    return new Response(null, {
      status: 302,
      headers: { Location: frontendUrl, "Set-Cookie": cookie },
    });
  } catch (err) {
    console.error("[OAuth] callback failed", err);
    return c.json({ error: "OAuth callback failed" }, 500);
  }
});

// ─── Excel download ────────────────────────────────────────────────────────
app.get("/api/campaigns/:campaignId/excel", async (c) => {
  const campaignId = parseInt(c.req.param("campaignId"));
  if (isNaN(campaignId)) return c.json({ error: "Invalid campaign ID" }, 400);

  try {
    const db = getDb(c.env);
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) return c.json({ error: "Campaign not found" }, 404);
    const sets = await db.select().from(adSets).where(eq(adSets.campaignId, campaignId));

    const buf = generateExcelFile({ ...campaign, adSets: sets });
    const fileName = `${campaign.campaignName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("[Excel] generation failed", err);
    return c.json({ error: "Failed to generate Excel file" }, 500);
  }
});

// ─── tRPC ──────────────────────────────────────────────────────────────────
app.all("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (opts) => createContext(c.env, opts),
  });
});

// ─── Health check ──────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ ok: true, service: "meta-campaign-worker" }));

export default app;
