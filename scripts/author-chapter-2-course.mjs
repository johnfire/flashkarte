/*
 * Imports the reviewed Chapter 2 lesson drafts through the Flashkarte MCP
 * endpoint. Run with FLASHKARTE_API_KEY set; the key is never stored here.
 */

const subjectId = "b6cd1a8e-c196-4155-930a-f3812178d907";
const endpoint = "https://mcp.flashkarte.christopherrehm.de/mcp";
const source = { title: "The Art of Electronics, 3rd ed. (2015), Chapter 2: Bipolar Transistors" };
const module = "Bipolar Transistors: control, amplification, and output";

const option = (correct, blocks, reason) => ({ correct, blocks, reason });
const question = (prompt, teaches, covers, answer, distractors, variant) => ({
  prompt,
  teaches,
  covers,
  options: [
    option(true, answer, "This follows the model developed on the named screens."),
    ...distractors.map((text) => option(false, text, "This swaps or omits a part of the model taught here.")),
  ],
  variants: [{
    prompt: variant,
    options: [
      option(true, answer, "It tests the same idea with different wording."),
      ...distractors.map((text) => option(false, text, "It does not match the model taught here.")),
    ],
  }],
});

const lesson = (slug, title, summary, covers, prerequisites, screenText, questions) => ({
  module,
  lesson: { slug, title, summary, covers, prerequisites },
  screens: screenText.map(([ref, blocks]) => ({ ref, blocks, sources: [source] })),
  questions,
});

