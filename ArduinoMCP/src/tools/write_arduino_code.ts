import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { resolveCircuitSchema } from "./circuit_schema.js";

function parsePinRef(pinRef: string): string | null {
    const parts = pinRef.split(":");
    if (parts.length !== 2) {
        return null;
    }
    return parts[1];
}

function toConstantName(signal: string): string {
    return signal.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export const registerWriteArduinoCode = (server: MCPServer) => {
    server.tool(
        {
            name: "write_arduino_code",
            description:
                "Generate Arduino .ino code from normalized circuit schema and behavior requirements.",
            schema: z.object({
                circuit_schema: z
                    .union([z.string(), z.record(z.string(), z.unknown())])
                    .optional()
                    .describe("Circuit schema JSON string or object"),
                description: z
                    .string()
                    .optional()
                    .describe("Natural-language behavior expected from the firmware"),
                requirements: z
                    .string()
                    .optional()
                    .describe("Backward-compatible alias for description"),
                components: z
                    .array(z.string().describe("Component name"))
                    .optional()
                    .describe("Backward-compatible component list"),
                libraries: z
                    .array(z.string().describe("An Arduino library name"))
                    .default([])
                    .describe("Requested library dependencies"),
            }),
            widget: {
                name: "arduino-circuit-builder",
                invoking: "Generating Arduino workspace...",
                invoked: "Arduino workspace ready",
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
            },
        },
        async ({ circuit_schema, description, requirements, components, libraries }) => {
            const resolvedDescription =
                description ?? requirements ?? "General-purpose Arduino firmware";
            const schema = resolveCircuitSchema({
                circuit_schema,
                fallbackDescription: resolvedDescription,
                fallbackComponents: components,
            });

            const defaultLibraries = ["Arduino.h"];
            const servoRequired = schema.parts.some((part) => /servo/i.test(part.name));
            if (servoRequired) {
                defaultLibraries.push("Servo.h");
            }

            const requiredLibraries = Array.from(new Set([...defaultLibraries, ...libraries]));

            const pinConstants = Object.entries(schema.pin_map)
                .map(([signal, pinRef]) => {
                    const pin = parsePinRef(pinRef);
                    if (!pin) {
                        return null;
                    }
                    return `const int ${toConstantName(signal)}_PIN = ${JSON.stringify(pin)};`;
                })
                .filter((line): line is string => Boolean(line));

            const ledSignal = Object.entries(schema.pin_map).find(([signal]) => /LED/i.test(signal));
            const ledPin = ledSignal ? parsePinRef(ledSignal[1]) ?? "13" : "13";

            const includeLines = requiredLibraries
                .filter((library) => library !== "Arduino.h")
                .map((library) => `#include <${library}>`)
                .join("\n");

            const code = `// ArduinoMCP\n// Project: ${schema.project_name}\n// Description: ${resolvedDescription}\n// Input Voltage: ${schema.power.input_voltage_v}V\n\n${includeLines}\n\n${pinConstants.join("\n")}\n\nvoid setup() {\n  pinMode(${toConstantName(ledSignal?.[0] ?? "LED_STATUS")}_PIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(${toConstantName(ledSignal?.[0] ?? "LED_STATUS")}_PIN, HIGH);\n  delay(500);\n  digitalWrite(${toConstantName(ledSignal?.[0] ?? "LED_STATUS")}_PIN, LOW);\n  delay(500);\n}\n\n// Fallback pin reference: D${ledPin}\n`;

            const widgetComponents = schema.parts.map((part) => ({
                name: part.name,
                qty: part.quantity,
                purchaseUrl: `https://www.adafruit.com/search?q=${encodeURIComponent(part.mpn ?? part.name)}`,
            }));

            const circuitParts = schema.parts.map((part) => ({
                ref: part.ref,
                name: part.name,
            }));

            const circuitNets = schema.nets.map((net) => ({
                name: net.name,
                connections: net.connections.map((conn) => ({
                    partRef: conn.part_ref,
                    pin: conn.pin,
                })),
            }));

            const powerInfo = `${schema.power.input_voltage_v}V / ${schema.power.max_current_ma}mA`;

            return widget({
                props: {
                    prompt: resolvedDescription,
                    filename: "sketch.ino",
                    code,
                    diagramTitle: "Circuit Schematic",
                    diagramNotes: [
                        `Power: ${schema.power.input_voltage_v}V in / ${schema.power.logic_voltage_v}V logic`,
                        `Libraries: ${requiredLibraries.join(", ")}`,
                        `${schema.nets.length} nets / ${schema.parts.length} parts`,
                    ],
                    components: widgetComponents,
                    circuitParts,
                    circuitNets,
                    powerInfo,
                },
                output: text(`Generated Arduino sketch with ${schema.parts.length} parts and ${schema.nets.length} nets.`),
            });
        }
    );
};
