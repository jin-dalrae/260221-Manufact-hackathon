import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";
import {
    circuitSchemaToString,
    createDefaultCircuitSchema,
    type CircuitSchema,
} from "./circuit_schema.js";

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

function toComponentList(schema: CircuitSchema) {
    return schema.parts.map((part) => ({
        name: part.name,
        quantity: part.quantity,
        reason: `Mapped to ${part.ref}`,
        mpn: part.mpn ?? "N/A",
    }));
}

function toWiringInstructions(schema: CircuitSchema) {
    return schema.nets.map((net) => {
        const pins = net.connections.map((connection) => `${connection.part_ref}:${connection.pin}`);
        return `${net.name}: ${pins.join(" -> ")}`;
    });
}

export const registerGenerateCircuit = (server: MCPServer) => {
    server.tool(
        {
            name: "generate_circuit",
            description:
                "Generate an Arduino circuit from requirements and return component list, wiring instructions, and a strict circuit schema.",
            schema: circuitInputSchema,
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
            },
        },
        async ({ description, requirements, power_supply, constraints, components }) => {
            const resolvedDescription = (description ?? requirements ?? "General-purpose Arduino circuit").toLowerCase();
            const resolvedPowerSupply = power_supply ?? "5V";

            const componentList = [
                { name: "Arduino Uno R3", quantity: 1, reason: "Main controller board" },
                { name: "Breadboard", quantity: 1, reason: "Rapid prototyping" },
            ];

            const wiringInstructions = [
                "Connect Arduino 5V to breadboard positive rail.",
                "Connect Arduino GND to breadboard ground rail.",
            ];

            const connections = [
                { from: "5V", to: "Breadboard:+" },
                { from: "GND", to: "Breadboard:-" },
            ];

            // Simple rule-based logic
            if (resolvedDescription.includes("temperature") || resolvedDescription.includes("humidity")) {
                componentList.push({ name: "DHT11 Sensor", quantity: 1, reason: "Temperature and humidity measurement" });
                wiringInstructions.push("Connect DHT11 VCC to 5V, GND to GND, and DATA to Pin 2.");
                connections.push({ from: "D2", to: "DHT11:Data" });
            }

            if (resolvedDescription.includes("distance") || resolvedDescription.includes("ultrasonic")) {
                componentList.push({ name: "HC-SR04 Ultrasonic Sensor", quantity: 1, reason: "Distance sensing" });
                wiringInstructions.push("Connect HC-SR04 VCC to 5V, GND to GND, Trig to Pin 11, and Echo to Pin 12.");
                connections.push({ from: "D11", to: "HC-SR04:Trig" }, { from: "D12", to: "HC-SR04:Echo" });
            }

            if (resolvedDescription.includes("servo") || resolvedDescription.includes("motor")) {
                componentList.push({ name: "SG90 Micro Servo", quantity: 1, reason: "Motion control" });
                wiringInstructions.push("Connect Servo Brown to GND, Red to 5V, and Orange to Pin 9.");
                connections.push({ from: "D9", to: "Servo:Signal" });
            }

            if (resolvedDescription.includes("led") || componentList.length === 2) {
                componentList.push(
                    { name: "220 Ohm Resistor", quantity: 1, reason: "LED current limiting" },
                    { name: "LED", quantity: 1, reason: "Visual indicator" }
                );
                wiringInstructions.push("Connect LED anode to Pin 13 via 220 Ohm resistor, and cathode to GND.");
                connections.push({ from: "D13", to: "R1:1" }, { from: "R1:2", to: "LED:A" }, { from: "LED:K", to: "GND" });
            }

            return object({
                component_list: componentList,
                wiring_instructions: wiringInstructions,
                schematic_json: {
                    version: "1.0",
                    description: resolvedDescription,
                    power_supply: resolvedPowerSupply,
                    constraints,
                    requested_components: components ?? [],
                    nodes: ["5V", "GND", ...connections.filter(c => c.from.startsWith("D")).map(c => c.from)],
                    connections: connections,
                },
            });
        }
    );
};
