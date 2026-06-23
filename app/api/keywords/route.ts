import { z } from "zod";
import {
  entityDisplayName,
  resolveEntity,
  semrushDatabaseForOrigin,
} from "@/lib/countries";
import { researchKeywords } from "@/lib/semrush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BodyZ = z.object({
  destination: z.string().min(1),
  residence: z.string().min(2).default("US"),
  database: z.string().optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodyZ>;
  try {
    body = BodyZ.parse(await req.json());
  } catch (e) {
    return Response.json({ error: "Invalid request body", detail: String(e) }, { status: 400 });
  }

  const entity = resolveEntity(body.destination);
  if (!entity) {
    return Response.json({ error: `Unknown destination: "${body.destination}"` }, { status: 400 });
  }

  try {
    const result = await researchKeywords({
      entityName: entityDisplayName(entity),
      seedKeywords: entity.seedKeywords,
      database: body.database ?? semrushDatabaseForOrigin(body.residence),
      applyingFrom: body.residence,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: "Keyword research failed", detail: String(e) }, { status: 500 });
  }
}
