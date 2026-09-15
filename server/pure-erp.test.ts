import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("PURE ERP identity contract", () => {
  it("returns the authenticated manager context for dashboard clients", async () => {
    const user = {
      id: 7,
      openId: "pure-manager",
      email: "manager@pure.example",
      name: "محمد عادل",
      loginMethod: "manus",
      role: "admin" as const,
      createdAt: new Date("2026-09-16T00:00:00Z"),
      updatedAt: new Date("2026-09-16T00:00:00Z"),
      lastSignedIn: new Date("2026-09-16T00:00:00Z"),
    };
    const ctx: TrpcContext = {
      user,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const result = await appRouter.createCaller(ctx).auth.me();

    expect(result?.name).toBe("محمد عادل");
    expect(result?.role).toBe("admin");
  });

  it("keeps the public dashboard auth contract unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const result = await appRouter.createCaller(ctx).auth.me();

    expect(result).toBeNull();
  });
});