const lessons = [
  lesson(
    "bjt-map-and-terminals",
    "The BJT: terminals and current control",
    "Name a bipolar transistor's terminals and use the simple current-control picture.",
    ["transistor-family-map", "bjt-terminals", "bjt-current-gain"],
    [],
    [
      ["map", ["A **transistor** is a three-terminal device used to control current. This module begins with the bipolar junction transistor, or **BJT**.", "The later FET module introduces another transistor family. The two are not interchangeable labels."]],
      ["terminals", ["A BJT has a **base**, **collector**, and **emitter**. The names matter because each terminal has a different job in a circuit.", "A small change at the base controls the much larger collector-to-emitter current in normal active use."]],
      ["currents", ["Call the terminal currents base current, collector current, and emitter current. The emitter current is the total leaving or entering through the emitter branch.", "In the simple BJT picture, collector current is set chiefly by base drive, provided the device is in its intended operating conditions."]],
      ["gain", ["**Current gain** describes the relation between a change in base current and the corresponding collector-current change. It is useful, but it is not a precision constant to build an exact bias from.", "A circuit that must be predictable therefore arranges operating conditions rather than trusting one assumed gain value."]],
    ],
    [
      question("Which three terminals name a BJT?", ["terminals"], ["bjt-terminals"], "base, collector, and emitter", ["gate, drain, and source", "input, output, and ground", "anode, cathode, and gate"], "Name the BJT terminals."),
      question("In the simple active-region picture, which current is controlled by base drive?", ["currents"], ["bjt-current-gain"], "collector current", ["emitter current only", "base current only", "no terminal current"], "What does base drive chiefly control?"),
      question("Why is a quoted BJT current gain a poor sole basis for precise bias?", ["gain"], ["bjt-current-gain"], "It is useful but not a precision constant", ["It makes collector current exactly zero", "It removes the need for a base connection", "It turns a BJT into a FET"], "How should a designer treat current gain when setting bias?"),
    ],
  ),
  lesson(
    "bjt-switches",
    "Using a BJT as a switch",
    "Use base drive to reason about an off or on transistor switch.",
    ["bjt-switch"],
    [{ lesson: "bjt-map-and-terminals", reason: "A switch explanation starts from how base drive controls collector current." }],
    [
      ["job", ["A BJT can be used as a **switch**: the circuit aims for an off state with little controlled path current, or an on state that drives a load.", "This is a different goal from small-signal linear amplification."]],
      ["base-drive", ["Base drive is the control input for a BJT switch. Too little drive may fail to produce the intended on-state load current.", "The load and supply, not just a transistor label, determine the current the switch must handle."]],
      ["on-off", ["In the off state, the circuit prevents the intended collector current from flowing. In the on state, base drive permits the collector-to-emitter path to carry the load current.", "A switch analysis asks whether the load sees the desired two states, not whether a nominal current gain has been memorized."]],
      ["check", ["When checking a BJT switch, trace a complete loop: supply, load, transistor path, and return. Then ask what changing the base drive does to that loop.", "That loop view prevents treating the base as a power source for the load."]],
    ],
    [
      question("What is the control input for a BJT used as a switch?", ["base-drive"], ["bjt-switch"], "base drive", ["collector load alone", "emitter label alone", "a gate voltage"], "Which input controls a BJT switch?"),
      question("What distinguishes the intended on state of a BJT switch?", ["on-off"], ["bjt-switch"], "The collector-to-emitter path carries the load current", ["The base supplies all load power", "No current path reaches the load", "The device has become a resistor with no control"], "What happens in the intended on state?"),
      question("Why trace the whole load loop when checking a switch?", ["check"], ["bjt-switch"], "To see how supply, load, transistor, and return form the current path", ["To avoid considering the load", "To replace base drive with a gate", "To assume gain alone sets everything"], "What does a loop trace reveal?"),
    ],
  ),
  lesson(
    "emitter-followers-and-bias",
    "Emitter followers and bias",
    "See why an emitter follower is useful and why a circuit needs a chosen resting condition.",
    ["emitter-follower", "bjt-bias"],
    [{ lesson: "bjt-map-and-terminals", reason: "The follower and its bias use the BJT terminal and current-control model." }],
    [
      ["follower", ["An **emitter follower** takes its output at the emitter. Its output voltage follows changes at the base rather than producing the large inverted voltage gain of a common-emitter stage.", "Its practical strength is providing a low-output-resistance drive stage for a load."]],
      ["load", ["A follower is often placed between a signal source and a demanding load. It lets the preceding stage avoid supplying all of the load current directly.", "That is why follower behavior is central to practical transistor circuits."]],
      ["bias", ["**Bias** is the deliberate choice of a circuit's no-signal, or quiescent, operating voltages and currents.", "Without a suitable bias point, an input signal can drive a transistor into an unintended operating condition instead of producing the desired response."]],
      ["stability", ["Bias design must tolerate that transistor properties vary. The circuit should establish useful conditions rather than rely on one exact current-gain value.", "This is the same caution introduced with current gain, now applied to a working circuit."]],
    ],
    [
      question("Where is the output of an emitter follower taken?", ["follower"], ["emitter-follower"], "at the emitter", ["at the collector", "at the base", "at the gate"], "Which terminal supplies a follower's output?"),
      question("Why put a follower before a demanding load?", ["load"], ["emitter-follower"], "It provides a drive stage with low output resistance", ["It removes the load from the circuit", "It makes base current irrelevant", "It guarantees voltage amplification"], "What is the follower's practical role?"),
      question("What does bias choose?", ["bias"], ["bjt-bias"], "the no-signal operating voltages and currents", ["only the transistor package", "only the load resistance", "the FET gate material"], "Define a circuit's bias point."),
    ],
  ),
  lesson(
    "common-emitter-and-transconductance",
    "Common-emitter amplification and transconductance",
    "Relate controlled collector current to voltage gain and to transconductance.",
    ["common-emitter-amplifier", "bjt-transconductance"],
    [{ lesson: "bjt-map-and-terminals", reason: "Common-emitter operation uses the BJT current-control model." }],
    [
      ["common-emitter", ["A **common-emitter amplifier** uses changes at the input to change collector current, then turns those current changes into output-voltage changes with its collector circuit.", "It is a voltage-amplifying stage, unlike the follower's main role as a buffer."]],
      ["inversion", ["When collector current rises, the voltage across the collector load changes so the collector output commonly moves in the opposite direction. This is the familiar inversion of the common-emitter stage.", "The direction comes from the collector circuit, so always trace the load and supply."]],
      ["transconductance", ["**Transconductance** names how strongly a change in input voltage changes output current. For a BJT, it connects a small base-emitter-voltage change to a collector-current change.", "It is an amplifier property expressed as current change per voltage change."]],
      ["connection", ["The common-emitter circuit makes transconductance visible: a current change through the collector load becomes an output-voltage change.", "Gain therefore depends on both the device's current response and the collector circuit that receives it."]],
    ],
    [
      question("What does a common-emitter stage convert into an output-voltage change?", ["common-emitter"], ["common-emitter-amplifier"], "a change in collector current", ["a change in gate insulation", "a change in emitter label", "a change in vocabulary"], "What current action drives its output?"),
      question("What does transconductance describe?", ["transconductance"], ["bjt-transconductance"], "output-current change per input-voltage change", ["output-voltage change per collector label", "a fixed current gain", "a switch's off-state resistance"], "Which relationship is transconductance?"),
      question("Why can a common-emitter output invert?", ["inversion"], ["common-emitter-amplifier"], "Collector-current changes act through the collector load circuit", ["The emitter follower always inverts it", "The base becomes disconnected", "Current gain changes sign"], "What establishes the output direction?"),
    ],
  ),
  lesson(
    "bjt-current-sources-and-mirrors",
    "BJT current sources and mirrors",
    "Use a defined operating current to understand sources and copied currents.",
    ["bjt-current-source", "current-mirror"],
    [{ lesson: "emitter-followers-and-bias", reason: "A useful current source starts from a deliberately chosen operating current and voltage." }],
    [
      ["source", ["A **current source** is arranged to supply a controlled current over a useful range of output voltages. It is not an ideal current source in every possible condition.", "The required voltage range is often called headroom: the circuit needs enough voltage to remain in its intended operating condition."]],
      ["reference", ["A current-source circuit begins with a chosen reference current. The rest of the circuit tries to reproduce that operating current where it is needed.", "Bias establishes the operating conditions that make this possible."]],
      ["mirror", ["A **current mirror** uses matched transistor behavior to copy a reference current into another branch. One branch establishes the reference; another supplies the copied current.", "The word mirror describes the relationship between branches, not a physical reflection."]],
      ["limits", ["A mirror's copied current is useful only while its transistors have suitable voltages and remain in their intended region. Headroom is therefore part of every practical current-source check.", "Ask both: what current is requested, and does the circuit have enough voltage to support it?"]],
    ],
    [
      question("What does a practical current source aim to provide?", ["source"], ["bjt-current-source"], "a controlled current over a useful voltage range", ["a fixed voltage at every current", "zero current at all voltages", "a gate-controlled signal path"], "What is a current source trying to do?"),
      question("What does a current mirror copy into another branch?", ["mirror"], ["current-mirror"], "a reference current", ["a base terminal", "a supply voltage label", "a FET channel type"], "What is mirrored?"),
      question("Why check headroom in a current mirror?", ["limits"], ["bjt-current-source"], "The circuit needs suitable transistor voltages to regulate as intended", ["It makes the reference branch unnecessary", "It removes the need for bias", "It forces output current to zero"], "What does headroom protect?"),
    ],
  ),
  lesson(
    "bjt-differential-feedback-output",
    "Differential amplifiers, feedback, and output stages",
    "Combine BJT amplification ideas into comparison, correction, and load-driving circuits.",
    ["differential-amplifier", "negative-feedback", "bjt-output-stage"],
    [
      { lesson: "common-emitter-and-transconductance", reason: "Differential amplification and feedback build on a voltage-amplifying BJT stage." },
      { lesson: "bjt-current-sources-and-mirrors", reason: "A differential pair uses a defined tail current." },
      { lesson: "emitter-followers-and-bias", reason: "Output stages use follower behavior to deliver load current." },
    ],
    [
      ["differential", ["A **differential amplifier** responds to the difference between two input voltages. Its paired transistor paths share a controlled current, often supplied by a tail current source.", "This lets the circuit compare one input with another rather than responding only to one voltage measured against a fixed reference."]],
      ["feedback", ["**Negative feedback** returns part of an amplifier's output so that it opposes an input difference. The circuit then adjusts its output toward the condition the feedback network requests.", "Feedback is a circuit relationship; it is not merely adding another gain stage."]],
      ["output", ["A BJT **output stage** is the part that supplies load current. Follower behavior is useful here because it offers low output resistance and current drive.", "An output stage must be judged by its load behavior, not only by a small-signal voltage gain."]],
      ["combine", ["A practical amplifier can combine a differential input, gain stages, feedback, and an output stage. Each part has a distinct task: compare, amplify, correct, and drive.", "Keeping those roles separate makes a large circuit easier to reason about."]],
    ],
    [
      question("What quantity does a differential amplifier respond to?", ["differential"], ["differential-amplifier"], "the difference between two input voltages", ["only one input's label", "the collector package size", "the FET gate current"], "What does a differential pair compare?"),
      question("What makes feedback negative?", ["feedback"], ["negative-feedback"], "Returned output opposes an input difference", ["Returned output always increases the difference", "The output is disconnected", "The transistor has no bias"], "How does negative feedback act?"),
      question("What is the main task of an output stage?", ["output"], ["bjt-output-stage"], "to supply current to the load", ["to define a FET gate", "to eliminate all feedback", "to create a reference vocabulary"], "What does an output stage do?"),
    ],
  ),
];

