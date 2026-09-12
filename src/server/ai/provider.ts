import { createGroqModel } from "./groq.ts";
import { createOpenAIModel } from "./openai.ts";

const validCredential = (value: string | undefined) => !!value?.trim() && /^[\x21-\x7e]+$/.test(value.trim());

export function configuredModel() {
  const provider = process.env.VAELORA_AI_PROVIDER?.trim().toLowerCase() || "openai";
  const model = process.env.VAELORA_AI_MODEL?.trim();
  if (!model) return null;
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    return apiKey && validCredential(apiKey) ? createGroqModel({ apiKey, model }) : null;
  }
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    return apiKey && validCredential(apiKey) ? createOpenAIModel({ apiKey, model }) : null;
  }
  return null;
}
