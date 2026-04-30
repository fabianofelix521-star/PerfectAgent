import { describe, expect, it } from "vitest";
import {
  parseBoltArtifact,
  extractFiles,
  extractShellCommands,
  extractFilesFromCodeFences,
  extractProjectFiles,
} from "@/services/boltArtifact";

describe("bolt artifact parser", () => {
  it("parses a complete boltArtifact with file and shell actions", () => {
    const raw = `
Some intro text.
<boltArtifact id="proj-1" title="My App">
  <boltAction type="file" filePath="index.html">
    <!doctype html><html><body><h1>Hello</h1></body></html>
  </boltAction>
  <boltAction type="file" filePath="package.json">
    { "name": "app", "scripts": { "dev": "vite" } }
  </boltAction>
  <boltAction type="shell">
    npm install
  </boltAction>
  <boltAction type="shell">
    npm run dev
  </boltAction>
</boltArtifact>
Some trailing text.
`;
    const artifact = parseBoltArtifact(raw);
    expect(artifact).not.toBeNull();
    expect(artifact!.id).toBe("proj-1");
    expect(artifact!.title).toBe("My App");
    expect(artifact!.actions).toHaveLength(4);

    const files = extractFiles(artifact!);
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe("index.html");
    expect(files[0].content).toContain("<h1>Hello</h1>");
    expect(files[1].path).toBe("package.json");

    const shells = extractShellCommands(artifact!);
    expect(shells).toEqual(["npm install", "npm run dev"]);
  });

  it("returns null when no boltArtifact tags present", () => {
    const raw = "Just some plain text with no artifacts.";
    expect(parseBoltArtifact(raw)).toBeNull();
  });

  it("falls back to code fences when no artifact tags", () => {
    const raw = `
Here is the code:

\`\`\`tsx src/App.tsx
export default function App() { return <h1>Hi</h1>; }
\`\`\`

\`\`\`css src/styles.css
body { margin: 0; }
\`\`\`
`;
    const files = extractFilesFromCodeFences(raw);
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f) => f.path === "src/App.tsx")).toBe(true);
    expect(files.some((f) => f.path === "src/styles.css")).toBe(true);
  });

  it("extractProjectFiles uses bolt-artifact method when tags present", () => {
    const raw = `<boltArtifact id="p1" title="Test">
  <boltAction type="file" filePath="app.js">console.log("hi")</boltAction>
</boltArtifact>`;
    const result = extractProjectFiles(raw);
    expect(result.method).toBe("bolt-artifact");
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("app.js");
  });

  it("extractProjectFiles uses code-fences method when no tags", () => {
    const raw = '```js index.js\nconsole.log("hi");\n```';
    const result = extractProjectFiles(raw);
    expect(result.method).toBe("code-fences");
    expect(result.files).toHaveLength(1);
  });

  it("extractProjectFiles returns none when nothing found", () => {
    const result = extractProjectFiles("no code here");
    expect(result.method).toBe("none");
    expect(result.files).toHaveLength(0);
  });
});
