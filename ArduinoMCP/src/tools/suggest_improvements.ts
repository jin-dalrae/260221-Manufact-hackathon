import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import { resolveCircuitSchema } from "./circuit_schema.js";

export const registerSuggestImprovements = (server: MCPServer) => {
  server.tool(
    {
      name: "suggest_improvements",
      description:
        "Suggest firmware and hardware improvements for reliability and power efficiency.",
      schema: z.object({
        circuit_schema: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional()
          .describe("Circuit schema JSON string or object"),
        arduino_code: z
          .string()
          .optional()
          .describe("Current Arduino firmware source code"),
        schematic_json: z
          .unknown()
          .optional()
          .describe("Backward-compatible schematic object input"),
        code: z
          .string()
          .optional()
          .describe("Backward-compatible alias for arduino_code"),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ circuit_schema, arduino_code, schematic_json, code }) => {
      const schema = resolveCircuitSchema({ circuit_schema, schematic_json });
      const resolvedCode =
        arduino_code ??
        code ??
        "void setup() {\n}\n\nvoid loop() {\n}\n";

      const optimizationTips = [
        "Debounce digital inputs in software to avoid false triggers.",
        "Group pin initialization into helper functions for maintainability.",
      ];

      if (schema.nets.length > 10) {
        optimizationTips.push("Split code by subsystem to keep pin handling maintainable.");
      }

      const powerEfficiency = [
        "Use sleep modes between sensor reads.",
        "Disable unused peripherals to reduce idle current draw.",
      ];

      if (schema.power.input_voltage_v > 9) {
        powerEfficiency.push("Use a buck regulator instead of linear regulation for thermal efficiency.");
      }

      const alternativeComponents = [
        "Swap linear regulator with a buck converter for higher efficiency.",
        "Use low-power LEDs with higher luminous efficacy.",
      ];

      return object({
        optimization_tips: optimizationTips,
        power_efficiency: powerEfficiency,
        alternative_components: alternativeComponents,
        analyzed_schema: {
          parts: schema.parts.length,
          nets: schema.nets.length,
          input_voltage_v: schema.power.input_voltage_v,
        },
        analyzed_code_lines: resolvedCode.split("\n").length,
      });
    }
  );
};
