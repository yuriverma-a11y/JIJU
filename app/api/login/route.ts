import { z } from "zod";

export const runtime = "nodejs";

const BodyZ = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const expected = process.env.JIJU_ACCESS_TOKEN ?? "";
  if (!expected) {
    return Response.json({ ok: true }); // no gate configured
  }

  let token: string;
  try {
    token = BodyZ.parse(await req.json()).token;
  } catch {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  if (token !== expected) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  // 30-day httpOnly cookie.
  res.headers.append(
    "Set-Cookie",
    `jiju_auth=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}; Secure`,
  );
  return res;
}
