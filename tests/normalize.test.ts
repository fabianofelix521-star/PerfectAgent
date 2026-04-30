import { describe, it, expect } from "vitest";
import {
  normalizeAssistantOutput,
  normalizeMarkdown,
  extractStaticHtml,
} from "@/services/normalize";

describe("normalizeMarkdown", () => {
  it("returns empty string for null/undefined", () => {
    expect(normalizeMarkdown(undefined)).toBe("");
    expect(normalizeMarkdown(null)).toBe("");
  });

  it("repairs `\\nhtml\\n<!doctype` after backticks", () => {
    const input = "```\nhtml\n<!DOCTYPE html><html></html>\n```";
    const out = normalizeMarkdown(input);
    expect(out).toMatch(/```html/);
  });

  it("closes unbalanced fences", () => {
    const input = "Here is code:\n```js\nconsole.log('hi');\n";
    const out = normalizeMarkdown(input);
    expect(out.trim().endsWith("```")).toBe(true);
  });

  it("wraps a raw <!DOCTYPE html> dump in an html fence", () => {
    const input = "Here it is\n<!DOCTYPE html><html><body>hi</body></html>";
    const out = normalizeMarkdown(input);
    expect(out).toMatch(/```html\n[\s\S]*<!DOCTYPE html>/);
  });

  it("strips raw `plan {json}` noise", () => {
    const input = 'Hello\nplan { "goal": "x" }\nworld';
    const out = normalizeMarkdown(input);
    expect(out).not.toMatch(/plan\s*\{/);
    expect(out).toMatch(/Hello/);
    expect(out).toMatch(/world/);
  });
});

describe("normalizeAssistantOutput", () => {
  it("handles a plain string", () => {
    const m = normalizeAssistantOutput({ raw: "Hi there" });
    expect(m.mode).toBe("final");
    expect(m.finalMarkdown).toBe("Hi there");
    expect(m.chunks).toHaveLength(0);
  });

  it("extracts plan/act/verify chunks from object form", () => {
    const m = normalizeAssistantOutput({
      raw: {
        plan: { output: { plan: "Plan body" } },
        act: { output: { act: "<!DOCTYPE html><html></html>" } },
        verify: { output: { verify: { summary: "All good" } } },
      },
    });
    expect(m.mode).toBe("pipeline");
    expect(m.chunks.map((c) => c.stage).sort()).toEqual([
      "act",
      "plan",
      "verify",
    ]);
    // finalMarkdown should derive from verify summary, not raw JSON
    expect(m.finalMarkdown).toMatch(/All good/);
    expect(m.finalMarkdown).not.toMatch(/"output"/);
  });

  it("extracts inline `plan { ... }` noise from streamed text into chunks", () => {
    const stream = `plan { "output": { "plan": "do x" } }
act { "output": { "act": "html\n<!DOCTYPE html><html></html>" } }
verify { "output": { "verify": { "summary": "ready" } } }`;
    const m = normalizeAssistantOutput({ raw: stream });
    expect(m.chunks.length).toBeGreaterThanOrEqual(3);
    expect(m.finalMarkdown).not.toMatch(/plan\s*\{/);
  });

  it("keeps the inferred final answer out of the thinking chunk body", () => {
    const m = normalizeAssistantOutput({
      raw: `plan { "output": { "plan": "analyze request" } }
verify { "output": { "verify": { "summary": "Projeto gerado e preview aberto." } } }`,
    });
    expect(m.finalMarkdown).toBe("Projeto gerado e preview aberto.");
    expect(
      m.chunks.find((chunk) => chunk.stage === "verify")?.summary,
    ).not.toBe("Projeto gerado e preview aberto.");
  });

  it("does not turn plan-only reasoning into the visible final answer", () => {
    const m = normalizeAssistantOutput({
      raw: `plan { "output": { "plan": "Recognize that ok is only an acknowledgement and invite the user to continue." } }`,
    });
    expect(m.finalMarkdown).toMatch(/Entendi|proximo pedido/i);
    expect(m.finalMarkdown).not.toMatch(/Recognize that ok/i);
  });

  it("never leaks raw JSON in finalMarkdown when verify is structured", () => {
    const m = normalizeAssistantOutput({
      raw: { verify: { output: { verify: { summary: "Looks great" } } } },
    });
    expect(m.finalMarkdown).toBe("Looks great");
    expect(m.finalMarkdown).not.toMatch(/[{}]/);
  });
});

describe("extractStaticHtml", () => {
  it("returns html from a fenced block", () => {
    const m = normalizeAssistantOutput({
      raw: "Here you go:\n```html\n<!DOCTYPE html><html><body>hi</body></html>\n```",
    });
    expect(extractStaticHtml(m)).toMatch(/^<!DOCTYPE html>/);
  });

  it("returns html from a raw dump in act chunk", () => {
    const m = normalizeAssistantOutput({
      raw: {
        act: { output: { act: "<!DOCTYPE html><html><body>x</body></html>" } },
      },
    });
    expect(extractStaticHtml(m)).toMatch(/^<!DOCTYPE html>/);
  });

  it("returns null when no html present", () => {
    const m = normalizeAssistantOutput({ raw: "Just a chat reply." });
    expect(extractStaticHtml(m)).toBeNull();
  });
});
