# ArduinoMCP: The Future of Hardware Prototyping 🚀

> **ArduinoMCP is the world’s first AI co-pilot for the physical world.** We bridge the gap between imagination and hardware reality, removing the friction from Arduino development through the power of MCP (Model Context Protocol).

**Current status:** Functional MCP prototype with schema-driven workflow and mock integrations.

---

## ⚡️ The Problem
Hardware development is currently stuck in the 2000s. Developers spend **70% of their time** searching for datasheets, debugging missing resistors, and fighting boilerplate code instead of building.

**Prototyping is slow, error-prone, and documentation is scattered.**

## 💎 The Solution: ArduinoMCP
ArduinoMCP brings **Generative AI to the Breadboard**. We automate the hardware workflow from text intent to validated circuit, starter firmware, and parts planning.

### 🎥 [Watch the Interactive Demo](https://youtu.be/VosECASvMn8?si=4FU11WRWDv3NUELm)
*(Run locally inside an MCP client like ChatGPT to see our custom React widget in action)*

---

## 🛠 Product Showcase (Prototype Implemented)

### 1. **AI Circuit Builder (Dynamic UI)**
Our signature **`arduino-circuit-builder`** widget is a compact workspace for ChatGPT interactions.
- **Generative Firmware**: Starter `.ino` scaffolds based on requirements and normalized circuit schema.
- **Visual Schematics**: Dynamic SVG circuit previews.
- **Automated BOM View**: Parts list with purchase links.

### 2. **Intelligent Component Discovery**
- **Metadata-Rich Search (Mock Data)**: Query/filter flow (price, stock) with structured component outputs.
- **Datasheet Lookup (Mock Data)**: Datasheet links and key electrical specs in normalized format.

### 3. **Synthesis & Validation**
- **Natural Language Synthesis**: Requests become normalized `CircuitSchema` (parts, nets, pin map, constraints).
- **Safety Auditing (Rule-based Prototype)**: Missing resistor, floating net, voltage mismatch, short-risk checks.

---

## 🧭 Current Code Scope (Active Tools)
Registered in `ArduinoMCP/src/index.ts`:

1. `generate_circuit`
2. `validate_circuit`
3. `write_arduino_code` (workspace UI entrypoint)
4. `search_components`
5. `get_datasheet`
6. `order_parts`

Deferred (present in codebase, not registered):
- `search_emails`, `generate_3d_case`, `analyze_photo`, `suggest_improvements`, `export_project`

---

## 🗺 Concept Map

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

## 🔄 Process Map

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

---

## 🧱 Data Model Core
Primary shared model: `CircuitSchema` in `ArduinoMCP/src/tools/circuit_schema.ts`.

```text
CircuitSchema
- power: input_voltage_v, logic_voltage_v, max_current_ma
- parts[]: ref, name, mpn, quantity, limits
- nets[]: net name + pin connections
- pin_map: signal -> board pin ref
- constraints[]
```

---

## 📈 Roadmap: Scaling to the Physical Edge

- [x] **Phase 1: Foundation (Hackathon)** – Core toolset, modular engine, shared data model (`CircuitSchema`), and React widget.
- [ ] **Phase 2: Live Supply APIs** – Direct API integration with DigiKey, Mouser, and Farnell for real-time stock and checkout.
- [ ] **Phase 3: True 3D Artifact Pipeline** – Upgrade from OpenSCAD/STL references to generated downloadable artifacts.
- [ ] **Phase 4: Compile/Upload Validation** – Add board/FQBN-aware compile checks and upload instruction validation.
- [ ] **Phase 5: Project Packaging** – Produce downloadable ZIP bundles including sketch + schema + BOM + enclosure assets.

---

## 🏗 Built on Modern Infrastructure
- **Engine**: [mcp-use](https://github.com/mcp-use/mcp-use)
- **Frontend**: React 19 + Tailwind CSS 4
- **Validation**: Zod (schema-based tool input/output)
- **Deployment**: Manufact Cloud / Vercel

---

## 🚀 Getting Started

```bash
cd ArduinoMCP
npm install
npm run dev
```

Open:
- `http://localhost:3000/inspector`

---

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

---

<p align="center"><strong>ArduinoMCP: Build hardware at the speed of thought.</strong></p>
