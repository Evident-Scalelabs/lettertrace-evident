import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { verifyRouterKey } from "@/lib/llm";
import { listRouterKeys, removeRouterKey, setRouterKey, supportedRouters } from "@/lib/router-keys";

vi.mock("@/lib/llm", async original => ({
  ...await original<typeof import("@/lib/llm")>(), verifyRouterKey: vi.fn(),
}));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), cache: (fn: unknown) => fn }));
const { getDecryptedRouterKeys } = await import("@/lib/data");

function database(data: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "upsert", "delete"]) {
    chain[method] = (...args) => { calls.push({ method, args }); return chain; };
  }
  for (const method of ["single", "maybeSingle", "order"]) {
    chain[method] = () => Promise.resolve({ data, error: null });
  }
  return { calls, client: { from: () => chain } as unknown as SupabaseClient };
}
const summary = { id: "fixture", router: "ai-gateway", label: null, base_url: null,
  key_hint: "fixture-hint", search_verified: ["anthropic"], retired_at: null, created_at: "2026-10-30T00:00:00Z" };
beforeEach(() => {
  vi.stubEnv("ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
  vi.mocked(verifyRouterKey).mockReset().mockResolvedValue({ ok: true, reachable: ["anthropic"],
    searchVerified: ["anthropic"], checks: [] });
});

describe("router credential migration at the existing key owner", () => {
  it("offers Gateway, refuses retired key writes before verification, and preserves removal", async () => {
    expect(supportedRouters().map(row => row.id)).toContain("ai-gateway");
    expect(supportedRouters().map(row => row.id)).not.toContain("openrouter");
    const retired = { ...summary, router: "openrouter", retired_at: "2026-10-30T00:00:00Z" };
    const db = database(retired);
    expect(await setRouterKey(db.client, "owner", { router: "openrouter", apiKey: "fake-old-key" })).toMatchObject({ ok: false, code: "invalid" });
    expect(verifyRouterKey).not.toHaveBeenCalled();
    expect(await removeRouterKey(db.client, "owner", "openrouter")).toEqual(retired);
    expect(db.calls).toContainEqual({ method: "eq", args: ["user_id", "owner"] });
  });

  it("uses verification, then encrypts only the new credential under its own identity", async () => {
    const db = database(summary);
    const key = "fake-gateway-key-not-a-real-secret";
    expect(await setRouterKey(db.client, "owner", { router: "ai-gateway", apiKey: key })).toMatchObject({ ok: true });
    const row = db.calls.find(call => call.method === "upsert")!.args[0] as { router: string; encrypted_key: string; retired_at: null };
    expect(row.router).toBe("ai-gateway");
    expect(row.retired_at).toBeNull();
    expect(row.encrypted_key).not.toContain(key);
    expect(decryptSecret(row.encrypted_key)).toBe(key);
    expect(verifyRouterKey).toHaveBeenCalledWith("ai-gateway", key, null);
  });

  it("refuses an old endpoint override without sending the new key to it", async () => {
    const db = database(summary);
    expect(await setRouterKey(db.client, "owner", { router: "ai-gateway", apiKey: "fake",
      baseUrl: "https://openrouter.ai/api/v1" })).toMatchObject({ ok: false, code: "invalid" });
    expect(verifyRouterKey).not.toHaveBeenCalled();
    expect(db.calls).toEqual([]);
  });

  it("retains safe original summaries but never decrypts retired or legacy credentials for dispatch", async () => {
    const old = { ...summary, router: "openrouter", retired_at: "2026-10-30T00:00:00Z" };
    expect(await listRouterKeys(database([old]).client, "owner")).toEqual([old]);
    const active = { router: "ai-gateway", base_url: null, search_verified: ["anthropic"],
      retired_at: null, encrypted_key: encryptSecret("new-fixture-key") };
    const db = database([
      { ...active, router: "openrouter", retired_at: null }, // safe even before SQL retirement
      { ...active, retired_at: "2026-10-30T00:00:00Z" },
      active,
    ]);
    expect(await getDecryptedRouterKeys(db.client, "owner")).toEqual([
      { router: "ai-gateway", baseUrl: null, searchVerified: ["anthropic"], apiKey: "new-fixture-key" },
    ]);
  });
});
