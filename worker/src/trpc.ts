import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import type { Env } from "./env";
import type { User } from "./schema";
import { getDb } from "./db";
import { parseCookies, verifySession } from "./sdk";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: User | null;
  env: Env;
};

export async function createContext(
  env: Env,
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const cookies = parseCookies(opts.req.headers.get("cookie"));
    const sessionCookie = cookies.get("app_session_id");
    const session = await verifySession(env.JWT_SECRET, sessionCookie);

    if (session) {
      const db = getDb(env);
      let found = await db.select().from(users).where(eq(users.openId, session.openId)).limit(1);

      if (!found.length) {
        await db.insert(users).values({
          openId: session.openId,
          name: session.name || "User",
          email: null,
          loginMethod: "password",
          role: "user",
        }).onConflictDoNothing();
        found = await db.select().from(users).where(eq(users.openId, session.openId)).limit(1);
      }

      user = found[0] ?? null;
    }
  } catch {
    user = null;
  }

  return { req: opts.req, resHeaders: opts.resHeaders, user, env };
}

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have required permission (10002)" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
