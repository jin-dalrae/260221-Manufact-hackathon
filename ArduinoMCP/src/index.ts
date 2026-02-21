import { MCPServer } from "mcp-use/server";
import { registerAnalyzePhoto } from "./tools/analyze_photo.js";
import { registerExportProject } from "./tools/export_project.js";
import { registerGenerate3DCase } from "./tools/generate_3d_case.js";
import { registerGenerateCircuit } from "./tools/generate_circuit.js";
import { registerGetDatasheet } from "./tools/get_datasheet.js";
import { registerOrderParts } from "./tools/order_parts.js";
import { registerSearchComponents } from "./tools/search_components.js";
import { registerSearchEmails } from "./tools/search_emails.js";
import { registerSuggestImprovements } from "./tools/suggest_improvements.js";
import { registerValidateCircuit } from "./tools/validate_circuit.js";
import { registerWriteArduinoCode } from "./tools/write_arduino_code.js";

const server = new MCPServer({
  name: "ArduinoMCP",
  title: "Antigravity Arduino MCP",
  version: "1.0.0",
  description: "MCP server for Arduino circuit design, firmware generation, and build workflow automation",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

registerGenerateCircuit(server);
registerWriteArduinoCode(server);
registerValidateCircuit(server);
registerSearchComponents(server);
registerGetDatasheet(server);
registerGenerate3DCase(server);
registerOrderParts(server);
registerExportProject(server);
registerSearchEmails(server);
registerAnalyzePhoto(server);
registerSuggestImprovements(server);

server.listen().then(() => {
  console.log("Antigravity Arduino MCP server running");
});
