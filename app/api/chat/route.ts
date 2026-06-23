import { z } from "zod";
import { runChatStream } from "@/lib/chat";
import { hasLlm } from "@/lib/config";
import type { ChatStreamEvent } from "@/lib/chat-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodyZ = z.object({
  message: z.string().min(1),
  destination: z.string().optional(),
  citizenship: z.string().optional(),
  residence: z.string().optional(),
  locale: z.string().optional(),
  intent: z.enum(["auto", "faqs", "blog", "kb", "freeform"]).optional(),
});

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ChatStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          /* controller closed */
        }
      };
      try {
        await runChatStream(
          {
            message: body.message,
            destination: body.destination,
            citizenship: body.citizenship,
            residence: body.residence,
            locale: body.locale,
            intentOverride: body.intent,
          },
          emit,
        );
      } catch (e) {
        emit({ type: "error", error: String(e) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
