import { describe, expect, it } from "vitest";
import {
  isProLayout,
  isProUnlocked,
  PRO_BETA_FREE,
  PRO_LAYOUT_IDS,
  PRO_STATUS_LABEL,
  PRO_STATUS_NOTICE,
} from "@/backend/project/pro";

// lib/pro.ts is a single switch that several surfaces read. These tests pin the
// two things that must not drift: which layouts are Pro, and that the copy
// always matches the flag (shipping "free while in beta" text after the beta
// ends would be a lie, not just a bug).

describe("pro layouts", () => {
  it("badges exactly the three presentation layouts", () => {
    expect([...PRO_LAYOUT_IDS]).toEqual(["slides", "social", "newsletter"]);
  });

  it("recognises Pro layout ids", () => {
    expect(isProLayout("slides")).toBe(true);
    expect(isProLayout("newsletter")).toBe(true);
  });

  it("leaves the free tools alone", () => {
    for (const id of ["type-scale", "style-guide", "colors", "website", "mobile"]) {
      expect(isProLayout(id)).toBe(false);
    }
  });
});

describe("pro gating", () => {
  it("unlocks everything while the beta flag is set", () => {
    expect(isProUnlocked()).toBe(PRO_BETA_FREE);
  });

  it("keeps the copy consistent with the flag", () => {
    if (PRO_BETA_FREE) {
      expect(PRO_STATUS_LABEL).toMatch(/beta/i);
      expect(PRO_STATUS_NOTICE).toMatch(/nothing to buy/i);
      // Must still warn that this ends — that promise is load-bearing.
      expect(PRO_STATUS_NOTICE).toMatch(/paid plan/i);
    } else {
      expect(PRO_STATUS_LABEL).toMatch(/subscription/i);
      expect(PRO_STATUS_NOTICE).not.toMatch(/free while in beta/i);
    }
  });
});
