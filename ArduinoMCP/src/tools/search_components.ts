import { MCPServer, object } from "mcp-use/server";
import { z } from "zod";

export const registerSearchComponents = (server: MCPServer) => {
    server.tool(
        {
            name: "search_components",
            description: "Search for electronic components, sensors, and actuators for Arduino projects.",
            schema: z.object({
                query: z.string().optional().describe("Search term (e.g., 'sensor', 'led', 'uno')"),
                filters: z.object({
                    category: z.enum(["all", "sensor", "actuator", "microcontroller", "power", "discrete", "communication"]).default("all"),
                    max_price_usd: z.number().optional().describe("Maximum unit price in USD"),
                    availability: z.enum(["any", "in_stock", "backorder"]).default("any"),
                }).default({ category: "all", availability: "any" }),
            }),
            annotations: {
                readOnlyHint: true,
                openWorldHint: true,
            },
        },
        async ({ query, filters }) => {
            const resolvedQuery = (query ?? "").trim().toLowerCase();

            const items = [
                // Microcontrollers
                {
                    name: "Arduino Uno R3",
                    category: "microcontroller",
                    datasheet_url: "https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf",
                    buy_links: { adafruit: "https://www.adafruit.com/product/50", digikey: "https://www.digikey.com/en/products/detail/arduino/A000066/2784006" },
                    price_usd: 27.60,
                    availability: "in_stock",
                    description: "The classic Arduino board, perfect for beginners and projects.",
                },
                {
                    name: "Arduino Nano Every",
                    category: "microcontroller",
                    datasheet_url: "https://docs.arduino.cc/resources/datasheets/ABX00028-datasheet.pdf",
                    buy_links: { arduino: "https://store.arduino.cc/products/arduino-nano-every" },
                    price_usd: 12.50,
                    availability: "in_stock",
                    description: "Compact version of the Uno Every, fits on a breadboard.",
                },
                // Sensors
                {
                    name: "HC-SR04 Ultrasonic Sensor",
                    category: "sensor",
                    datasheet_url: "https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf",
                    buy_links: { adafruit: "https://www.adafruit.com/product/3942", mouser: "https://www.mouser.com/c/?q=HC-SR04" },
                    price_usd: 3.95,
                    availability: "in_stock",
                    description: "Distance measurement sensor using ultrasonic waves.",
                },
                {
                    name: "DHT11 Temperature & Humidity Sensor",
                    category: "sensor",
                    datasheet_url: "https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf",
                    buy_links: { adafruit: "https://www.adafruit.com/product/386" },
                    price_usd: 5.00,
                    availability: "in_stock",
                    description: "Basic, low-cost digital temperature and humidity sensor.",
                },
                {
                    name: "TMP36 Temperature Sensor",
                    category: "sensor",
                    datasheet_url: "https://www.analog.com/media/en/technical-documentation/data-sheets/TMP35_36_37.pdf",
                    buy_links: { adafruit: "https://www.adafruit.com/product/165" },
                    price_usd: 1.50,
                    availability: "in_stock",
                    description: "Analog temperature sensor, easy to use with Arduino.",
                },
                // Actuators
                {
                    name: "SG90 Micro Servo",
                    category: "actuator",
                    datasheet_url: "http://www.ee.ic.ac.uk/pjs99/projects/servo/SG90%20Datasheet.pdf",
                    buy_links: { adafruit: "https://www.adafruit.com/product/169" },
                    price_usd: 5.95,
                    availability: "in_stock",
                    description: "Lightweight, high-quality micro servo for small robotics.",
                },
                {
                    name: "NEMA 17 Stepper Motor",
                    category: "actuator",
                    datasheet_url: "https://www.mouser.com/datasheet/2/310/NEMA17-1033.pdf",
                    buy_links: { adafruit: "https://www.adafruit.com/product/324" },
                    price_usd: 14.00,
                    availability: "in_stock",
                    description: "Precision motor for 3D printers and CNC machines.",
                },
                // Power
                {
                    name: "LM7805 Voltage Regulator",
                    category: "power",
                    datasheet_url: "https://www.ti.com/lit/ds/symlink/lm340.pdf",
                    buy_links: { mouser: "https://www.mouser.com/c/?q=LM7805", digikey: "https://www.digikey.com/en/products/result?s=LM7805" },
                    price_usd: 0.62,
                    availability: "in_stock",
                    description: "Standard 5V linear voltage regulator.",
                },
                // Communication
                {
                    name: "ESP8266 Wi-Fi Module (NodeMCU)",
                    category: "communication",
                    datasheet_url: "https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf",
                    buy_links: { adafruit: "https://www.adafruit.com/product/2471" },
                    price_usd: 8.95,
                    availability: "in_stock",
                    description: "Cheap and powerful Wi-Fi module with full TCP/IP stack.",
                },
                {
                    name: "HC-05 Bluetooth Module",
                    category: "communication",
                    datasheet_url: "https://www.itead.cc/wiki/images/1/15/HC-05_Serial_Port_Bluetooth_Module_at_Command_set_201104.pdf",
                    buy_links: { amazon: "https://www.amazon.com/HC-05-Bluetooth-Pass-through-Wireless-Communication/dp/B01G9K64ZO" },
                    price_usd: 8.00,
                    availability: "in_stock",
                    description: "Easy to use Bluetooth Serial Port Protocol (SPP) module.",
                },
            ];

            const filtered = items.filter((item) => {
                const matchesQuery = resolvedQuery.length === 0 ||
                    item.name.toLowerCase().includes(resolvedQuery) ||
                    item.category.toLowerCase().includes(resolvedQuery) ||
                    item.description.toLowerCase().includes(resolvedQuery);

                const matchesCategory = filters.category === "all" || item.category === filters.category;

                const withinPrice = !filters.max_price_usd || item.price_usd <= filters.max_price_usd;

                const matchesAvailability = filters.availability === "any" || item.availability === filters.availability;

                return matchesQuery && matchesCategory && withinPrice && matchesAvailability;
            });

            return object({
                query: resolvedQuery,
                filters,
                results: filtered,
                total_count: filtered.length,
            });
        }
    );
};

