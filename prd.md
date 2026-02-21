# Product Requirements Document (PRD): Antigravity Arduino MCP

## Current Stage
Lean MVP focused on one reliable flow inside ChatGPT.

---

## 1. Product Goal
Help users go from idea to a safe, buildable Arduino prototype quickly.

---

## 2. MVP Scope (Active)

### Core Flow
1. `generate_circuit`
2. `validate_circuit`
3. `write_arduino_code` (includes workspace UI)
4. `search_components`
5. `get_datasheet`
6. `order_parts`

### Outcome
- Structured circuit schema
- Basic safety validation
- Generated `.ino` starter firmware
- Logical visual circuit workspace
- Component lookup + datasheet references
- Parts ordering guidance

---

## 3. UX Decision
- ChatGPT thread is the primary chat interface.
- No separate full chat inside widget.
- Widget focuses on workspace: code, logical diagram, components.

---

## 4. Deferred (Not in MVP Demo Path)
- `search_emails`
- `generate_3d_case`
- `analyze_photo`
- `suggest_improvements`
- `export_project`

These are kept for later phases, not required for current demo success.

---

## 5. Success Criteria (Hackathon)
- End-to-end run completes without manual patching.
- Validation catches obvious electrical mistakes.
- User can see code + circuit + BOM in one place.
- Tool outputs remain schema-consistent across steps.
