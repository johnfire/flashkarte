/* Import the reviewed Chapter 3 FET lesson drafts through Flashkarte MCP. */

const SUBJECT_ID = "b6cd1a8e-c196-4155-930a-f3812178d907";
const MCP_ENDPOINT = "https://mcp.flashkarte.christopherrehm.de/mcp";
const MODULE_TITLE = "Field-Effect Transistors: voltage control and power switching";
const SOURCE = { title: "The Art of Electronics, 3rd ed. (2015), Chapter 3: Field-Effect Transistors" };

const makeOption = (correct, blocks, reason) => ({ correct, blocks, reason });
const makeQuestion = (prompt, teaches, covers, answer, distractors, variant) => ({
  prompt,
  teaches,
  covers,
  options: [makeOption(true, answer, "This follows the model taught on the named screen."), ...distractors.map((text) => makeOption(false, text, "This does not match the model taught here."))],
  variants: [{ prompt: variant, options: [makeOption(true, answer, "It tests the same idea with different wording."), ...distractors.map((text) => makeOption(false, text, "It does not match the model taught here."))] }],
});
const makeLesson = (slug, title, summary, covers, prerequisites, screens, questions) => ({
  module: MODULE_TITLE,
  lesson: { slug, title, summary, covers, prerequisites },
  screens: screens.map(([ref, blocks]) => ({ ref, blocks, sources: [SOURCE] })),
  questions,
});

