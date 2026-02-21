import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import { circuitSchemaToString, resolveCircuitSchema } from "./circuit_schema.js";

export const registerExportProject = (server: MCPServer) => {
  server.tool(
    {
      name: "export_project",
      description:
        "Export project assets, including sketch, circuit schema, BOM, and enclosure files.",
      schema: z.object({
        project_id: z
          .string()
          .default("project-default")
          .describe("Project identifier"),
        format: z
          .enum(["zip", "pdf", "github"])
          .default("zip")
          .describe("Desired export format"),
        circuit_schema: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional()
          .describe("Optional normalized circuit schema"),
        arduino_code: z
          .string()
          .optional()
          .describe("Optional Arduino sketch source"),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ project_id, format, circuit_schema, arduino_code }) => {
      const schema = resolveCircuitSchema({ circuit_schema });
      const extension = format === "github" ? "txt" : format;
      const sketch =
        arduino_code ??
        "// Placeholder sketch\nvoid setup() {}\nvoid loop() {}\n";

      return object({
        project_id,
        format,
        bundle_url: `https://example.local/exports/${project_id}.${extension}`,
        bundled_files: [
          "sketch.ino",
          "circuit_schema.json",
          "bom.csv",
          "validation_report.md",
          "enclosure.stl",
        ],
        preview: {
          sketch_ino: sketch,
          circuit_schema_json: circuitSchemaToString(schema),
          bom_csv: schema.parts
            .map((part) => `${part.ref},${part.name},${part.quantity},${part.mpn ?? ""}`)
            .join("\n"),
        },
      });
    }
  );
};
