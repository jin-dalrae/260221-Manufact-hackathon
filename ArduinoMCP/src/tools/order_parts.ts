import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import { resolveCircuitSchema } from "./circuit_schema.js";

const bomItemSchema = z.object({
  name: z.string().describe("Component name"),
  quantity: z.number().int().positive().describe("Requested quantity"),
  part_number: z
    .string()
    .optional()
    .describe("Manufacturer part number if known"),
});

export const registerOrderParts = (server: MCPServer) => {
  server.tool(
    {
      name: "order_parts",
      description:
        "Create vendor cart links from BOM data or a normalized circuit schema.",
      schema: z.object({
        bom_list: z
          .array(bomItemSchema)
          .default([])
          .describe("Bill of materials entries"),
        circuit_schema: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional()
          .describe("Optional normalized circuit schema"),
        preferred_vendor: z
          .enum(["mouser", "digikey", "either"])
          .default("either")
          .describe("Preferred purchasing vendor"),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ bom_list, circuit_schema, preferred_vendor }) => {
      const schema = resolveCircuitSchema({ circuit_schema });
      const derivedBom = schema.parts.map((part) => ({
        name: part.name,
        quantity: part.quantity,
        part_number: part.mpn,
      }));

      const workingBom = bom_list.length > 0 ? bom_list : derivedBom;
      const base = preferred_vendor === "either" ? "mouser" : preferred_vendor;
      const query = encodeURIComponent(workingBom.map((item) => item.part_number ?? item.name).join(" "));

      const totalPriceEstimate = workingBom.reduce(
        (sum, item) => sum + item.quantity * 1.25,
        0
      );

      return object({
        bom_used: workingBom,
        cart_links: [
          {
            vendor: "mouser",
            url: `https://www.mouser.com/c/?q=${query}`,
          },
          {
            vendor: "digikey",
            url: `https://www.digikey.com/en/products/result?s=${query}`,
          },
        ].filter((entry) => preferred_vendor === "either" || entry.vendor === base),
        total_price_estimate_usd: Number(totalPriceEstimate.toFixed(2)),
        delivery_time: "3-7 business days",
      });
    }
  );
};
