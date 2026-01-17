import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    const modelName = process.env.OPEN_ROUTER_MODEL_NAME || "xiaomi/mimo-v2-flash:free";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPEN_ROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: "You are a professional assistant. Always answer professionally, objectively, and concisely. Do not share sensitive information, personal opinions, or engage in informal or casual conversation. Maintain a formal tone at all times."
          },
          {
            role: "user",
            content: text,
          },
        ],
        reasoning: {
          enabled: true
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch from OpenRouter");
    }

    const data = await response.json();
    const output = data.choices[0]?.message?.content || "";

    return NextResponse.json({ result: output });
  } catch (error) {
    console.error("OpenRouter API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch response from LLM: ${errorMessage}` },
      { status: 500 }
    );
  }
}
