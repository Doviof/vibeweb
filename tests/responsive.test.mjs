import { describe, it } from "node:test";
import assert from "node:assert";

describe("Responsive module", () => {
  it("exports BREAKPOINTS constants", async () => {
    const { BREAKPOINTS } = await import("../src/responsive.ts");
    assert.strictEqual(BREAKPOINTS.mobile, 700);
    assert.strictEqual(BREAKPOINTS.tablet, 1100);
    assert.strictEqual(BREAKPOINTS.shortHeight, 600);
  });

  it("getResponsiveCSSVars returns expected keys", async () => {
    // Mock minimal DOM for Node test environment
    globalThis.window = {
      innerWidth: 800,
      innerHeight: 600,
    };
    globalThis.document = {
      createElement: () => ({
        style: { cssText: "" },
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    };
    globalThis.getComputedStyle = () => ({
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    });

    const { getResponsiveCSSVars } = await import("../src/responsive.ts");
    const vars = getResponsiveCSSVars();

    assert.ok(vars["--header"]);
    assert.ok(vars["--footer"]);
    assert.ok(vars["--safe-top"]);
    assert.ok(vars["--safe-bottom"]);
    assert.ok(vars["--safe-left"]);
    assert.ok(vars["--safe-right"]);

    // Clean up
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.getComputedStyle;
  });
});

describe("Theme transition module", () => {
  it("exports transitionTheme function", async () => {
    const { transitionTheme } = await import("../src/themeTransition.ts");
    assert.strictEqual(typeof transitionTheme, "function");
  });
});
