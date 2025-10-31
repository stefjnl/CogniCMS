import { buildTraceLogger } from "@/lib/utils/trace";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface NanoGptChunk {
  id?: string;
  delta?: {
    content?: string;
    text?: string;
    reasoning?: string;
  };
  done?: boolean;
}

export function transformNanoGptStream(
  response: Response,
  conversationId: string,
  messageId: string,
  traceId: string,
  onToken?: (token: string) => void,
  onDone?: () => void
): ReadableStream<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("NanoGPT response missing readable body");
  }

  const logger = buildTraceLogger("NanoGPTStream", traceId);
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              conversationId,
              messageId,
              done: true,
            })}\n\n`
          )
        );
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      events.forEach((event) => {
        const dataLine = event
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6);
        if (!dataLine) {
          return;
        }

        try {
          const payload = JSON.parse(dataLine) as NanoGptChunk;
          const text =
            payload.delta?.content ??
            payload.delta?.text ??
            payload.delta?.reasoning;
          if (text) {
            if (onToken) {
              onToken(text);
            }
            const data = {
              conversationId,
              messageId,
              content: text,
              done: Boolean(payload.done),
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }

          if (payload.done) {
            if (onDone) {
              onDone();
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  conversationId,
                  messageId,
                  done: true,
                })}\n\n`
              )
            );
          }
        } catch (error) {
          logger("parse-error", { error: (error as Error).message });
        }
      });
    },
    cancel() {
      reader.cancel().catch(() => {
        logger("cancel-error");
      });
    },
  });
}
