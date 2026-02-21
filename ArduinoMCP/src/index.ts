import { MCPServer } from "mcp-use/server";
import { registerGenerateCircuit } from "./tools/generate_circuit.js";
import { registerGetDatasheet } from "./tools/get_datasheet.js";
import { registerOrderParts } from "./tools/order_parts.js";
import { registerSearchComponents } from "./tools/search_components.js";
import { registerValidateCircuit } from "./tools/validate_circuit.js";
import { registerWriteArduinoCode } from "./tools/write_arduino_code.js";

const server = new MCPServer({
  name: "ArduinoMCP",
  title: "ArduinoMCP",
  version: "1.0.0",
  description: "MCP server for Arduino circuit design, firmware generation, and parts planning",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

// Lean MVP toolchain: idea -> circuit -> validate -> code(UI) -> parts
registerGenerateCircuit(server);
registerValidateCircuit(server);
registerWriteArduinoCode(server);
registerSearchComponents(server);
registerGetDatasheet(server);
registerOrderParts(server);

server.listen().then(() => {
  console.log("ArduinoMCP server running (MVP toolset)");
});
