/**
 * src/app/api/chat/route.ts
 *
 * Next.js App Router API route (POST) for Nexus AI chat.
 * - Expects JSON: { messages: Array<{ role: 'user'|'assistant'|'system', content: string }>, model?: string, temperature?: number }
 * - Uses GEMINI_API_KEY from .env.local
 * - Uses @google/generative-ai package to call Gemini
 *
 * NOTE for beginners:
 * 1. Install the SDK in your project root:
 *    npm install @google/generative-ai
 *
 * 2. Add your GEMINI_API_KEY to .env.local (project root):
 *    GEMINI_API_KEY=AIzaSyBkAbOWrSa_qX1wmRMEsowKYbYKSzyQUCg
 *
 * 3. Start dev server:
 *    npm run dev
 *
 * This file is intentionally explicit and heavily commented so it's easy to follow on Termux/Acode.
 */

import { NextRequest, NextResponse } from "next/server";

// Types for incoming messages
type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };

export async function POST(req: NextRequest) {
  try {
    // Validate env
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not set. Add it to .env.local" },
        { status: 500 }
      );
    }

    // Parse request body
    const body = (await req.json()) as {
      messages?: ChatMessage[];
      model?: string;
      temperature?: number;
      maxOutputTokens?: number;
    };

    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: provide messages array in body." },
        { status: 400 }
      );
    }

    // Default params (tweakable)
    const model = body.model ?? "gemini-1.5-pro"; // you can change to the model name you prefer
    const temperature = typeof body.temperature === "number" ? body.temperature : 0.2;
    const maxOutputTokens =
      typeof body.maxOutputTokens === "number" ? body.maxOutputTokens : 512;

    /**
     * Build a single prompt string from the messages.
     * This keeps the backend simple (beginner friendly). If you later switch to
     * a message-based API or streaming, you can adapt this.
     */
    const prompt = body.messages
      .map((m) => {
        // keep prompts concise and readable for Gemini
        const roleLabel = m.role === "user" ? "User" : m.role === "system" ? "System" : "Assistant";
        return `${roleLabel}: ${m.content}`;
      })
      .join("\n\n");

    // Lazy-import the official package so local dev still reads the file even if package missing.
    let textOutput: string | null = null;

    try {
      // Importing like this helps Termux/Acode environments where bundlers behave differently.
      // It will throw a clear error if the package is not installed.
      // We prefer this usage pattern because various versions of the SDK differ slightly.
      // The expected class name (from common examples) is GoogleGenerativeAI.
      // If your installed SDK differs, adapt these lines to match your version.
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { GoogleGenerativeAI } = require("@google/generative-ai");

      // Initialize client with API key
      const client = new GoogleGenerativeAI({ apiKey });

      // Get a model client — many examples use `getGenerativeModel`
      // If your package version uses a different API surface, replace the next two lines accordingly.
      // For example: const modelClient = client.models.get({ model });
      const modelClient = client.getGenerativeModel
        ? client.getGenerativeModel({ model })
        : // fallback: some versions might put models under client.models
          client.models?.get ? client.models.get({ model }) : null;

      if (!modelClient) {
        throw new Error(
          "Could not get a generative model client from @google/generative-ai. Please check the installed package version and adapt this code if needed."
        );
      }

      /**
       * generateContent / generateText / generate are method names that vary across versions.
       * We try a few common ones in order to be robust. The SDK usually returns a structure
       * containing the generated string(s). We extract the first candidate's text.
       */
      let response: any = null;

      if (typeof modelClient.generateContent === "function") {
        response = await modelClient.generateContent({
          // Many examples expect `contents` or `input` shaped arrays or strings.
          // Here we supply a "prompt" style input as `input` (SDKs vary).
          input: prompt,
          temperature,
          maxOutputTokens,
        });
      } else if (typeof modelClient.generate === "function") {
        response = await modelClient.generate({
          prompt: prompt,
          temperature,
          maxOutputTokens,
        });
      } else if (typeof modelClient.generateText === "function") {
        response = await modelClient.generateText({
          prompt: prompt,
          temperature,
          maxOutputTokens,
        });
      } else {
        throw new Error(
          "Installed @google/generative-ai package does not expose expected generation methods (generateContent/generate/generateText). See package docs."
        );
      }

      // Try to read the generated text from common response shapes.
      // We check multiple possible structures to be resilient to SDK differences.
      // 1) response.response.candidates[0].content[0].text
      // 2) response.response.text
      // 3) response.outputText or response.output
      // 4) response.candidates[0].content or response.candidates[0].text
      if (!response) throw new Error("Empty response from model client");

      // Attempt structured extraction
      if (
        response.response &&
        Array.isArray(response.response.candidates) &&
        response.response.candidates[0] &&
        response.response.candidates[0].content &&
        Array.isArray(response.response.candidates[0].content)
      ) {
        // candidate content parts
        const parts = response.response.candidates[0].content;
        // join parts of content if present (some SDKs split parts)
        textOutput = parts.map((p: any) => p.text ?? p).join("");
      } else if (response.response && typeof response.response.text === "string") {
        textOutput = response.response.text;
      } else if (typeof response.outputText === "string") {
        textOutput = response.outputText;
      } else if (response.output && typeof response.output === "string") {
        textOutput = response.output;
      } else if (
        response.candidates &&
        Array.isArray(response.candidates) &&
        typeof response.candidates[0].text === "string"
      ) {
        textOutput = response.candidates[0].text;
      } else if (typeof response === "string") {
        textOutput = response;
      } else {
        // last resort: stringify the response
        textOutput = JSON.stringify(response);
      }
    } catch (sdkErr: any) {
      // SDK-specific error - return helpful message to the developer
      return NextResponse.json(
        {
          error:
            "Error calling @google/generative-ai SDK. Did you install it? Run `npm install @google/generative-ai`. SDK error: " +
            (sdkErr?.message ?? String(sdkErr)),
        },
        { status: 500 }
      );
    }

    if (textOutput === null) {
      return NextResponse.json(
        { error: "AI returned no text. See server logs for details." },
        { status: 500 }
      );
    }

    // Return the generated text and echo some useful metadata
    return NextResponse.json({
      model,
      temperature,
      maxOutputTokens,
      output: textOutput,
    });
  } catch (err: any) {
    // Generic catch-all error (guards against unhandled errors)
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}