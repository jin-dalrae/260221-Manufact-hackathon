import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import { resolveCircuitSchema } from "./circuit_schema.js";

export const registerValidateCircuit = (server: MCPServer) => {
  server.tool(
    {
      name: "validate_circuit",
      description:
        "Validate a normalized circuit schema for electrical and wiring risks.",
      schema: z.object({
        circuit_schema: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional()
          .describe("Circuit schema JSON string or object"),
        schematic_json: z
          .unknown()
          .optional()
          .describe("Backward-compatible schematic object input"),
      }),
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ circuit_schema, schematic_json }) => {
      const schema = resolveCircuitSchema({ circuit_schema, schematic_json });
      const warnings: Array<{
        code: string;
        severity: "low" | "medium" | "high";
        message: string;
        fix: string;
      }> = [];

      if (schema.power.logic_voltage_v > schema.power.input_voltage_v) {
        warnings.push({
          code: "VOLTAGE_DOMAIN_MISMATCH",
          severity: "high",
          message: "Logic voltage is greater than input voltage.",
          fix: "Lower logic voltage or use a proper regulator/level shifter.",
        });
      }

      const resistorParts = schema.parts.filter((part) => /resistor/i.test(part.name));
      const ledParts = schema.parts.filter((part) => /led/i.test(part.name));

      if (ledParts.length > 0 && resistorParts.length === 0) {
        warnings.push({
          code: "MISSING_LED_RESISTOR",
          severity: "high",
          message: "LED detected without a series resistor in BOM.",
          fix: "Add 220-1k Ohm resistor in series with each LED.",
        });
      }

      for (const net of schema.nets) {
        if (net.connections.length < 2) {
          warnings.push({
            code: "FLOATING_NET",
            severity: "medium",
            message: `Net ${net.name} has fewer than two connections.`,
            fix: "Ensure every net has valid source and destination pins.",
          });
        }
      }

      const pinUse = new Map<string, string>();
      for (const net of schema.nets) {
        for (const connection of net.connections) {
          const key = `${connection.part_ref}:${connection.pin}`;
          const existing = pinUse.get(key);
          if (existing && existing !== net.name) {
            warnings.push({
              code: "POTENTIAL_SHORT",
              severity: "high",
              message: `Pin ${key} is assigned to multiple nets (${existing}, ${net.name}).`,
              fix: "Move the pin to a single electrical net.",
            });
          } else {
            pinUse.set(key, net.name);
          }
        }
      }

      return object({
        pass: warnings.every((warning) => warning.severity !== "high"),
        warnings,
        normalized_circuit_schema: schema,
      });
    }
  );
};
