import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, existingCategories } = await req.json();
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    const modelName = process.env.OPEN_ROUTER_MODEL_NAME || "google/gemini-2.0-flash-lite-preview-02-05:free";

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPEN_ROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const categoriesContext = existingCategories && existingCategories.length > 0
      ? `Available categories: ${existingCategories.join(", ")}.`
      : "No existing categories provided.";

    const systemPrompt = `
    You are an AI assistant that analyzes text and categorizes it into one of three types: "snippet", "clipboard", or "link".
    
    1. **snippet**: Code snippets, AI prompts, functions, configuration files, or technical notes that are likely to be reused. Needs a 'title', 'content', and 'tags'.
    2. **clipboard**: Short text, temporary notes, or things to be copied quickly. Needs 'content'.
    3. **link**: URLs or bookmarks. Needs 'url' and 'title' (and optional 'description' as content).
    
    If the input contains a URL, it's likely a "link" unless it's inside a code block.
    If the input looks like code, it's a "snippet".
    Otherwise, it's likely "clipboard" content or a "snippet" if it has a clear title/structure.

    CRITICAL INSTRUCTIONS FOR CONSISTENCY:
    - **Do NOT modify the 'content' or 'url'**. The 'content' field must be an EXACT copy of the input text (or the code part of it). Do not summarize, rephrase, trim, or alter it in any way.
    - **Do NOT modify the URL**. It must be exact.
    - Only generate/suggest 'title' and 'tags' if they are missing or not obvious.
    - Be strictly consistent. For the same input, always return the exact same JSON structure.

    SPECIAL INSTRUCTION FOR LINKS:
    - If the type is 'link', you MUST suggest a 'category'.
    - ${categoriesContext}
    - If one of the available categories is suitable, use it EXACTLY as written.
    - If none are suitable (or no categories exist), suggest a new, short, descriptive category name (e.g., "Tech", "News", "Docs").

    Return a JSON object strictly adhering to this structure:
    {
      "type": "snippet" | "clipboard" | "link" | "unknown",
      "data": {
        "title": "string (suggest a title if missing)",
        "content": "string (the EXACT content from input, do not modify)",
        "tags": ["string", "string"] (extract relevant tags) (suggest only one tag if missing),
        "url": "string (only for link type, exact URL)",
        "category": "string (only for link type, see instructions)"
      },
      "reasoning": "string (brief explanation of why this category was chosen)"
    }
    
    Do not output Markdown formatting (like \`\`\`json). Output raw JSON only.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature: 0, // Enforce strict consistency
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: text,
          },
        ],
        response_format: { type: "json_object" } 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch from OpenRouter");
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || "{}";
    
    // Clean up potential markdown fences if the model ignores instructions
    content = content.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse JSON from AI:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: parsedResult });
  } catch (error) {
    console.error("AI Analyze API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to analyze text: ${errorMessage}` },
      { status: 500 }
    );
  }
}
