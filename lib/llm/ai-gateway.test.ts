import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteInfo } from "@/lib/types";

let handle: (url: unknown, init?: unknown) => Promise<Response> = async () => {
  throw new Error("unmocked external call");
};
vi.stubGlobal("fetch", (url: unknown, init?: unknown) => handle(url, init));
const { runQuery, RouteError } = await import("./index");
const key = "fixture-gateway-key-not-a-real-credential";
let calls: { url: string; headers: Headers; body: Record<string, any> }[];
function reply(body: unknown, status = 200) {
  handle = async (url, init) => {
    const request = init as RequestInit;
    calls.push({ url: String(url), headers: new Headers(request.headers), body: JSON.parse(String(request.body)) });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
}
beforeEach(() => { calls = []; });

describe("AI Gateway uses native shapes and original citations", () => {
  it("maps Claude's exact slug and forces native search on the Messages surface", async () => {
    reply({ content: [{ type: "text", text: "Native answer", citations: [
      { url: "https://source.example/native", title: "Original citation" },
    ] }], usage: { input_tokens: 10, output_tokens: 20 } });
    const result = await runQuery({ provider: "anthropic", model: "claude-haiku-4-5", apiKey: key,
      route: { router: "ai-gateway" }, prompt: "question", webSearch: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://ai-gateway.vercel.sh/v1/messages");
    expect(calls[0].headers.get("x-api-key")).toBe(key);
    expect(calls[0].body).toMatchObject({ model: "anthropic/claude-haiku-4.5",
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      tool_choice: { type: "tool", name: "web_search" },
      providerOptions: { gateway: { only: ["anthropic"] } } });
    expect(calls[0].body.provider).toBeUndefined();
    expect(calls[0].body.plugins).toBeUndefined();
    expect(result.sources[0]).toMatchObject({ url: "https://source.example/native", title: "Original citation" });
    expect(result.tokens).toBe(30);
  });

  it("requests OpenAI's native web search on Responses and retains source URLs", async () => {
    reply({ status: "completed", output: [
      { type: "web_search_call", action: { sources: [{ url: "https://source.example/searched" }] } },
      { type: "message", content: [{ type: "output_text", text: "Native response", annotations: [] }] },
    ], usage: { input_tokens: 12, output_tokens: 8 } });
    const result = await runQuery({ provider: "openai", model: "gpt-4o-mini", apiKey: key,
      route: { router: "ai-gateway" }, prompt: "question", webSearch: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://ai-gateway.vercel.sh/v1/responses");
    expect(calls[0].headers.get("authorization")).toBe(`Bearer ${key}`);
    expect(calls[0].body).toMatchObject({ model: "openai/gpt-4o-mini", tools: [{ type: "web_search" }],
      tool_choice: { type: "web_search" }, include: ["web_search_call.action.sources"],
      providerOptions: { gateway: { only: ["openai"] } } });
    expect(result.sources[0].url).toBe("https://source.example/searched");
    expect(result.tokens).toBe(20);
  });

  it("keeps Gemini ungrounded and refuses unsupported native search before dispatch", async () => {
    reply({ choices: [{ message: { content: "Memory answer" } }], usage: { total_tokens: 5 } });
    const call = { provider: "google" as const, model: "gemini-flash-latest", apiKey: key,
      route: { router: "ai-gateway" as const }, prompt: "question" };
    const result = await runQuery({ ...call, webSearch: false });
    expect(calls[0].url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions");
    expect(calls[0].body.model).toBe("google/gemini-2.5-flash");
    expect(calls[0].body.providerOptions).toEqual({ gateway: { only: ["vertex"] } });
    expect(calls[0].body.tools).toBeUndefined();
    expect(result.sources).toEqual([]);
    await expect(runQuery({ ...call, webSearch: true })).rejects.toBeInstanceOf(RouteError);
    expect(calls).toHaveLength(1);
  });

  it("does not retry a Gateway native-search rejection as an ungrounded answer", async () => {
    reply({ error: { code: "invalid_prompt", message: 'tool_choice references function "web_search" which is not present in tools' } }, 400);
    await expect(runQuery({ provider: "anthropic", model: "claude-haiku-4-5", apiKey: key,
      route: { router: "ai-gateway" }, prompt: "question", webSearch: true })).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });

  it.each([
    { router: "openrouter" },
    { router: "ai-gateway", baseUrl: "https://openrouter.ai/api/v1" },
  ])("cannot dispatch an old route or endpoint override: %j", async route => {
    reply({});
    await expect(runQuery({ provider: "anthropic", model: "claude-haiku-4-5", apiKey: key,
      route: route as RouteInfo, prompt: "question" })).rejects.toBeInstanceOf(RouteError);
    expect(calls).toEqual([]);
  });
});
