import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mcpPrompts } from "@/db/schema";

type RegisteredPrompt = ReturnType<McpServer["registerPrompt"]>;

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptRow {
  id: string;
  name: string;
  title: string;
  description: string;
  template: string;
  arguments: PromptArgument[];
  enabled: boolean;
}

const PROMPT_NAME_RE = /^[a-z][a-z0-9_]{1,63}$/;
const ARG_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,31}$/;

export function validatePromptName(name: string): void {
  if (!PROMPT_NAME_RE.test(name)) {
    throw new Error(
      "Prompt name must be 2-64 chars, lowercase letters/digits/underscore, starting with a letter"
    );
  }
}

export function validateArguments(args: PromptArgument[]): void {
  const seen = new Set<string>();
  for (const arg of args) {
    if (!ARG_NAME_RE.test(arg.name)) {
      throw new Error(
        `Invalid argument name '${arg.name}': must match /^[a-zA-Z_][a-zA-Z0-9_]*$/`
      );
    }
    if (seen.has(arg.name)) throw new Error(`Duplicate argument '${arg.name}'`);
    seen.add(arg.name);
  }
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_m, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : "";
  });
}

function buildArgsSchema(args: PromptArgument[]) {
  const shape: Record<string, z.ZodString | z.ZodOptional<z.ZodString>> = {};
  for (const arg of args) {
    const base = z.string().describe(arg.description ?? "");
    shape[arg.name] = arg.required ? base : base.optional();
  }
  return shape;
}

function registerOne(server: McpServer, row: PromptRow): RegisteredPrompt {
  const argsSchema = buildArgsSchema(row.arguments);
  return server.registerPrompt(
    row.name,
    {
      title: row.title,
      description: row.description,
      argsSchema,
    },
    async (rawArgs: Record<string, string | undefined>) => {
      const vars: Record<string, string> = {};
      for (const arg of row.arguments) {
        const v = rawArgs?.[arg.name];
        if (v !== undefined) vars[arg.name] = v;
      }
      const text = renderTemplate(row.template, vars);
      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text },
          },
        ],
      };
    }
  );
}

export async function loadPrompts(): Promise<PromptRow[]> {
  const rows = await db.select().from(mcpPrompts).where(eq(mcpPrompts.enabled, true));
  return rows as PromptRow[];
}

export async function registerPromptsFromDb(
  server: McpServer
): Promise<Map<string, RegisteredPrompt>> {
  const registry = new Map<string, RegisteredPrompt>();
  const rows = await loadPrompts();
  for (const row of rows) {
    try {
      registry.set(row.name, registerOne(server, row));
    } catch (err) {
      console.error(`Failed to register prompt ${row.name}:`, err);
    }
  }
  return registry;
}

export async function reconcileSessionPrompts(
  server: McpServer,
  registry: Map<string, RegisteredPrompt>
): Promise<void> {
  const rows = await loadPrompts();
  const nextByName = new Map(rows.map((r) => [r.name, r]));

  for (const [name, registered] of registry) {
    if (!nextByName.has(name)) {
      registered.remove();
      registry.delete(name);
    }
  }

  for (const row of rows) {
    const existing = registry.get(row.name);
    if (existing) {
      existing.remove();
    }
    try {
      registry.set(row.name, registerOne(server, row));
    } catch (err) {
      console.error(`Failed to reconcile prompt ${row.name}:`, err);
    }
  }

  server.sendPromptListChanged();
}

export function renderPromptPreview(
  row: Pick<PromptRow, "template" | "arguments">,
  args: Record<string, string>
): { messages: Array<{ role: "user"; content: { type: "text"; text: string } }> } {
  const vars: Record<string, string> = {};
  for (const arg of row.arguments) {
    const v = args?.[arg.name];
    if (v !== undefined) vars[arg.name] = v;
    else if (arg.required) throw new Error(`Missing required argument '${arg.name}'`);
  }
  return {
    messages: [{ role: "user", content: { type: "text", text: renderTemplate(row.template, vars) } }],
  };
}
