import { z } from "zod";
import { hasLlm } from "@/lib/config";
import { generateFaqs } from "@/lib/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // long generation; capped by plan

const BodyZ = z.object({
  destination: z.string().min(1),
  citizenship: z.string().min(2).default("US"),
  residence: z.string().min(2).default("US"),
  locale: z.string().default("en-US"),
  contentType: z.string().default("faqs"),
  count: z.number().int().min(1).max(15).default(10),
  database: z.string().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodyZ>;
  try {
    body = BodyZ.parse(await req.json());
  } catch (e) {
    return Response.json({ error: "Invalid request body", detail: String(e) }, { status: 400 });
  }

  if (body.contentType !== "faqs") {
    return Response.json(
      { error: `Content type "${body.contentType}" is not enabled yet. Use "faqs".` },
      { status: 400 },
    );
  }

  if (!hasLlm()) {
    return Response.json(
      { error: "KIMI_API_KEY is not set. Add it (and KIMI_BASE_URL / KIMI_MODEL) to your environment." },
      { status: 400 },
    );
  }

  try {
    const result = await generateFaqs({
      destination: body.destination,
      citizenship: body.citizenship,
      residence: body.residence,
      locale: body.locale,
      contentType: "faqs",
      count: body.count,
      database: body.database,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: "Generation failed", detail: String(e) }, { status: 500 });
  }
}
