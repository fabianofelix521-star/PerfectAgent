import { api } from "@/services/api";
import { useConfig } from "@/stores/config";
import type { Tool } from "@/types";

interface InlineToolCall {
  functionName: string;
  args: Record<string, unknown>;
  raw: string;
}

export async function executeInlineToolCalls(content: string): Promise<{
  content: string;
  executed: number;
}> {
  const calls = parseInlineToolCalls(content);
  if (!calls.length) return { content, executed: 0 };

  const results: string[] = [];
  for (const call of calls.slice(0, 4)) {
    const tool = findTool(call.functionName);
    if (!tool) {
      results.push(
        `### ${call.functionName}\nFerramenta nao encontrada no catalogo ativo.`,
      );
      continue;
    }
    const response = await api.runTool({
      kind: tool.kind,
      args: { ...(tool.config ?? {}), ...call.args },
      code: tool.code,
    });
    results.push(
      [
        `### ${tool.name}`,
        "```json",
        JSON.stringify(response, null, 2),
        "```",
      ].join("\n"),
    );
  }

  const cleaned = content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
  return {
    content: [
      cleaned,
      "## Resultados das ferramentas executadas",
      ...results,
    ].filter(Boolean).join("\n\n"),
    executed: results.length,
  };
}

function parseInlineToolCalls(content: string): InlineToolCall[] {
  const calls: InlineToolCall[] = [];
  const re = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) {
    const raw = match[0];
    const body = match[1] ?? "";
    const fn = body.match(/<function=([^>\n]+)>/)?.[1]?.trim();
    if (!fn) continue;
    const args: Record<string, unknown> = {};
    const paramRe = /<parameter=([^>\n]+)>([\s\S]*?)<\/parameter>/g;
    let param: RegExpExecArray | null;
    while ((param = paramRe.exec(body))) {
      const key = param[1]?.trim();
      const value = decodeInlineValue((param[2] ?? "").trim());
      if (key) args[key] = value;
    }
    calls.push({ functionName: fn, args, raw });
  }
  return calls;
}

function findTool(functionName: string): Tool | undefined {
  const tools = useConfig.getState().tools.filter((tool) => tool.enabled);
  const normalized = normalize(functionName);
  return tools.find((tool) =>
    [
      tool.id,
      tool.name,
      tool.kind,
      tool.name.replace(/\s+/g, "_"),
      tool.name.replace(/\s+/g, "-"),
    ].some((candidate) => normalize(candidate) === normalized),
  );
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function decodeInlineValue(value: string): unknown {
  if (!value) return "";
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith("[") && value.endsWith("]"))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
