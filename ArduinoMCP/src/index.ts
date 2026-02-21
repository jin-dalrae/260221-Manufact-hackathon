import { MCPServer } from "mcp-use/server";
import { registerGenerateCircuit } from "./tools/generate_circuit.js";
import { registerWriteArduinoCode } from "./tools/write_arduino_code.js";
import { registerSearchComponents } from "./tools/search_components.js";
import { registerValidateCircuit } from "./tools/validate_circuit.js";

const server = new MCPServer({
    name: "ArduinoMCP",
    title: "Arduino MCP Server",
    version: "1.0.0",
    description: "MCP server for Arduino circuit design and code generation",
    baseUrl: process.env.MCP_URL || "http://localhost:3000",
});

// Register tools
registerGenerateCircuit(server);
registerWriteArduinoCode(server);
registerSearchComponents(server);
registerValidateCircuit(server);

server.listen().then(() => {
    console.log(`ArduinoMCP Server running`);
});
