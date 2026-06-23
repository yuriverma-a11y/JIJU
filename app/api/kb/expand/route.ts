import { z } from "zod";
import { stripDashes } from "@/lib/clean";
import { hasLlm } from "@/lib/config";
import { countryName, entityDisplayName, resolveEntity } from "@/lib/countries";
import { KB_SYSTEM, buildKbExpandPrompt } from "@/lib/kb-prompts";
import { generateJson } from "@/lib/llm";
import { parseJsonLoose } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BodyZ = z.object({
  destination: z.string().min(1),
  citizenship: z.string().min(2).default("US"),
  residence: z.string().min(2).default("US"),
  visaType: z.string().min(1),
  category: z.string().min(1),
  count: z.number().int().min(5).max(60).default(30),
  avoid: z.array(z.string()).default([]),
});

const QuestionsZ = z.object({ questions: z.array(z.string()).default([]) });

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return parseJsonLoose(text);
  }
}

export async function POST(req: Request) {
  let body: z.infer<typeof BodyZ>;
  try {
    body = BodyZ.parse(await req.json());
  } catch (e) {
    return Response.json({ error: "Invalid request body", detail: String(e) }, { status: 400 });
  }

  if (!hasLlm()) {
    return Response.json(
      { error: "KIMI_API_KEY is not set. Add it (and KIMI_BASE_URL / KIMI_MODEL) to your environment." },
      { status: 400 },
    );
  }

  const entity = resolveEntity(body.destination);
  if (!entity) {
    return Response.json({ error: `Unknown destination: "${body.destination}"` }, { status: 400 });
  }

  try {
    const prompt = buildKbExpandPrompt({
      country: entityDisplayName(entity),
      visaType: body.visaType,
      category: body.category,
      citizenship: countryName(body.citizenship),
      residence: countryName(body.residence),
      count: body.count,
      avoid: body.avoid,
    });
    const raw = await generateJson({ system: KB_SYSTEM, prompt, maxTokens: 4000, temperature: 0.8 });
    const parsed = QuestionsZ.parse(safeJson(raw));
    const questions = parsed.questions
      .map((q) => stripDashes(q).trim())
      .filter((q) => q.length > 0);
    return Response.json({ questions });
  } catch (e) {
    return Response.json({ error: "KB expansion failed", detail: String(e) }, { status: 500 });
  }
}