const lessons = [
  makeLesson("fet-terminals-and-types", "FET terminals and types", "Name FET terminals and distinguish the basic families.", ["fet-terminals", "fet-types"], [], [
    ["terminals", ["A **field-effect transistor**, or **FET**, has a **gate**, **drain**, and **source**. The gate controls the path between drain and source.", "Unlike the BJT, a FET is described as voltage-controlled at its input."]],
    ["families", ["The main families here are JFETs and MOSFETs. A JFET uses a junction gate; a MOSFET has an insulated gate.", "The gate construction explains important differences in input behavior."]],
    ["channel", ["FETs are also described by their channel type and by whether a MOSFET is depletion-mode or enhancement-mode. These names tell you how gate voltage affects conduction.", "Do not treat every FET symbol as the same device: its type sets the useful operating behavior."]],
    ["map", ["This module moves from device language to analog use, switching, and power limits. Keep the terminal names fixed while the applications change.", "The gate is the control terminal; the drain-source path is the controlled path."]],
  ], [
    makeQuestion("Which terminals name a FET?", ["terminals"], ["fet-terminals"], "gate, drain, and source", ["base, collector, and emitter", "anode, cathode, and gate", "input, output, and return"], "Name the three FET terminals."),
    makeQuestion("What distinguishes a MOSFET gate from a JFET gate?", ["families"], ["fet-types"], "A MOSFET has an insulated gate", ["A MOSFET has no gate", "A JFET has no source", "A JFET has an insulated collector"], "Which FET family has an insulated gate?"),
    makeQuestion("What does a FET's type tell a designer?", ["channel"], ["fet-types"], "How gate voltage affects conduction", ["Only the package color", "Only the supply polarity", "Only the load value"], "Why does FET type matter?"),
  ]),
  makeLesson("fet-gate-and-operating-regions", "Gate input and operating regions", "Relate gate voltage to channel current and choose the intended operating region.", ["fet-gate-input", "fet-transfer-characteristic", "fet-operating-region"], [{ lesson: "fet-terminals-and-types", reason: "Gate behavior and transfer curves depend on the FET family and terminal roles." }], [
    ["input", ["The FET **gate** is a control input. An insulated MOSFET gate draws very little steady current, though its capacitance matters when the voltage must change quickly.", "That high input resistance is one reason FETs are useful at sensitive signal inputs."]],
    ["transfer", ["A **transfer characteristic** relates gate-to-source voltage to drain current. It is the map from a control voltage to a controlled current.", "The exact curve depends on the FET type and on the particular device."]],
    ["regions", ["An **operating region** is the range of terminal voltages chosen for a job. A circuit uses one region for amplification or current sourcing and another for low-resistance switching.", "The desired region is part of the design, not an accidental result."]],
    ["bias", ["Bias selects the no-signal gate and drain-source conditions. A small signal then moves around that selected point.", "Before predicting a FET circuit, ask which region its bias intends to establish."]],
  ], [
    makeQuestion("What does a FET transfer characteristic relate?", ["transfer"], ["fet-transfer-characteristic"], "gate-to-source voltage and drain current", ["drain voltage and package size", "gate label and source label", "collector current and base current"], "Which quantities appear on a FET transfer curve?"),
    makeQuestion("Why does a circuit choose an operating region?", ["regions"], ["fet-operating-region"], "Different jobs need different drain-source behavior", ["FET types have no effect", "It eliminates the need for bias", "It makes gate current large"], "What is the purpose of choosing a region?"),
    makeQuestion("What does FET bias select before a signal arrives?", ["bias"], ["fet-gate-input"], "the no-signal terminal conditions", ["only a load's name", "only a transistor family", "the BJT collector terminal"], "What does a FET bias point establish?"),
  ]),
  makeLesson("fet-amplifiers-and-followers", "FET amplifiers and source followers", "Use a biased FET for voltage amplification or as a high-input-resistance follower.", ["fet-amplifier", "source-follower"], [{ lesson: "fet-gate-and-operating-regions", reason: "Amplifier bias and follower behavior require an intended FET operating region." }], [
    ["amplifier", ["A FET **amplifier** uses a gate-voltage change to vary drain current. The drain circuit turns that current change into an output-voltage change.", "The gate's low steady current makes this useful when the signal source cannot provide much input current."]],
    ["common-source", ["A common-source FET amplifier plays a role similar to a common-emitter BJT stage: current changes through the drain circuit create voltage gain.", "The circuit details set the bias, gain, and output direction."]],
    ["follower", ["A **source follower** takes its output at the source. It follows the gate voltage while offering a high input resistance and a useful drive stage.", "It is the FET counterpart to the emitter follower's buffering role."]],
    ["choice", ["Choose an amplifier when a signal needs voltage gain. Choose a follower when a signal source needs isolation from a load and a low-output-resistance drive path.", "Both begin by selecting a suitable operating region."]],
  ], [
    makeQuestion("What current does a FET amplifier vary with its gate voltage?", ["amplifier"], ["fet-amplifier"], "drain current", ["gate current only", "a BJT base current", "no circuit current"], "Which FET current changes in an amplifier?"),
    makeQuestion("Where is a source follower's output taken?", ["follower"], ["source-follower"], "at the source", ["at the drain", "at the gate", "at the collector"], "Name the output terminal of a source follower."),
    makeQuestion("When is a follower the better first choice than a voltage-gain stage?", ["choice"], ["source-follower"], "When isolating a source from a load and providing drive", ["When no input signal exists", "When a gate must draw large steady current", "When using only BJT terminals"], "What practical role does a source follower serve?"),
  ]),
  makeLesson("fet-current-sources-and-resistors", "FET current sources and variable resistors", "Recognize two FET applications that depend on the chosen operating region.", ["fet-current-source", "fet-variable-resistor"], [{ lesson: "fet-gate-and-operating-regions", reason: "Both applications are defined by the FET operating region selected by its terminal voltages." }], [
    ["current-source", ["A FET can form a **current source** when its operating region makes drain current relatively insensitive to drain-source voltage changes over a useful range.", "As with a BJT current source, the circuit still needs enough voltage headroom to operate as intended."]],
    ["headroom", ["Headroom is the available voltage needed to preserve the selected behavior. A current source cannot maintain its target current if the circuit drives it outside that useful range.", "Always check the requested output voltage as well as the desired current."]],
    ["resistor", ["In its ohmic or linear region, a FET channel can behave as a controlled **variable resistor**. Gate voltage changes the channel resistance.", "This is a controlled resistance, not an ideal fixed resistor."]],
    ["contrast", ["The same FET is not a current source and a variable resistor at the same time. The terminal voltages decide which behavior is a useful approximation.", "That is why naming the region comes before naming the application."]],
  ], [
    makeQuestion("What lets a FET act as a useful current source?", ["current-source"], ["fet-current-source"], "A region where drain current changes little with drain-source voltage", ["A gate that supplies all load current", "No drain-source path", "A BJT current gain"], "Which region supports FET current-source behavior?"),
    makeQuestion("What does gate voltage control when a FET is used as a variable resistor?", ["resistor"], ["fet-variable-resistor"], "the channel resistance", ["the transistor family name", "the collector terminal", "the supply's existence"], "What is varied in the resistor application?"),
    makeQuestion("Why cannot one FET approximation serve both applications at once?", ["contrast"], ["fet-current-source"], "The terminal voltages select the useful operating region", ["FETs have only one terminal", "Gate voltage never matters", "Current sources require no headroom"], "What decides which FET behavior applies?"),
  ]),
  makeLesson("fet-analog-switches", "FET analog switches", "Use controlled channel resistance to understand an analog signal switch.", ["fet-analog-switch"], [{ lesson: "fet-current-sources-and-resistors", reason: "An analog switch is understood from the FET's controlled channel resistance." }], [
    ["switch", ["An **analog switch** uses a FET's controlled channel resistance to connect or disconnect a signal path. The gate is the control input; the drain-source path carries the signal.", "The signal is analog because its value need not be only a logic zero or one."]],
    ["on", ["When the FET is driven to a low channel resistance, the signal path is on. The resistance is not literally zero, so it can affect a signal source and load.", "A good switch analysis includes the resistance in the signal path."]],
    ["off", ["When the channel is not conducting as intended, the signal path is off. Off does not mean every nonideal effect disappears; practical circuits consider leakage and capacitance where relevant.", "The essential model is a gate-controlled signal path."]],
    ["control", ["A MOSFET gate can control this path with very little steady input current. That separates the control signal from the analog signal being routed.", "Keep control path and signal path distinct when reading a switch circuit."]],
  ], [
    makeQuestion("What FET property makes an analog switch possible?", ["switch"], ["fet-analog-switch"], "gate-controlled channel resistance", ["BJT collector labels", "a fixed zero-ohm path", "a gate that carries the signal current"], "What does a FET analog switch control?"),
    makeQuestion("Why is an on analog switch not an ideal wire?", ["on"], ["fet-analog-switch"], "Its channel has nonzero resistance", ["Its gate has no voltage", "It has no drain-source path", "It must be a BJT"], "What nonideality remains when the switch is on?"),
    makeQuestion("Which path carries the analog signal in a FET switch?", ["control"], ["fet-analog-switch"], "the drain-source path", ["the gate path", "the BJT base path", "the supply label"], "Where does the switched signal flow?"),
  ]),
  makeLesson("mosfet-logic-and-power-switching", "MOSFET logic and power switching", "Connect enhancement MOSFET switching to logic signals and higher-power loads.", ["mosfet-logic-switch", "power-mosfet-switching"], [{ lesson: "fet-terminals-and-types", reason: "Logic switching uses the behavior of an enhancement-mode MOSFET." }], [
    ["logic", ["An enhancement-mode MOSFET is naturally used as a logic switch: a suitable gate voltage creates a conductive channel, while another gate voltage removes it.", "Digital circuits use these controlled states to represent logic values."]],
    ["on-resistance", ["In the on state, the important practical quantity is channel **on-resistance**. Lower resistance reduces the voltage drop and heating caused by load current.", "A power-switch design therefore treats the MOSFET as a controlled, nonzero resistance."]],
    ["power", ["A **power MOSFET** extends the switching idea to substantial current or voltage. Its gate still controls the channel, but layout, drive speed, and heat become more important.", "The device must be selected for the actual electrical stress, not merely for its logic-level control."]],
    ["loss", ["Power switching has conduction loss while the channel is on and loss while the device changes state. Both contribute to the heat the device must shed.", "The next lesson makes the thermal consequence explicit."]],
  ], [
    makeQuestion("What does a suitable gate voltage do in an enhancement MOSFET logic switch?", ["logic"], ["mosfet-logic-switch"], "It creates a conductive channel", ["It creates a BJT base current", "It removes the drain terminal", "It makes on-resistance infinite"], "What creates the MOSFET on state?"),
    makeQuestion("Why is on-resistance important in a power MOSFET?", ["on-resistance"], ["power-mosfet-switching"], "It affects voltage drop and heating under load current", ["It names the gate material", "It determines the FET family", "It removes switching loss"], "What does lower on-resistance improve?"),
    makeQuestion("What additional concern grows in power switching?", ["power"], ["power-mosfet-switching"], "electrical stress and heat", ["the number of terminals", "the absence of a drain-source path", "the BJT current gain"], "What becomes especially important at power?"),
  ]),
  makeLesson("power-mosfet-thermal-and-selection", "Power MOSFET heat and choosing BJT or FET", "Assess thermal consequences of switching loss and compare device families by the job.", ["power-mosfet-thermal", "bjt-fet-selection"], [{ lesson: "mosfet-logic-and-power-switching", reason: "Thermal behavior follows from the conduction and switching losses of a power MOSFET." }, { lesson: "bjt-map-and-terminals", reason: "A device choice compares the BJT's current-controlled behavior with FET behavior." }, { lesson: "fet-gate-and-operating-regions", reason: "A device choice uses the FET's gate input behavior and operating regions." }], [
    ["thermal", ["Power loss becomes heat. A power MOSFET must keep its junction temperature within safe limits while it conducts and switches.", "Thermal design is part of electrical design: a circuit that works briefly may still fail when it cannot shed heat."]],
    ["path", ["Heat travels from the device junction through its package and mounting into the surrounding environment. The permitted temperature rise limits the loss the device can tolerate.", "This is why the same electrical circuit can need different cooling in different enclosures."]],
    ["compare", ["Choose a BJT or FET from the job's requirements. A FET's high input resistance and voltage-controlled gate are useful where the control source should draw little steady current.", "A BJT's current-controlled behavior remains useful in many analog circuits; no single transistor family wins every job."]],
    ["selection", ["For a power switch, compare voltage and current ratings, on-state loss, switching loss, gate-drive needs, and thermal path. For an analog input, compare input-current demand and the intended gain behavior.", "Selection is a reasoned tradeoff, not a search for a universally best transistor."]],
  ], [
    makeQuestion("Why must a power MOSFET's thermal path be checked?", ["thermal"], ["power-mosfet-thermal"], "Its electrical losses become heat that must be shed", ["It has no junction", "On-resistance creates no loss", "Cooling changes its terminals"], "What does power loss become in a MOSFET?"),
    makeQuestion("When is a FET's high input resistance especially useful?", ["compare"], ["bjt-fet-selection"], "When the control source should draw little steady current", ["When the gate must supply load current", "When a collector is required", "When thermal limits do not matter"], "What design need favors a FET input?"),
    makeQuestion("What is the sound way to choose between a BJT and FET?", ["selection"], ["bjt-fet-selection"], "Compare the requirements of the actual job", ["Always choose the newest family", "Always choose the lowest gate current", "Ignore thermal and switching loss"], "How should transistor selection be made?"),
  ]),
];

