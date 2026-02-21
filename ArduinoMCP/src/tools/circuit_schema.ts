import { z } from "zod";

export const partSchema = z.object({
  ref: z.string().describe("Reference designator, e.g. U1, R1, D1"),
  name: z.string().describe("Human-readable part name"),
  mpn: z.string().optional().describe("Manufacturer part number"),
  quantity: z.number().int().positive().default(1).describe("Part quantity"),
  logic_voltage_v: z.number().optional().describe("Nominal logic voltage"),
  max_current_ma: z.number().optional().describe("Max recommended current in mA"),
});

export const netConnectionSchema = z.object({
  part_ref: z.string().describe("Connected part reference"),
  pin: z.string().describe("Pin identifier on the part"),
});

export const netSchema = z.object({
  name: z.string().describe("Electrical net name"),
  connections: z
    .array(netConnectionSchema)
    .default([])
    .describe("Pins connected on this net"),
});

export const constraintSchema = z.object({
  id: z.string().describe("Constraint identifier"),
  description: z.string().describe("Constraint details"),
  type: z
    .enum(["size", "cost", "safety", "thermal", "power", "general"])
    .default("general")
    .describe("Constraint category"),
});

export const circuitSchema = z.object({
  version: z.string().default("1.0"),
  project_name: z.string().default("antigravity-arduino-project"),
  description: z.string().default("General-purpose Arduino circuit"),
  power: z.object({
    input_voltage_v: z.number().default(5),
    logic_voltage_v: z.number().default(5),
    max_current_ma: z.number().default(500),
  }),
  parts: z.array(partSchema).default([]),
  nets: z.array(netSchema).default([]),
  pin_map: z
    .record(z.string(), z.string())
    .default({})
    .describe("Signal name to pin mapping, e.g. LED_STATUS -> U1:D13"),
  constraints: z.array(constraintSchema).default([]),
});

export type CircuitSchema = z.infer<typeof circuitSchema>;

function parsePowerSupply(powerSupply?: string): number {
  if (!powerSupply) {
    return 5;
  }

  const value = Number.parseFloat(powerSupply.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : 5;
}

export function createDefaultCircuitSchema(params?: {
  description?: string;
  powerSupply?: string;
  requestedComponents?: string[];
}): CircuitSchema {
  const inputVoltage = parsePowerSupply(params?.powerSupply);
  const requestedComponents = params?.requestedComponents ?? [];

  const fallbackParts: CircuitSchema["parts"] = [
    { ref: "U1", name: "Arduino Uno R3", mpn: "A000066", quantity: 1, logic_voltage_v: 5 },
    { ref: "R1", name: "220 Ohm Resistor", quantity: 1 },
    { ref: "D1", name: "LED", quantity: 1, max_current_ma: 20 },
  ];

  const requestedParts = requestedComponents.map((component, index) => ({
    ref: `X${index + 1}`,
    name: component,
    quantity: 1,
  }));

  return {
    version: "1.0",
    project_name: "antigravity-arduino-project",
    description: params?.description ?? "General-purpose Arduino circuit",
    power: {
      input_voltage_v: inputVoltage,
      logic_voltage_v: inputVoltage <= 5 ? inputVoltage : 5,
      max_current_ma: 500,
    },
    parts: requestedParts.length > 0 ? [{ ...fallbackParts[0] }, ...requestedParts] : fallbackParts,
    nets: [
      {
        name: "VCC",
        connections: [
          { part_ref: "U1", pin: "5V" },
          { part_ref: "D1", pin: "A" },
        ],
      },
      {
        name: "GND",
        connections: [
          { part_ref: "U1", pin: "GND" },
          { part_ref: "D1", pin: "K" },
          { part_ref: "R1", pin: "2" },
        ],
      },
      {
        name: "LED_STATUS",
        connections: [
          { part_ref: "U1", pin: "D13" },
          { part_ref: "R1", pin: "1" },
        ],
      },
    ],
    pin_map: {
      LED_STATUS: "U1:D13",
    },
    constraints: [],
  };
}

function convertLegacySchematic(raw: Record<string, unknown>): CircuitSchema | null {
  const description =
    typeof raw.description === "string" ? raw.description : "General-purpose Arduino circuit";
  const powerSupply = typeof raw.power_supply === "string" ? raw.power_supply : "5V";
  const requestedComponents = Array.isArray(raw.requested_components)
    ? raw.requested_components.filter((item): item is string => typeof item === "string")
    : [];

  return createDefaultCircuitSchema({ description, powerSupply, requestedComponents });
}

export function resolveCircuitSchema(params: {
  circuit_schema?: unknown;
  schematic_json?: unknown;
  fallbackDescription?: string;
  fallbackPowerSupply?: string;
  fallbackComponents?: string[];
}): CircuitSchema {
  const fallback = createDefaultCircuitSchema({
    description: params.fallbackDescription,
    powerSupply: params.fallbackPowerSupply,
    requestedComponents: params.fallbackComponents,
  });

  const parseCandidate = (candidate: unknown): CircuitSchema | null => {
    const result = circuitSchema.safeParse(candidate);
    if (result.success) {
      return result.data;
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return convertLegacySchematic(candidate as Record<string, unknown>);
    }

    return null;
  };

  if (typeof params.circuit_schema === "string") {
    try {
      const parsed = JSON.parse(params.circuit_schema);
      return parseCandidate(parsed) ?? fallback;
    } catch {
      return fallback;
    }
  }

  if (params.circuit_schema !== undefined && params.circuit_schema !== null) {
    return parseCandidate(params.circuit_schema) ?? fallback;
  }

  if (params.schematic_json !== undefined) {
    return parseCandidate(params.schematic_json) ?? fallback;
  }

  return fallback;
}

export function circuitSchemaToString(schema: CircuitSchema): string {
  return JSON.stringify(schema, null, 2);
}
