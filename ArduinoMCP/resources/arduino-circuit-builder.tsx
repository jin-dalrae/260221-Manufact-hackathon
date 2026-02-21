import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { useMemo, useState } from "react";
import { z } from "zod";
import "./styles.css";

/* ── Schemas ── */
const componentSchema = z.object({
  name: z.string(),
  qty: z.number(),
  purchaseUrl: z.string(),
});

const circuitPartSchema = z.object({
  ref: z.string(),
  name: z.string(),
});

const circuitConnectionSchema = z.object({
  partRef: z.string(),
  pin: z.string(),
});

const circuitNetSchema = z.object({
  name: z.string(),
  connections: z.array(circuitConnectionSchema),
});

const propsSchema = z.object({
  prompt: z.string(),
  filename: z.string(),
  code: z.string(),
  diagramTitle: z.string(),
  diagramNotes: z.array(z.string()),
  components: z.array(componentSchema),
  circuitParts: z.array(circuitPartSchema).optional(),
  circuitNets: z.array(circuitNetSchema).optional(),
  powerInfo: z.string().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description:
    "Arduino circuit builder — code editor, schematic preview with real wiring, and component list",
  props: propsSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Preparing circuit builder workspace...",
    invoked: "Circuit builder workspace ready",
  },
};

type Props = z.infer<typeof propsSchema>;
type HighlightToken = {
  text: string;
  kind: "plain" | "keyword" | "number" | "comment" | "preprocessor";
};

/* ── Code highlighting ── */
const keywords = new Set([
  "void", "int", "float", "bool", "byte", "const",
  "if", "else", "for", "while", "return",
  "digitalWrite", "digitalRead", "analogRead", "analogWrite",
  "pinMode", "delay", "HIGH", "LOW", "INPUT", "OUTPUT",
  "setup", "loop",
]);

function highlightLine(line: string): HighlightToken[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return [{ text: line, kind: "comment" }];
  if (trimmed.startsWith("#")) return [{ text: line, kind: "preprocessor" }];
  return line.split(/(\s+|\b)/).map((part) => {
    if (keywords.has(part)) return { text: part, kind: "keyword" };
    if (/^\d+$/.test(part)) return { text: part, kind: "number" };
    return { text: part, kind: "plain" };
  });
}

/* ── Schematic types ── */
type Pt = { x: number; y: number };
type PartType = "mcu" | "resistor" | "led" | "capacitor" | "servo" | "sensor" | "generic";

function getPartType(ref: string, name: string): PartType {
  const r = ref.toUpperCase();
  const n = name.toLowerCase();
  if (r.startsWith("U") || n.includes("arduino") || n.includes("mcu") || n.includes("esp")) return "mcu";
  if (r.startsWith("R") && !n.includes("sensor")) return "resistor";
  if (r.startsWith("D") || n.includes("led") || n.includes("diode")) return "led";
  if (r.startsWith("C") && (n.includes("cap") || /^\d/.test(n.match(/\d/)?.[0] ?? ""))) return "capacitor";
  if (n.includes("servo") || n.includes("motor")) return "servo";
  if (n.includes("sensor") || n.includes("dht") || n.includes("hc-sr") || n.includes("tmp") || n.includes("bme") || n.includes("bmp")) return "sensor";
  return "generic";
}

/* ── Net wire colors ── */
const NET_COLORS: Record<string, string> = {
  VCC: "#ef4444",
  GND: "#16a34a",
};
const SIGNAL_PALETTE = ["#2563eb", "#d97706", "#7c3aed", "#0891b2", "#be185d", "#4f46e5"];

function netColor(name: string, index: number): string {
  const upper = name.toUpperCase();
  if (upper === "VCC" || upper.includes("VCC") || upper === "5V" || upper === "3V3") return NET_COLORS.VCC;
  if (upper === "GND" || upper.includes("GND")) return NET_COLORS.GND;
  return SIGNAL_PALETTE[index % SIGNAL_PALETTE.length];
}

/* ── Layout constants ── */
const MCU_X = 30;
const MCU_W = 130;
const MCU_PIN_GAP = 20;
const MCU_PAD = 16;
const PIN_STUB = 16;

const COMP_X = 390;
const COMP_W = 130;
const COMP_GAP = 72;
const COMP_START_Y = 40;

