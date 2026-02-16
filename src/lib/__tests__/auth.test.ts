// @vitest-environment node
import { vi, test, expect, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => {
        const value = cookieStore.get(name);
        return value !== undefined ? { value } : undefined;
      },
      set: (name: string, value: string) => cookieStore.set(name, value),
      delete: (name: string) => cookieStore.delete(name),
    })
  ),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

beforeEach(() => {
  cookieStore.clear();
});

test("createSession stores a token that getSession can verify", async () => {
  await createSession("user-123", "test@example.com");

  const session = await getSession();

  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("test@example.com");
  expect(session?.expiresAt).toBeDefined();
});

test("getSession returns null when no cookie is present", async () => {
  expect(await getSession()).toBeNull();
});

test("getSession returns null for a tampered token", async () => {
  cookieStore.set("auth-token", "not.a.valid.jwt");
  expect(await getSession()).toBeNull();
});

test("deleteSession removes the cookie", async () => {
  await createSession("user-456", "delete@example.com");
  await deleteSession();
  expect(await getSession()).toBeNull();
});

test("verifySession returns payload for a valid token in the request", async () => {
  await createSession("user-789", "verify@example.com");
  const token = cookieStore.get("auth-token")!;

  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);

  expect(session?.userId).toBe("user-789");
  expect(session?.email).toBe("verify@example.com");
});

test("verifySession returns null when request has no cookie", async () => {
  const request = new NextRequest("http://localhost/api/test");
  expect(await verifySession(request)).toBeNull();
});

test("verifySession returns null for an invalid token", async () => {
  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: "auth-token=bad.token.here" },
  });
  expect(await verifySession(request)).toBeNull();
});

test("session expires approximately 7 days from creation", async () => {
  const before = Date.now();
  await createSession("user-exp", "exp@example.com");

  const session = await getSession();
  const expiresAt = new Date(session!.expiresAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(expiresAt).toBeGreaterThan(before + sevenDays - 5000);
  expect(expiresAt).toBeLessThan(before + sevenDays + 5000);
});