const apiKey = process.env.FLASHKARTE_API_KEY;
if (!apiKey) throw new Error("FLASHKARTE_API_KEY is required");
let sessionId;
let requestId = 1;

async function callMcp(method, params) {
  const response = await fetch(MCP_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(sessionId ? { "mcp-session-id": sessionId } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", id: requestId++, method, params }) });
  if (!response.ok) throw new Error(`${method} failed: ${response.status} ${await response.text()}`);
  sessionId = response.headers.get("mcp-session-id") ?? sessionId;
  const body = await response.text();
  return JSON.parse(body.match(/data: (.+)/)?.[1] ?? body);
}

async function callTool(name, arguments_) {
  const reply = await callMcp("tools/call", { name, arguments: arguments_ });
  if (reply.error || reply.result?.isError) throw new Error(JSON.stringify(reply));
  return JSON.parse(reply.result.content.find((content) => content.type === "text")?.text ?? "{}");
}

await callMcp("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "flashkarte-course-author", version: "1.0" } });
if (process.env.INSPECT_LESSON) {
  console.log(JSON.stringify(await callTool("get_lesson", { subject_id: SUBJECT_ID, lesson: process.env.INSPECT_LESSON })));
  process.exit(0);
}
if (process.env.REPAIR_CURRENT_SOURCE === "1") {
  const repaired = await callTool("update_question", {
    subject_id: SUBJECT_ID,
    lesson: "fet-current-sources-and-resistors",
    question_id: "e810df3f-eeec-49b8-8087-255defeac655",
    covers: ["fet-current-source"],
  });
  if (repaired.issues?.length) throw new Error(JSON.stringify(repaired.issues));
  console.log("fet-current-sources-and-resistors: coverage repaired cleanly");
  process.exit(0);
}
const startAt = Number(process.env.START_AT ?? "0");
for (const lesson of lessons.slice(startAt)) {
  const imported = await callTool("import_lesson", { subject_id: SUBJECT_ID, ...lesson });
  if (imported.issues?.length) throw new Error(`${lesson.lesson.slug}: ${JSON.stringify(imported.issues)}`);
  console.log(`${lesson.lesson.slug}: imported cleanly`);
}
for (const lesson of lessons) {
  const lint = await callTool("lint_lesson", { subject_id: SUBJECT_ID, lesson: lesson.lesson.slug });
  if (lint.issues?.length) throw new Error(`${lesson.lesson.slug}: ${JSON.stringify(lint.issues)}`);
  console.log(`${lesson.lesson.slug}: linted cleanly`);
}
const outline = await callTool("get_outline", { subject_id: SUBJECT_ID });
console.log(JSON.stringify(outline.modules.map(({ title, lessons: moduleLessons }) => ({ title, lessons: moduleLessons.map(({ slug, unlocksAfter }) => ({ slug, unlocksAfter: unlocksAfter.map(({ slug: prerequisite }) => prerequisite) })) }))));