const BUS_X = 220; // vertical bus area for wire routing

/* ── Determine which MCU pins are used ── */
function getUsedMcuPins(mcuRef: string, nets: Props["circuitNets"]): { left: string[]; right: string[] } {
  const allPins = new Set<string>();
  for (const net of nets ?? []) {
    for (const c of net.connections) {
      if (c.partRef === mcuRef) allPins.add(c.pin);
    }
  }

  const left: string[] = [];
  const right: string[] = [];
  for (const pin of allPins) {
    const p = pin.toUpperCase();
    if (p.startsWith("D") || p.startsWith("~") || /^\d+$/.test(p)) {
      left.push(pin);
    } else {
      right.push(pin);
    }
  }

  // Sort digital pins numerically
  const numSort = (a: string, b: string) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  };
  left.sort(numSort);
  right.sort((a, b) => {
    // Power pins first, then analog
    const order = (s: string) => {
      const u = s.toUpperCase();
      if (u === "5V" || u === "VIN") return 0;
      if (u === "3.3V" || u === "3V3") return 1;
      if (u === "GND") return 2;
      return 3;
    };
    return order(a) - order(b) || numSort(a, b);
  });

  return { left, right };
}

/* ── Schematic Diagram ── */
function SchematicDiagram({
  parts,
  nets,
  powerInfo,
}: {
  parts: NonNullable<Props["circuitParts"]>;
  nets: NonNullable<Props["circuitNets"]>;
  powerInfo?: string;
}) {
  // Separate MCU from other parts
  const mcuPart = parts.find((p) => getPartType(p.ref, p.name) === "mcu");
  const otherParts = parts.filter((p) => p !== mcuPart && !p.name.toLowerCase().includes("breadboard"));

  // Build pin position lookup: "ref:pin" → {x,y}
  const pinPos: Record<string, Pt> = {};

  // MCU layout
  const mcuPins = mcuPart ? getUsedMcuPins(mcuPart.ref, nets) : { left: [], right: [] };
  const mcuPinCount = Math.max(mcuPins.left.length, mcuPins.right.length, 2);
  const mcuH = mcuPinCount * MCU_PIN_GAP + MCU_PAD * 2;
  const mcuY = COMP_START_Y;

  if (mcuPart) {
    mcuPins.left.forEach((pin, i) => {
      const py = mcuY + MCU_PAD + i * MCU_PIN_GAP + MCU_PIN_GAP / 2;
      pinPos[`${mcuPart.ref}:${pin}`] = { x: MCU_X - PIN_STUB, y: py };
    });
    mcuPins.right.forEach((pin, i) => {
      const py = mcuY + MCU_PAD + i * MCU_PIN_GAP + MCU_PIN_GAP / 2;
      pinPos[`${mcuPart.ref}:${pin}`] = { x: MCU_X + MCU_W + PIN_STUB, y: py };
    });
  }

  // Other component layout
  const compPlacements = otherParts.map((part, i) => {
    const type = getPartType(part.ref, part.name);
    const cy = COMP_START_Y + i * COMP_GAP + 30;

    // Get this part's pins from nets
    const usedPins = new Set<string>();
    for (const net of nets) {
      for (const c of net.connections) {
        if (c.partRef === part.ref) usedPins.add(c.pin);
      }
    }
    const pinList = Array.from(usedPins);

    // Split pins: left side and right side
    const leftPins = pinList.filter((_, idx) => idx % 2 === 0);
    const rightPins = pinList.filter((_, idx) => idx % 2 === 1);

    const compH = Math.max(leftPins.length, rightPins.length, 1) * 20 + 16;
    const compY = cy - compH / 2;

    leftPins.forEach((pin, pi) => {
      const py = compY + 12 + pi * 20;
      pinPos[`${part.ref}:${pin}`] = { x: COMP_X - PIN_STUB, y: py };
    });
    rightPins.forEach((pin, pi) => {
      const py = compY + 12 + pi * 20;
      pinPos[`${part.ref}:${pin}`] = { x: COMP_X + COMP_W + PIN_STUB, y: py };
    });

    return { part, type, cy, compY, compH, leftPins, rightPins };
  });

  // SVG dimensions
  const totalH = Math.max(
    mcuY + mcuH + 30,
    COMP_START_Y + otherParts.length * COMP_GAP + 40,
    180,
  );
  const totalW = 560;

  // Count signal nets for color assignment
  let signalIdx = 0;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} role="img" aria-label="Circuit schematic" className="sch-svg">
      {/* Power info badge */}
      {powerInfo && (
        <text x={totalW - 8} y={14} textAnchor="end" className="sch-power-badge">
          {powerInfo}
        </text>
      )}

      {/* ── MCU ── */}
      {mcuPart && (
        <g>
          {/* Body */}
          <rect x={MCU_X} y={mcuY} width={MCU_W} height={mcuH} rx="4" className="sch-mcu-body" />
          {/* Notch */}
          <circle cx={MCU_X + MCU_W / 2} cy={mcuY} r="6" className="sch-mcu-notch" />
          {/* Ref + name */}
          <text x={MCU_X + MCU_W / 2} y={mcuY + MCU_PAD - 2} textAnchor="middle" className="sch-part-ref">
            {mcuPart.ref}
          </text>
          <text x={MCU_X + MCU_W / 2} y={mcuY + mcuH - 6} textAnchor="middle" className="sch-part-name">
            {mcuPart.name}
          </text>
          {/* Left pins */}
          {mcuPins.left.map((pin, i) => {
            const py = mcuY + MCU_PAD + i * MCU_PIN_GAP + MCU_PIN_GAP / 2;
            return (
              <g key={`mcu-l-${pin}`}>
                <line x1={MCU_X - PIN_STUB} y1={py} x2={MCU_X} y2={py} className="sch-pin-stub" />
                <circle cx={MCU_X - PIN_STUB} cy={py} r="2.5" className="sch-pin-dot" />
                <text x={MCU_X + 5} y={py + 3.5} className="sch-pin-label">{pin}</text>
              </g>
            );
          })}
          {/* Right pins */}
          {mcuPins.right.map((pin, i) => {
            const py = mcuY + MCU_PAD + i * MCU_PIN_GAP + MCU_PIN_GAP / 2;
            return (
              <g key={`mcu-r-${pin}`}>
                <line x1={MCU_X + MCU_W} y1={py} x2={MCU_X + MCU_W + PIN_STUB} y2={py} className="sch-pin-stub" />
                <circle cx={MCU_X + MCU_W + PIN_STUB} cy={py} r="2.5" className="sch-pin-dot" />
                <text x={MCU_X + MCU_W - 5} y={py + 3.5} textAnchor="end" className="sch-pin-label">{pin}</text>
              </g>
            );
          })}
        </g>
      )}

      {/* ── Components ── */}
      {compPlacements.map(({ part, type, compY, compH, leftPins, rightPins }) => (
        <g key={part.ref}>
          {/* Component body */}
          {type === "resistor" ? (
            <g>
              <rect x={COMP_X} y={compY} width={COMP_W} height={compH} rx="2" className="sch-resistor-body" />
              {/* Zigzag pattern */}
              {(() => {
                const cy = compY + compH / 2;
                const x0 = COMP_X + 10;
                const x1 = COMP_X + COMP_W - 10;
                const segments = 6;
                const segW = (x1 - x0) / segments;
                const amp = compH * 0.25;
                const pts = [`${x0},${cy}`];
                for (let s = 0; s < segments; s++) {
                  const dir = s % 2 === 0 ? -1 : 1;
                  pts.push(`${x0 + (s + 0.5) * segW},${cy + dir * amp}`);
                }
                pts.push(`${x1},${cy}`);
                return <polyline points={pts.join(" ")} className="sch-zigzag" />;
              })()}
            </g>
          ) : type === "led" ? (
            <g>
              {/* Triangle */}
              {(() => {
                const cy = compY + compH / 2;
                const triW = Math.min(compH - 8, 22);
                const tx = COMP_X + COMP_W / 2 - triW / 2;
                return (
                  <>
                    <rect x={COMP_X} y={compY} width={COMP_W} height={compH} rx="3" className="sch-led-body" />
                    <polygon
                      points={`${tx},${cy - triW / 2} ${tx},${cy + triW / 2} ${tx + triW},${cy}`}
                      className="sch-led-tri"
                    />
                    <line x1={tx + triW} y1={cy - triW / 2} x2={tx + triW} y2={cy + triW / 2} className="sch-led-bar" />
                    {/* Emission arrows */}
                    <line x1={tx + triW + 4} y1={cy - triW / 2 + 2} x2={tx + triW + 10} y2={cy - triW / 2 - 4} className="sch-led-arrow" />
                    <line x1={tx + triW + 8} y1={cy - triW / 2 + 5} x2={tx + triW + 14} y2={cy - triW / 2 - 1} className="sch-led-arrow" />
                  </>
                );
              })()}
            </g>
          ) : type === "servo" ? (
            <g>
              <rect x={COMP_X} y={compY} width={COMP_W} height={compH} rx="3" className="sch-servo-body" />
              {/* Motor symbol: circle with M */}
              <circle cx={COMP_X + COMP_W / 2} cy={compY + compH / 2} r={Math.min(compH * 0.3, 12)} className="sch-motor-circle" />
              <text x={COMP_X + COMP_W / 2} y={compY + compH / 2 + 4} textAnchor="middle" className="sch-motor-m">M</text>
            </g>
          ) : type === "sensor" ? (
            <g>
              <rect x={COMP_X} y={compY} width={COMP_W} height={compH} rx="3" className="sch-sensor-body" />
              {/* Sensor wave icon */}
              {(() => {
                const cy = compY + compH / 2;
                const x0 = COMP_X + 10;
                return (
                  <path
                    d={`M${x0},${cy} Q${x0 + 8},${cy - 6} ${x0 + 16},${cy} Q${x0 + 24},${cy + 6} ${x0 + 32},${cy}`}
                    className="sch-sensor-wave"
                  />
                );
              })()}
            </g>
          ) : (
            <rect x={COMP_X} y={compY} width={COMP_W} height={compH} rx="3" className="sch-generic-body" />
          )}

          {/* Ref designator */}
          <text x={COMP_X + COMP_W / 2} y={compY - 5} textAnchor="middle" className="sch-part-ref">
            {part.ref}
          </text>
          {/* Name (below or inside for tall parts) */}
          <text x={COMP_X + COMP_W / 2} y={compY + compH + 12} textAnchor="middle" className="sch-part-name">
            {part.name}
          </text>

          {/* Left pins */}
          {leftPins.map((pin, pi) => {
            const py = compY + 12 + pi * 20;
            return (
              <g key={`${part.ref}-l-${pin}`}>
                <line x1={COMP_X - PIN_STUB} y1={py} x2={COMP_X} y2={py} className="sch-pin-stub" />
                <circle cx={COMP_X - PIN_STUB} cy={py} r="2.5" className="sch-pin-dot" />
                <text x={COMP_X + 5} y={py + 3.5} className="sch-pin-label">{pin}</text>
              </g>
            );
          })}
          {/* Right pins */}
          {rightPins.map((pin, pi) => {
            const py = compY + 12 + pi * 20;
            return (
              <g key={`${part.ref}-r-${pin}`}>
                <line x1={COMP_X + COMP_W} y1={py} x2={COMP_X + COMP_W + PIN_STUB} y2={py} className="sch-pin-stub" />
                <circle cx={COMP_X + COMP_W + PIN_STUB} cy={py} r="2.5" className="sch-pin-dot" />
                <text x={COMP_X + COMP_W - 5} y={py + 3.5} textAnchor="end" className="sch-pin-label">{pin}</text>
              </g>
            );
          })}
        </g>
      ))}

      {/* ── Net wires ── */}
      {(nets ?? []).map((net, ni) => {
        const positions = net.connections
          .map((c) => ({ ...c, pos: pinPos[`${c.partRef}:${c.pin}`] }))
          .filter((c): c is typeof c & { pos: Pt } => !!c.pos);

        if (positions.length < 2) return null;

        const color = netColor(net.name, signalIdx);
        if (!net.name.toUpperCase().includes("VCC") && !net.name.toUpperCase().includes("GND") && net.name.toUpperCase() !== "5V" && net.name.toUpperCase() !== "3V3") {
          signalIdx++;
        }

        // Route wires: connect each pair through a bus waypoint
        const busXOffset = BUS_X + ni * 12; // stagger bus lines to avoid overlap
        const clampedBusX = Math.min(Math.max(busXOffset, BUS_X), COMP_X - PIN_STUB - 20);

        return (
          <g key={`net-${net.name}`}>
            {positions.map((conn, ci) => {
              if (ci === 0) return null;
              const from = positions[0].pos;
              const to = conn.pos;

              // Simple Manhattan routing through bus area
              const midX = clampedBusX;
              const path = `M${from.x},${from.y} L${midX},${from.y} L${midX},${to.y} L${to.x},${to.y}`;

              return (
                <path
                  key={`wire-${net.name}-${ci}`}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            {/* Junction dots where wires meet */}
            {positions.length > 2 && positions.slice(1).map((_conn, ci) => (
              <circle
                key={`jn-${net.name}-${ci}`}
                cx={clampedBusX}
                cy={positions[0].pos.y}
                r="3"
                fill={color}
              />
            ))}
            {/* Net label */}
            <text
              x={clampedBusX + 2}
              y={positions[0].pos.y - 5}
              fill={color}
              className="sch-net-label"
            >
              {net.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Main widget ── */
export default function ArduinoCircuitBuilderWidget() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const [chatInput, setChatInput] = useState("");

  const highlightedCode = useMemo(
    () => (isPending ? [] : props.code.split("\n").map((line) => highlightLine(line))),
    [isPending, props],
  );

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="acb-root">
          <div className="acb-loading">
            <div className="acb-loading-dot" />
            Generating circuit workspace...
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const onSendMessage = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    sendFollowUpMessage(msg);
    setChatInput("");
  };

  const hasCircuitData = props.circuitParts && props.circuitParts.length > 0 && props.circuitNets;

  return (
    <McpUseProvider autoSize>
      <div className="acb-root">
        {/* Header */}
        <header className="acb-header">
          <div className="acb-header-left">
            <div className="acb-logo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
              </svg>
            </div>
            <div>
              <h1>ArduinoMCP</h1>
              <p>{props.prompt}</p>
            </div>
          </div>
          <span className="acb-badge">{props.filename}</span>
        </header>

        {/* 2-column layout */}
        <div className="acb-layout">
          <div className="acb-col-main">
            {/* Code editor */}
            <div className="acb-code card">
              <div className="acb-code-header">
                <div className="acb-dots">
                  <span className="acb-dot acb-dot--red" />
                  <span className="acb-dot acb-dot--yellow" />
                  <span className="acb-dot acb-dot--green" />
                </div>
                <span className="acb-code-filename">{props.filename}</span>
              </div>
              <pre>
                {highlightedCode.map((tokens, lineIndex) => (
                  <div key={`line-${lineIndex}`} className="acb-code-line">
                    <span className="acb-line-num">{lineIndex + 1}</span>
                    {tokens.map((token, tokenIndex) => (
                      <span key={`t-${lineIndex}-${tokenIndex}`} className={`acb-token-${token.kind}`}>
                        {token.text}
                      </span>
                    ))}
                  </div>
                ))}
              </pre>
            </div>

            {/* Schematic diagram */}
            <div className="acb-diagram card">
              <div className="acb-diagram-header">
                <h3>{props.diagramTitle}</h3>
                <div className="acb-legend">
                  <span className="acb-legend-vcc">VCC</span>
                  <span className="acb-legend-gnd">GND</span>
                  <span className="acb-legend-sig">Signal</span>
                </div>
              </div>
              {hasCircuitData ? (
                <SchematicDiagram
                  parts={props.circuitParts!}
                  nets={props.circuitNets!}
                  powerInfo={props.powerInfo}
                />
              ) : (
                <div className="acb-diagram-empty">No circuit data available</div>
              )}
              <div className="acb-notes">
                {props.diagramNotes.map((note) => (
                  <span key={note} className="acb-note-tag">{note}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="acb-sidebar">
            <h3>Components <span className="acb-count">{props.components.length}</span></h3>
            <ul>
              {props.components.map((c) => (
                <li key={`${c.name}-${c.purchaseUrl}`}>
                  <div className="acb-comp-info">
                    <strong>{c.name}</strong>
                    <span className="acb-qty">x{c.qty}</span>
                  </div>
                  <a href={c.purchaseUrl} target="_blank" rel="noreferrer">Buy</a>
                </li>
              ))}
            </ul>

            <div className="acb-chat">
              <h3>Follow-up</h3>
              <div className="acb-chat-controls">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
                  placeholder="Ask about this circuit..."
                  rows={2}
                />
                <button type="button" onClick={onSendMessage}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </McpUseProvider>
  );
}
