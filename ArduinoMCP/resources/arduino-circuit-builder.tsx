import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { useMemo, useState } from "react";
import { z } from "zod";
import "./styles.css";

const componentSchema = z.object({
  name: z.string(),
  qty: z.number(),
  purchaseUrl: z.string(),
});

const propsSchema = z.object({
  prompt: z.string(),
  filename: z.string(),
  code: z.string(),
  diagramTitle: z.string(),
  diagramNotes: z.array(z.string()),
  components: z.array(componentSchema),
});

export const widgetMetadata: WidgetMetadata = {
  description:
    "Arduino circuit builder assistant with chat, code editor, components, and circuit preview",
  props: propsSchema,
  exposeAsTool: false,
  metadata: {
    invoking: "Preparing circuit builder workspace...",
    invoked: "Circuit builder workspace ready",
  },
};

type Props = z.infer<typeof propsSchema>;
type HighlightToken = { text: string; kind: "plain" | "keyword" | "number" | "comment" | "preprocessor" };

const keywords = new Set([
  "void",
  "int",
  "float",
  "bool",
  "byte",
  "const",
  "if",
  "else",
  "for",
  "while",
  "return",
  "digitalWrite",
  "digitalRead",
  "analogRead",
  "analogWrite",
  "pinMode",
  "delay",
  "HIGH",
  "LOW",
  "INPUT",
  "OUTPUT",
  "setup",
  "loop",
]);

function highlightLine(line: string): HighlightToken[] {
  const trimmed = line.trimStart();

  if (trimmed.startsWith("//")) {
    return [{ text: line, kind: "comment" }];
  }

  if (trimmed.startsWith("#")) {
    return [{ text: line, kind: "preprocessor" }];
  }

  const parts = line.split(/(\s+|\b)/);

  return parts.map((part) => {
    if (keywords.has(part)) {
      return { text: part, kind: "keyword" };
    }

    if (/^\d+$/.test(part)) {
      return { text: part, kind: "number" };
    }

    return { text: part, kind: "plain" };
  });
}

export default function ArduinoCircuitBuilderWidget() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const [chatInput, setChatInput] = useState("");

  const highlightedCode = useMemo(
    () => (isPending ? [] : props.code.split("\n").map((line) => highlightLine(line))),
    [isPending, props]
  );

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="acb-root">
          <div className="acb-loading">Loading Arduino circuit builder...</div>
        </div>
      </McpUseProvider>
    );
  }

  const onSendMessage = () => {
    const message = chatInput.trim();

    if (!message) {
      return;
    }

    sendFollowUpMessage(message);
    setChatInput("");
  };

  return (
    <McpUseProvider autoSize>
      <div className="acb-root">
        <header className="acb-header">
          <div>
            <h1>Arduino Circuit Builder Assistant</h1>
            <p>Build circuits in natural language and review generated code and parts.</p>
          </div>
          <span className="acb-badge">{props.filename}</span>
        </header>

        <div className="acb-layout">
          <aside className="acb-sidebar">
            <h2>Components</h2>
            <ul>
              {props.components.map((component) => (
                <li key={`${component.name}-${component.purchaseUrl}`}>
                  <div>
                    <strong>{component.name}</strong>
                    <span>Qty {component.qty}</span>
                  </div>
                  <a href={component.purchaseUrl} target="_blank" rel="noreferrer">
                    Purchase
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <section className="acb-main">
            <div className="acb-chat card">
              <h2>Chat</h2>
              <p className="acb-muted">Latest request: {props.prompt}</p>
              <div className="acb-chat-controls">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Describe your Arduino circuit goals..."
                  rows={4}
                />
                <button type="button" onClick={onSendMessage}>
                  Send
                </button>
              </div>
            </div>

            <div className="acb-code card">
              <h2>.ino Code</h2>
              <pre>
                {highlightedCode.map((tokens, lineIndex) => (
                  <div key={`line-${lineIndex}`}>
                    {tokens.map((token, tokenIndex) => (
                      <span key={`token-${lineIndex}-${tokenIndex}`} className={`acb-token-${token.kind}`}>
                        {token.text}
                      </span>
                    ))}
                  </div>
                ))}
              </pre>
            </div>
          </section>

          <section className="acb-preview card">
            <h2>{props.diagramTitle}</h2>
            <svg viewBox="0 0 520 240" role="img" aria-label="Circuit diagram preview">
              <rect x="20" y="85" width="150" height="80" rx="8" className="acb-diagram-board" />
              <text x="95" y="132" textAnchor="middle" className="acb-diagram-label">
                Arduino Uno
              </text>

              {props.components.slice(0, 3).map((component, index) => {
                const y = 40 + index * 70;
                return (
                  <g key={`diagram-${component.name}`}>
                    <rect x="350" y={y} width="145" height="48" rx="8" className="acb-diagram-part" />
                    <text x="422" y={y + 29} textAnchor="middle" className="acb-diagram-label">
                      {component.name}
                    </text>
                    <line x1="170" y1="125" x2="350" y2={y + 24} className="acb-diagram-wire" />
                  </g>
                );
              })}
            </svg>
            <ul>
              {props.diagramNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </McpUseProvider>
  );
}
