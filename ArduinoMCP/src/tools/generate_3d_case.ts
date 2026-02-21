import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import { resolveCircuitSchema } from "./circuit_schema.js";

export const registerGenerate3DCase = (server: MCPServer) => {
  server.tool(
    {
      name: "generate_3d_case",
      description:
        "Generate OpenSCAD for an enclosure from a normalized circuit schema.",
      schema: z.object({
        circuit_schema: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional()
          .describe("Circuit schema JSON string or object"),
        board_size: z
          .object({
            length_mm: z.number().describe("Board length in millimeters"),
            width_mm: z.number().describe("Board width in millimeters"),
            height_mm: z
              .number()
              .default(20)
              .describe("Board max height including components in millimeters"),
          })
          .optional()
          .describe("Board dimensions"),
        style: z
          .enum(["minimal", "vented", "rugged"])
          .default("minimal")
          .describe("Case style preset"),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ circuit_schema, board_size, style }) => {
      const schema = resolveCircuitSchema({ circuit_schema });
      const estimatedHeight = Math.max(20, 12 + schema.parts.length * 1.5);
      const resolvedBoardSize = board_size ?? {
        length_mm: 68.6,
        width_mm: 53.4,
        height_mm: estimatedHeight,
      };

      const margin = style === "rugged" ? 6 : 4;
      const ventSlots = style === "vented" ? 8 : 0;
      const caseLength = resolvedBoardSize.length_mm + margin * 2;
      const caseWidth = resolvedBoardSize.width_mm + margin * 2;
      const caseHeight = resolvedBoardSize.height_mm + margin * 2;

      return object({
        openscad_code: `// Auto-generated case (${style})\n// Parts: ${schema.parts.length}\nmodule enclosure() {\n  difference() {\n    cube([${caseLength}, ${caseWidth}, ${caseHeight}], center=false);\n    translate([2,2,2]) cube([${caseLength - 4}, ${caseWidth - 4}, ${caseHeight - 2}], center=false);\n    // Vents\n    for (i = [0:${Math.max(0, ventSlots - 1)}]) {\n      translate([6 + i * 6, ${caseWidth - 2}, ${caseHeight / 2}]) rotate([90,0,0]) cylinder(h=2, r=1.5);\n    }\n  }\n}\nenclosure();\n`,
        stl_file: `generated/case-${style}-${caseLength}x${caseWidth}x${caseHeight}.stl`,
        derived_from_schema: {
          part_count: schema.parts.length,
          net_count: schema.nets.length,
        },
      });
    }
  );
};
