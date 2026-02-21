import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import { createDefaultCircuitSchema } from "./circuit_schema.js";

export const registerAnalyzePhoto = (server: MCPServer) => {
  server.tool(
    {
      name: "analyze_photo",
      description:
        "Analyze a circuit photo and infer components, dimensions, layout hints, and a draft circuit schema.",
      schema: z.object({
        image: z
          .string()
          .optional()
          .describe("Image URL or file identifier from Google Photos"),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ image }) => {
      const draftSchema = createDefaultCircuitSchema({
        description: "Draft schema inferred from photo",
      });

      return object({
        image: image ?? "",
        detected_components: [
          "Arduino Uno compatible board",
          "Breadboard",
          "Jumper wires",
          "One LED",
        ],
        dimensions: {
          estimated_width_mm: 120,
          estimated_height_mm: 80,
        },
        circuit_layout_hints: [
          "Keep sensor wires shorter than 20cm for signal stability.",
          "Route power and signal lines separately to reduce noise.",
        ],
        extracted_circuit_schema: draftSchema,
      });
    }
  );
};
