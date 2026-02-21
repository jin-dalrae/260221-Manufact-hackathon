# Antigravity Arduino MCP

Lean MCP app for Arduino prototyping in ChatGPT.

## Current Code Scope (Active Tools)
Registered in `ArduinoMCP/src/index.ts`:

1. `generate_circuit`
2. `validate_circuit`
3. `write_arduino_code` (workspace UI entrypoint)
4. `search_components`
5. `get_datasheet`
6. `order_parts`

Deferred (present in codebase, not registered):
- `search_emails`, `generate_3d_case`, `analyze_photo`, `suggest_improvements`, `export_project`

## Concept Map

```text
User Intent (ChatGPT)
        |
        v
+--------------------+      +--------------------+
| generate_circuit   |----->|   CircuitSchema    |
+--------------------+      | parts/nets/pin_map |
        |                   | power/constraints   |
        v                   +--------------------+
+--------------------+                 |
| validate_circuit   |<----------------+
+--------------------+                 |
        | pass/warn                    |
        v                              v
+--------------------+      +--------------------+
| write_arduino_code |----->| arduino-circuit-   |
| (code + widget)    |      | builder widget UI  |
+--------------------+      +--------------------+
        |
        +--------------------------+
        |                          |
        v                          v
+--------------------+    +--------------------+
| search_components  |    | get_datasheet      |
+--------------------+    +--------------------+
        \                     /
         \                   /
          v                 v
             +--------------------+
             |   order_parts      |
             +--------------------+
```

## Process Map

### A) Main Build Flow
```text
1) User describes project in ChatGPT
2) generate_circuit -> normalized CircuitSchema
3) validate_circuit -> warnings + pass/fail
4) write_arduino_code -> .ino + MCP workspace UI
5) User iterates in chat with updated requirements
```

### B) Parts Decision Flow
```text
CircuitSchema.parts
   -> search_components (candidates, availability, links)
   -> get_datasheet (voltage/current/pinout checks)
   -> order_parts (cart links + estimated total)
```

### C) UI Interaction Flow
```text
ChatGPT message -> tool call write_arduino_code
               -> widget render (code + logical diagram + component list)
               -> user continues conversation in ChatGPT (not inside widget)
```

## Tool Roles (Current)
- `generate_circuit`: Builds normalized schema from intent.
- `validate_circuit`: Checks obvious electrical/design risks.
- `write_arduino_code`: Generates starter firmware and returns workspace UI.
- `search_components`: Filters candidate parts (prototype data shape).
- `get_datasheet`: Returns datasheet URL + key specs summary.
- `order_parts`: Produces vendor links + rough cost estimate from BOM/schema.

## Data Model Core
Primary shared model: `CircuitSchema` in `ArduinoMCP/src/tools/circuit_schema.ts`.

```text
CircuitSchema
- power: input_voltage_v, logic_voltage_v, max_current_ma
- parts[]: ref, name, mpn, quantity, limits
- nets[]: net name + pin connections
- pin_map: signal -> board pin ref
- constraints[]
```

## Run

```bash
cd ArduinoMCP
npm install
npm run dev
```

Open:
- `http://localhost:3000/inspector`

## Quick Demo Script (ChatGPT)

Use these prompts in order for a clean MVP demo:

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
