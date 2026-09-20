import { readFile } from "node:fs/promises";

const MCP_ENDPOINT = "https://mcp.flashkarte.christopherrehm.de/mcp";
const SUBJECT_PATH = "/tmp/ai-literacy-subject.json";
const apiKey = process.env.FLASHKARTE_API_KEY;
const GERMAN_CONCEPT_NAMES = {
  "ai-map": "KI-Landschaft",
  "rule-based-program": "Regelbasiertes Programm",
  "machine-learning": "Maschinelles Lernen",
  "generative-ai": "Generative KI",
  "training-data": "Trainingsdaten",
  "feature-and-label": "Merkmal und Label",
  "supervised-learning": "Überwachtes Lernen",
  "model-prediction": "Modellvorhersage",
  "training-and-inference": "Training und Inferenz",
  "evaluation-data": "Evaluierungsdaten",
  generalization: "Generalisierung",
  overfitting: "Überanpassung",
  "data-bias": "Datenverzerrung",
  "neural-network": "Neuronales Netzwerk",
  parameter: "Modellparameter",
  layer: "Schicht eines neuronalen Netzes",
  loss: "Fehlermaß",
  "gradient-based-training": "Gradientenbasiertes Training",
  token: "Token",
  "next-token-prediction": "Nächstes-Token-Vorhersage",
  transformer: "Transformer",
  "context-window": "Kontextfenster",
  "prompt-context": "Prompt-Kontext",
  hallucination: "Halluzination",
  verification: "Überprüfung von Ausgaben",
  "sensitive-information": "Urteil über sensible Informationen",
  "task-fit": "Passung einer KI-Aufgabe",
  "responsible-use": "Verantwortungsvoller KI-Einsatz",
};

if (!apiKey) throw new Error("FLASHKARTE_API_KEY is required");

let sessionId;
let requestId = 1;

async function callMcp(method, params) {
  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: requestId++, method, params }),
  });
  if (!response.ok)
    throw new Error(
      `${method} failed: ${response.status} ${await response.text()}`,
    );
  sessionId = response.headers.get("mcp-session-id") ?? sessionId;
  const body = await response.text();
  return JSON.parse(body.match(/data: (.+)/)?.[1] ?? body);
}

const subject = JSON.parse(await readFile(SUBJECT_PATH, "utf8"));
if (process.env.LANGUAGE === "de") {
  subject.title = "KI-Grundlagen: Vom Musterlernen zu Sprachmodellen";
  subject.description =
    "Ein programmierfreier Kurs für neugierige Erwachsene. Er erklärt, was KI-Systeme sind, wie maschinelles Lernen und neuronale Netze Muster lernen, wie große Sprachmodelle Text erzeugen und wie KI mit gutem Urteilsvermögen genutzt wird.";
  subject.concepts = subject.concepts.map((concept) => ({
    ...concept,
    name: GERMAN_CONCEPT_NAMES[concept.slug],
  }));
}
await callMcp("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "flashkarte-course-author", version: "1.0" },
});
const reply = await callMcp("tools/call", {
  name: process.env.LINT_SUBJECT === "1" ? "lint_subject" : "import_subject",
  arguments:
    process.env.LINT_SUBJECT === "1"
      ? { subject_id: process.env.SUBJECT_ID }
      : subject,
});
if (reply.error || reply.result?.isError)
  throw new Error(JSON.stringify(reply));
console.log(
  reply.result.content.find((content) => content.type === "text")?.text ?? "{}",
);
