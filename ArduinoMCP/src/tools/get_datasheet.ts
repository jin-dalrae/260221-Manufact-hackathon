import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";

const schema = z.object({
  component_name: z
    .string()
    .optional()
    .describe("Human-friendly component name"),
  part_number: z
    .string()
    .optional()
    .describe("Manufacturer part number"),
});

export const registerGetDatasheet = (server: MCPServer) => {
  server.tool(
    {
      name: "get_datasheet",
      description:
        "Get a component datasheet link and summarize key electrical specs.",
      schema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ component_name, part_number }) => {
      const query = (component_name ?? part_number ?? "").toLowerCase();

      const datasheets: Record<string, any> = {
        "arduino uno": {
          pdf_link: "https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf",
          specs: { voltage: "7-12V Recommended", current: "50mA per I/O pin", architecture: "AVR ATmega328P" }
        },
        "lm7805": {
          pdf_link: "https://www.ti.com/lit/ds/symlink/lm340.pdf",
          specs: { voltage: "Input up to 35V, output 5V", current: "1.5A", pinout: "In, Gnd, Out" }
        },
        "hc-sr04": {
          pdf_link: "https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf",
          specs: { voltage: "5V DC", current: "15mA", range: "2cm to 400cm" }
        },
        "dht11": {
          pdf_link: "https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf",
          specs: { voltage: "3-5V", humidity: "20-90%", temperature: "0-50°C" }
        },
        "sg90": {
          pdf_link: "http://www.ee.ic.ac.uk/pjs99/projects/servo/SG90%20Datasheet.pdf",
          specs: { voltage: "4.8V", speed: "0.1s/60°", torque: "1.8kg/cm" }
        }
      };

      const key = Object.keys(datasheets).find(k => query.includes(k));
      const entry = key ? datasheets[key] : {
        pdf_link: `https://www.google.com/search?q=${encodeURIComponent(query + " datasheet pdf")}`,
        specs: { note: "Generic search result generated. No exact match found in local DB." }
      };

      return object({
        component: component_name ?? part_number ?? "Generic Search",
        pdf_link: entry.pdf_link,
        key_specs_summary: entry.specs,
      });
    }
  );
};
