import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import type { CircuitSchema } from "./circuit_schema.js";

const circuitInputSchema = z.object({
    description: z
        .string()
        .optional()
        .describe("Natural-language description of what the circuit should do"),
    requirements: z
        .string()
        .optional()
        .describe("Backward-compatible alias for description"),
    power_supply: z
        .string()
        .optional()
        .describe("Power input for the design, for example 5V, 12V, or battery voltage"),
    constraints: z
        .array(z.string().describe("A specific design constraint"))
        .default([])
        .describe("Optional constraints like size, cost, safety, or environment"),
    components: z
        .array(z.string().describe("Requested component name"))
        .optional()
        .describe("Requested component list"),
});

function parsePowerSupply(raw?: string): number {
    if (!raw) return 5;
    const v = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
    return Number.isFinite(v) && v > 0 ? v : 5;
}

export const registerGenerateCircuit = (server: MCPServer) => {
    server.tool(
        {
            name: "generate_circuit",
            description:
                "Generate an Arduino circuit from requirements and return a normalized circuit schema with parts, nets, and wiring.",
            schema: circuitInputSchema,
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
            },
        },
        async ({ description, requirements, power_supply, constraints, components }) => {
            const desc = (description ?? requirements ?? "General-purpose Arduino circuit").toLowerCase();
            const inputV = parsePowerSupply(power_supply);
            const logicV = inputV <= 5 ? inputV : 5;

            // ── Parts ──
            const parts: CircuitSchema["parts"] = [
                { ref: "U1", name: "Arduino Uno R3", mpn: "A000066", quantity: 1, logic_voltage_v: 5 },
            ];

            // ── Nets & pin map ──
            const nets: CircuitSchema["nets"] = [];
            const pinMap: Record<string, string> = {};

            const vccConnections: CircuitSchema["nets"][number]["connections"] = [{ part_ref: "U1", pin: "5V" }];
            const gndConnections: CircuitSchema["nets"][number]["connections"] = [{ part_ref: "U1", pin: "GND" }];

            const wiringInstructions: string[] = [
                "Connect Arduino 5V to breadboard positive rail.",
                "Connect Arduino GND to breadboard ground rail.",
            ];

            // ── Rule-based component selection ──
            let refCounter = { sensor: 1, resistor: 1, led: 1, servo: 1 };

            if (desc.includes("temperature") || desc.includes("humidity")) {
                const ref = `S${refCounter.sensor++}`;
                parts.push({ ref, name: "DHT11 Temperature & Humidity Sensor", quantity: 1 });
                vccConnections.push({ part_ref: ref, pin: "VCC" });
                gndConnections.push({ part_ref: ref, pin: "GND" });
                nets.push({
                    name: "DHT_DATA",
                    connections: [
                        { part_ref: "U1", pin: "D2" },
                        { part_ref: ref, pin: "DATA" },
                    ],
                });
                pinMap["DHT_DATA"] = "U1:D2";
                wiringInstructions.push(`Connect ${ref} DHT11: VCC→5V, GND→GND, DATA→D2.`);
            }

            if (desc.includes("distance") || desc.includes("ultrasonic")) {
                const ref = `S${refCounter.sensor++}`;
                parts.push({ ref, name: "HC-SR04 Ultrasonic Sensor", quantity: 1 });
                vccConnections.push({ part_ref: ref, pin: "VCC" });
                gndConnections.push({ part_ref: ref, pin: "GND" });
                nets.push(
                    {
                        name: "SR04_TRIG",
                        connections: [
                            { part_ref: "U1", pin: "D11" },
                            { part_ref: ref, pin: "TRIG" },
                        ],
                    },
                    {
                        name: "SR04_ECHO",
                        connections: [
                            { part_ref: "U1", pin: "D12" },
                            { part_ref: ref, pin: "ECHO" },
                        ],
                    },
                );
                pinMap["SR04_TRIG"] = "U1:D11";
                pinMap["SR04_ECHO"] = "U1:D12";
                wiringInstructions.push(`Connect ${ref} HC-SR04: VCC→5V, GND→GND, TRIG→D11, ECHO→D12.`);
            }

            if (desc.includes("servo") || desc.includes("motor")) {
                const ref = `M${refCounter.servo++}`;
                parts.push({ ref, name: "SG90 Micro Servo", quantity: 1 });
                vccConnections.push({ part_ref: ref, pin: "VCC" });
                gndConnections.push({ part_ref: ref, pin: "GND" });
                nets.push({
                    name: "SERVO_SIG",
                    connections: [
                        { part_ref: "U1", pin: "D9" },
                        { part_ref: ref, pin: "SIG" },
                    ],
                });
                pinMap["SERVO_SIG"] = "U1:D9";
                wiringInstructions.push(`Connect ${ref} Servo: Brown→GND, Red→5V, Orange→D9.`);
            }

            // Always add an LED + resistor (status indicator or fallback default)
            if (desc.includes("led") || parts.length === 1) {
                const rRef = `R${refCounter.resistor++}`;
                const dRef = `D${refCounter.led++}`;
                parts.push(
                    { ref: rRef, name: "220 Ohm Resistor", quantity: 1 },
                    { ref: dRef, name: "LED", quantity: 1, max_current_ma: 20 },
                );
                nets.push(
                    {
                        name: "LED_STATUS",
                        connections: [
                            { part_ref: "U1", pin: "D13" },
                            { part_ref: rRef, pin: "1" },
                        ],
                    },
                    {
                        name: "LED_ANODE",
                        connections: [
                            { part_ref: rRef, pin: "2" },
                            { part_ref: dRef, pin: "A" },
                        ],
                    },
                );
                gndConnections.push({ part_ref: dRef, pin: "K" });
                pinMap["LED_STATUS"] = "U1:D13";
                wiringInstructions.push(`Connect ${dRef} LED: anode via ${rRef} 220Ω to D13, cathode to GND.`);
            }

            // Add explicit user-requested components as generic parts
            if (components) {
                for (const compName of components) {
                    const ref = `X${parts.length}`;
                    parts.push({ ref, name: compName, quantity: 1 });
                }
            }

            // Assemble power nets
            nets.unshift(
                { name: "VCC", connections: vccConnections },
                { name: "GND", connections: gndConnections },
            );

            // ── Build full CircuitSchema ──
            const schema: CircuitSchema = {
                version: "1.0",
                project_name: "antigravity-arduino-project",
                description: desc,
                power: {
                    input_voltage_v: inputV,
                    logic_voltage_v: logicV,
                    max_current_ma: 500,
                },
                parts,
                nets,
                pin_map: pinMap,
                constraints: constraints.map((c, i) => ({
                    id: `C${i + 1}`,
                    description: c,
                    type: "general" as const,
                })),
            };

            return object({
                component_list: parts.map((p) => ({
                    name: p.name,
                    quantity: p.quantity,
                    ref: p.ref,
                    mpn: p.mpn ?? "N/A",
                })),
                wiring_instructions: wiringInstructions,
                circuit_schema: schema,
            });
        },
    );
};
