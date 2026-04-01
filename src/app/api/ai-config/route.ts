import { NextResponse } from "next/server";
import { getAIConfig, saveAIConfig, maskApiKey } from "@/lib/ai-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getAIConfig();
  if (!config) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({
    configured: true,
    baseUrl: config.baseUrl,
    apiKey: maskApiKey(config.apiKey),
    model: config.model,
    systemPrompt: config.systemPrompt,
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const baseUrl = (formData.get("baseUrl") as string)?.trim();
  const apiKeyInput = (formData.get("apiKey") as string)?.trim();
  const model = (formData.get("model") as string)?.trim();
  const systemPrompt = (formData.get("systemPrompt") as string)?.trim() || undefined;

  if (!baseUrl || !model) {
    return NextResponse.redirect(
      new URL("/config?ai_error=Base+URL+and+Model+are+required", request.url),
      303
    );
  }

  // Preserve existing API key if field left blank
  const existing = await getAIConfig();
  const apiKey = apiKeyInput || existing?.apiKey || "";

  try {
    await saveAIConfig({ baseUrl, apiKey, model, systemPrompt });
    return NextResponse.redirect(
      new URL("/config?ai_saved=true", request.url),
      303
    );
  } catch {
    return NextResponse.redirect(
      new URL("/config?ai_error=Failed+to+save+configuration", request.url),
      303
    );
  }
}
