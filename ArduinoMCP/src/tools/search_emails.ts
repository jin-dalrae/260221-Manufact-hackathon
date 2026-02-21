import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";

export const registerSearchEmails = (server: MCPServer) => {
  server.tool(
    {
      name: "search_emails",
      description:
        "Search project-related emails and extract relevant snippets and specifications.",
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe("Search phrase, e.g. component order or product dimensions"),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ query }) => {
      const resolvedQuery = (query ?? "").toLowerCase();

      return object({
        query: query ?? "",
        snippets: [
          {
            subject: "Re: Sensor module dimensions",
            from: "supplier@example.com",
            date: "2026-02-15",
            snippet: "Board is 45mm x 20mm and works at 5V.",
            extracted_specs: ["45mm x 20mm", "Operating voltage: 5V"],
          },
          {
            subject: "Order confirmation for resistors",
            from: "orders@example.com",
            date: "2026-02-17",
            snippet: "220 Ohm resistor pack ships in 2 business days.",
            extracted_specs: ["220 Ohm", "Ship ETA: 2 business days"],
          },
        ].filter((item) => {
          if (!resolvedQuery) {
            return true;
          }

          return `${item.subject} ${item.snippet}`
            .toLowerCase()
            .includes(resolvedQuery);
        }),
      });
    }
  );
};
