import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";

/**
 * Tool to generate Arduino (.ino) code for a given circuit.
 */
export const registerWriteArduinoCode = (server: MCPServer) => {
  server.tool(
    {
      name: "write_arduino_code",
      description: "Generate Arduino .ino code based on circuit requirements",
      schema: z.object({
        description: z
          .string()
          .describe("Natural language description of what the circuit should do"),
        components: z
          .array(z.string())
          .optional()
          .describe("Optional list of components used in the circuit"),
      }),
      widget: {
        name: "arduino-circuit-builder",
        invoking: "Generating Arduino workspace...",
        invoked: "Arduino workspace ready",
      },
    },
    async ({ description, components = [] }) => {
      const uniqueComponents = Array.from(new Set(components));
      const componentItems = uniqueComponents.map((name) => ({
        name,
        qty: 1,
        purchaseUrl: `https://www.adafruit.com/search?q=${encodeURIComponent(name)}`,
      }));

      const resolvedComponents =
        componentItems.length > 0
          ? componentItems
          : [
              {
                name: "Arduino Uno R3",
                qty: 1,
                purchaseUrl: "https://www.adafruit.com/product/50",
              },
              {
                name: "Breadboard",
                qty: 1,
                purchaseUrl: "https://www.adafruit.com/product/64",
              },
              {
                name: "220 Ohm Resistor",
                qty: 2,
                purchaseUrl: "https://www.adafruit.com/product/2780",
              },
              {
                name: "LED",
                qty: 1,
                purchaseUrl: "https://www.adafruit.com/product/300",
              },
            ];

      const code = `// Auto-generated Arduino code\n// Description: ${description}\n\nconst int LED_PIN = 13;\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH);\n  delay(500);\n  digitalWrite(LED_PIN, LOW);\n  delay(500);\n}`;

      const output = {
        filename: "sketch.ino",
        code,
        components: resolvedComponents,
        diagramTitle: "Circuit Diagram Preview",
        diagramNotes: [
          "Connect component grounds to Arduino GND.",
          "Use 220 Ohm resistor in series with each LED.",
          "Verify pin mapping before uploading firmware.",
        ],
      };

      return widget({
        props: {
          prompt: description,
          ...output,
        },
        output: text(`Generated ${output.filename} with ${output.components.length} components.`),
      });
    }
  );
};