const key = process.env.FLASHKARTE_API_KEY;
if (!key) throw new Error("FLASHKARTE_API_KEY is required");

let sequence = 1;
const call = async (method, params) => {
  const body = { jsonrpc: "2.0", id: sequence++, method, params };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} failed: ${response.status} ${await response.text()}`);
  const returnedSession = response.headers.get("mcp-session-id");
  if (returnedSession) sessionId = returnedSession;
  const text = await response.text();
  const match = text.match(/data: (.+)/);
  return JSON.parse(match ? match[1] : text);
};

let sessionId;
const initialized = await call("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "flashkarte-course-author", version: "1.0" },
});
if (initialized.error) throw new Error(JSON.stringify(initialized));

if (process.env.INSPECT_LESSON) {
  const result = await call("tools/call", {
    name: "get_lesson",
    arguments: { subject_id: subjectId, lesson: process.env.INSPECT_LESSON },
  });
  console.log(result.result?.content?.find((item) => item.type === "text")?.text ?? "{}");
  process.exit(0);
}

if (process.env.FIX_MAP_QUESTION === "1") {
  const repair = question(
    "Which statement correctly distinguishes the two transistor families in this course?",
    ["1"],
    ["transistor-family-map"],
    "A BJT is the Chapter 2 device; FETs are introduced in the later module",
    [
      "A BJT and FET are two names for the same terminal set",
      "Only FETs are three-terminal current-control devices",
      "The two families are distinguished only by package shape",
    ],
    "Where does this course introduce the two transistor families?",
  );
  const result = await call("tools/call", {
    name: "add_question",
    arguments: { subject_id: subjectId, lesson: "bjt-map-and-terminals", ...repair },
  });
  if (result.error || result.result?.isError) throw new Error(JSON.stringify(result));
  console.log("bjt-map-and-terminals: map question added");
  process.exit(0);
}

if (process.env.OUTLINE === "1") {
  const result = await call("tools/call", {
    name: "get_outline",
    arguments: { subject_id: subjectId },
  });
  if (result.error || result.result?.isError) throw new Error(JSON.stringify(result));
  console.log(result.result?.content?.find((item) => item.type === "text")?.text ?? "{}");
  process.exit(0);
}

const startAt = Number(process.env.START_AT ?? "0");
for (const draft of lessons.slice(startAt)) {
  const result = await call("tools/call", {
    name: "import_lesson",
    arguments: { subject_id: subjectId, ...draft },
  });
  if (result.error || result.result?.isError) throw new Error(JSON.stringify(result));
  console.log(`${draft.lesson.slug}: imported`);
}

for (const draft of lessons) {
  const result = await call("tools/call", {
    name: "lint_lesson",
    arguments: { subject_id: subjectId, lesson: draft.lesson.slug },
  });
  if (result.error || result.result?.isError) throw new Error(JSON.stringify(result));
  const text = result.result?.content?.find((item) => item.type === "text")?.text ?? "{}";
  const lint = JSON.parse(text);
  if (Array.isArray(lint.issues) && lint.issues.length > 0) {
    throw new Error(`${draft.lesson.slug}: ${JSON.stringify(lint.issues)}`);
  }
  console.log(`${draft.lesson.slug}: linted cleanly`);
}
