# ArduinoMCP (MVP)

This folder contains the active MCP server.

## Active Registered Tools
- `generate_circuit`
- `validate_circuit`
- `write_arduino_code`
- `search_components`
- `get_datasheet`
- `order_parts`

## Process (MVP)
```text
Intent -> generate_circuit -> validate_circuit -> write_arduino_code(UI)
                                       \-> search_components/get_datasheet -> order_parts
```

## Notes
- The UI is returned by `write_arduino_code` (`arduino-circuit-builder` widget).
- ChatGPT thread is the main chat interface.

## Dev
```bash
npm install
npm run dev
```

Inspector:
- `http://localhost:3000/inspector`

## Quick Demo Script (ChatGPT)

1. Generate circuit
```text
Create an Arduino circuit for a temperature warning light. Use 5V, include safety constraints, and return the circuit schema.
```

2. Validate safety
```text
Validate this circuit and list any blocking issues first, then warnings.
```

3. Generate code + open workspace UI
```text
Write Arduino code for this circuit schema and include any required libraries.
```

4. Find purchasable parts
```text
Search components for the required sensor and LED parts with in-stock preference and low price.
```

5. Check datasheet for one critical component
```text
Get datasheet details for LM7805 and summarize voltage, current, and pinout.
```

6. Build order links
```text
Create an order plan from this BOM using either vendor and estimate total cost.
```
