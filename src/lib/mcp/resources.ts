import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, ideas, initiatives, pillars } from "@/db/schema";

function jsonContent(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function registerResources(server: McpServer) {
  server.registerResource(
    "pillars",
    "roadmap://pillars",
    {
      title: "All Pillars",
      description: "Strategic pillars (categories) with descriptions and customer stories.",
      mimeType: "application/json",
    },
    async (uri) => {
      const rows = await db.select().from(pillars).orderBy(asc(pillars.sortOrder));
      return jsonContent(uri, rows);
    }
  );

  server.registerResource(
    "open_ideas",
    "roadmap://ideas/open",
    {
      title: "Open Ideas",
      description: "All ideas currently in 'open' status, newest first.",
      mimeType: "application/json",
    },
    async (uri) => {
      const rows = await db
        .select()
        .from(ideas)
        .where(eq(ideas.status, "open"))
        .orderBy(desc(ideas.createdAt));
      return jsonContent(uri, rows);
    }
  );

  server.registerResource(
    "pillar",
    new ResourceTemplate("roadmap://pillar/{id}", {
      list: async () => {
        const rows = await db
          .select({ id: pillars.id, name: pillars.name })
          .from(pillars)
          .orderBy(asc(pillars.sortOrder));
        return {
          resources: rows.map((p) => ({
            uri: `roadmap://pillar/${p.id}`,
            name: p.name,
            mimeType: "application/json",
          })),
        };
      },
    }),
    {
      title: "Pillar Detail",
      description: "A single pillar with its initiatives.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const [pillar] = await db.select().from(pillars).where(eq(pillars.id, id));
      if (!pillar) throw new Error("not_found");
      const pillarInitiatives = await db
        .select()
        .from(initiatives)
        .where(eq(initiatives.pillarId, id))
        .orderBy(asc(initiatives.sortOrder));
      return jsonContent(uri, { pillar, initiatives: pillarInitiatives });
    }
  );

  server.registerResource(
    "initiative",
    new ResourceTemplate("roadmap://initiative/{id}", {
      list: async () => {
        const rows = await db
          .select({ id: initiatives.id, title: initiatives.title })
          .from(initiatives)
          .orderBy(asc(initiatives.sortOrder));
        return {
          resources: rows.map((i) => ({
            uri: `roadmap://initiative/${i.id}`,
            name: i.title,
            mimeType: "application/json",
          })),
        };
      },
    }),
    {
      title: "Initiative Detail",
      description: "A single initiative with its comments.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const [initiative] = await db
        .select()
        .from(initiatives)
        .where(eq(initiatives.id, id));
      if (!initiative) throw new Error("not_found");
      const initiativeComments = await db
        .select()
        .from(comments)
        .where(and(eq(comments.targetType, "initiative"), eq(comments.targetId, id)))
        .orderBy(asc(comments.createdAt));
      return jsonContent(uri, { initiative, comments: initiativeComments });
    }
  );
}
