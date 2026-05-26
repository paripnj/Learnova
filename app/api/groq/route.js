import { jsonSuccess, jsonError } from "@/lib/api-response";
import { authenticateRequest, parseJSON, withErrorHandler } from "@/lib/error-handler";
import { validateGroqBody, callGroq } from "@/lib/ai/groq";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { checkRateLimit } from "@/lib/rateLimit";
import { detectInjection, sanitizeMessage, buildSecureMessages } from "@/utils/promptGuard";
import { GROQ_API_URL } from "@/lib/ai/groq";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const groqSchema = z.object({
  message: z.string().optional(),
  userMessage: z.string().optional(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional(),
}).refine(
  (data) => {
    if (data.messages && data.messages.length > 0) {
      const lastMsg = data.messages[data.messages.length - 1];
      return lastMsg.content && lastMsg.content.trim().length > 0;
    }
    const message = data.message || data.userMessage;
    return message && message.trim().length > 0;
  },
  {
    message: "Message is required",
  }
).refine(
  (data) => {
    if (data.messages && data.messages.length > 0) {
      const lastMsg = data.messages[data.messages.length - 1];
      return lastMsg.content && lastMsg.content.trim().length <= 2000;
    }
    const message = data.message || data.userMessage;
    return message && message.trim().length <= 2000;
  },
  {
    message: "Message too long (max 2000 characters)",
  }
);

export async function POST(request) {
  try {
    const decodedToken =
      await authenticateRequest(request);

    // Rate limiting
    const rateLimitResult = await checkRateLimit(decodedToken.uid);
    if (!rateLimitResult.allowed) {
      return jsonError(
        "Too many requests. Please try again later.",
        429
      );
    }

    // Parse body
    const body = await parseJSON(request, 1024 * 10);

    const validation = groqSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0]?.message || "Invalid request payload";
      throw new ValidationError(firstError);
    }

    let rawMessage = "";
    let history = [];

    if (validation.data.messages && validation.data.messages.length > 0) {
      const lastMsg = validation.data.messages[validation.data.messages.length - 1];
      rawMessage = lastMsg.content;
      history = validation.data.messages.slice(0, -1);
    } else {
      rawMessage = validation.data.message || validation.data.userMessage;
    }

    const trimmedMessage = rawMessage.trim();

    // Check for prompt injection
    const injectionCheck = detectInjection(trimmedMessage);
    if (injectionCheck.isInjection) {
      console.warn(`[nova-ai-safety] Injection blocked for user ${decodedToken.uid}: ${injectionCheck.matchedPattern}`);
      return jsonError("Safety check: System instructions override or prompt injection attempt detected.", 400);
    }

    // Sanitize user message
    const sanitizedMessage = sanitizeMessage(trimmedMessage);

  // Rate limiting
  const rateLimitResult = await checkRateLimit(decodedToken.uid);
  if (!rateLimitResult.allowed) {
    return jsonError("Too many requests. Please try again later.", 429);
  }

  // Parse body
  const body = await parseJSON(request, 1024 * 10);

  const validation = validateGroqBody(body);

  let rawMessage = "";

  rawMessage = validation.trimmedMessage;

  const trimmedMessage = rawMessage.trim();

    if (error.name === "AbortError") {
      return jsonError(
        "Gateway Timeout: Groq did not respond in time.",
        504
      );
    }

  // Sanitize and call Groq
  const sanitizedMessage = sanitizeMessage(trimmedMessage);
  const content = await callGroq(sanitizedMessage);

  return jsonSuccess({ message: content });
});
