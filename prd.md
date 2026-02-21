# Product Requirements Document (PRD): ArduinoMCP

## 1. Vision & Purpose
ArduinoMCP is an AI-powered co-pilot for Arduino development. It bridges the gap between high-level project ideas and the final physical prototype by automating circuit design, firmware generation, and hardware selection within the MCP (Model Context Protocol) ecosystem.

---

## 2. Target Audience
- **Hardware Hackers & Makers**: Quickly prototype ideas without memorizing pinouts or boilerplate code.
- **STEM Educators**: Assist students in debugging circuits and understanding components through interactive visuals.
- **Product Designers**: Rapidly validate electronic feasibility and generate 3D case enclosures for components.

---

## 3. Core Product Features (Implemented)

### 3.1. Interactive Circuit Workspace (`write_arduino_code`)
- **Firmware Generation**: Generates production-ready `.ino` code based on requirements.
- **Visual Builder Widget**: A custom React-based UI (`arduino-circuit-builder`) that displays:
    - Side-by-side code editor with syntax highlighting.
    - Dynamic SVG circuit preview.
    - Component BOM (Bill of Materials) with direct purchase links.
    - Step-by-step wiring and safety instructions.

### 3.2. Intelligent Component Discovery (`search_components` & `get_datasheet`)
- **Metadata-Rich Search**: Filter by category (Sensor, Actuator, MCU), price, and stock status.
- **Direct Datasheet Access**: Instant retrieval of manufacturer PDFs and key electrical specs (Voltage, Current, Pinouts) for common parts.

### 3.3. Synthesis & Validation (`generate_circuit` & `validate_circuit`)
- **Natural Language Synthesis**: Translates requests like "I need to measure soil moisture and rotate a motor" into a structured schematic JSON.
- **Safety Auditing**: Checks for missing resistors, common ground issues, and voltage mismatches.

### 3.4. Vision-Assisted Analysis (`analyze_photo`)
- **Visual Intelligence**: Analyzes photos of physical breadboards to infer current configurations and generate matching digital schemas.

---

## 4. Technical Stack
- **Framework**: [mcp-use](https://github.com/mcp-use/mcp-use) (High-performance HMR-enabled server)
- **Language**: TypeScript / Node.js
- **UI Architecture**: React 19 + Tailwind CSS 4
- **Safety & Validation**: Zod (Schema-based tool inputs/outputs)

---

## 5. Roadmap & Future Scope
- **Real-time API Integration**: Connect `search_components` to live DigiKey/Mouser APIs.
- **3D Case Export**: Functional implementation of `generate_3d_case` to output STL/STEP files for 3D printing.
- **Project Export**: ZIP export for the entire Arduino IDE project folder (`export_project`).
- **Improved Vision**: Move from keyword-based simulated analysis to actual Gemini Pro Vision parsing.

---

## 6. Design Principles
- **Aesthetics First**: Every tool response should feel premium, using clean layout patterns and vibrant UI tokens.
- **Proactive Safety**: Never output code or circuits without essential safety components (like current-limiting resistors) and grounding advice.
