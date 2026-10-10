import { parse as parseCsv } from "csv-parse/sync";
import readXlsxFile, { type SheetData } from "read-excel-file/node";
import yauzl from "yauzl";
import type { ParsedCard } from "@flashkarte/shared";
import { ValidationError } from "../../utils/errors";

export const MAX_COURSE_DECKS = 100;
export const MAX_CARDS_PER_IMPORTED_COURSE = 20_000;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_CSV_RECORDS = MAX_CARDS_PER_IMPORTED_COURSE + MAX_COURSE_DECKS + 5;
const REQUIRED_COURSE_FILES = ["course.csv", "decks.csv", "cards.csv"] as const;

export interface ImportedDeck {
  title: string;
  cards: ParsedCard[];
}

export interface ImportedFlashcardCourse {
  title: string;
  description: string | null;
  decks: ImportedDeck[];
}

interface ImportTable {
  name: string;
  rows: string[][];
}

interface ImportRow {
  rowNumber: number;
  values: Record<string, string>;
}

interface OrderedDeck {
  key: string;
  title: string;
  order: number;
}

function normalizeColumnName(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "_");
}

function stringifyCell(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).trim();
}

function normalizeRows(rows: readonly (readonly unknown[])[]): string[][] {
  if (rows.length > MAX_CSV_RECORDS) {
    throw new ValidationError("The import has too many rows");
  }
  return rows.map((row) => row.map(stringifyCell));
}

function parseCsvTable(contents: string, name: string): ImportTable {
  try {
    const rows = parseCsv(contents, {
      bom: true,
      relax_column_count: false,
      skip_empty_lines: true,
      max_record_size: 100_000,
    }) as string[][];
    return { name, rows: normalizeRows(rows) };
  } catch {
    throw new ValidationError(`Could not read ${name} as a CSV file`);
  }
}

function makeImportRows(table: ImportTable): ImportRow[] {
  const header = table.rows[0];
  if (!header) throw new ValidationError(`${table.name} needs a header row`);
  const columns = header.map(normalizeColumnName);
  if (new Set(columns).size !== columns.length) {
    throw new ValidationError(`${table.name} has duplicate column names`);
  }
  return table.rows.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    values: Object.fromEntries(
      columns.map((column, columnIndex) => [column, cells[columnIndex] ?? ""]),
    ),
  }));
}

function requireValue(
  row: ImportRow,
  column: string,
  tableName: string,
): string {
  const value = row.values[column]?.trim();
  if (!value) {
    throw new ValidationError(
      `${tableName}, row ${row.rowNumber}: ${column} is required`,
    );
  }
  return value;
}

function requireColumns(table: ImportTable, columns: string[]): void {
  const header = table.rows[0]?.map(normalizeColumnName) ?? [];
  const missing = columns.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new ValidationError(
      `${table.name} is missing: ${missing.join(", ")}`,
    );
  }
}

function cardFromRow(row: ImportRow, tableName: string): ParsedCard {
  const answer = requireValue(row, "answer", tableName);
  const explanation = row.values.explanation?.trim();
  return {
    type: "basic",
    front: requireValue(row, "front", tableName),
    back: explanation ? `${answer}\n\n${explanation}` : answer,
    category: null,
    label: null,
    options: [],
    sense: null,
    senseConflict: false,
  };
}

function cardRowsFromTable(table: ImportTable): ImportRow[] {
  requireColumns(table, ["front", "answer"]);
  const rows = makeImportRows(table);
  if (rows.length === 0)
    throw new ValidationError(`${table.name} has no cards`);
  return rows;
}

export function parseDeckCsv(contents: Buffer, title: string): ImportedDeck {
  const table = parseCsvTable(contents.toString("utf8"), "Deck CSV");
  const cards = cardRowsFromTable(table).map((row) =>
    cardFromRow(row, table.name),
  );
  return { title, cards };
}

function tableByName(tables: ImportTable[], requiredName: string): ImportTable {
  const table = tables.find(
    (candidate) => candidate.name.trim().toLowerCase() === requiredName,
  );
  if (!table) throw new ValidationError(`Missing ${requiredName}`);
  return table;
}

function orderedDecksFromTable(table: ImportTable): OrderedDeck[] {
  requireColumns(table, ["deck_key", "title", "order"]);
  const rows = makeImportRows(table);
  if (rows.length === 0) throw new ValidationError("Decks has no deck rows");
  if (rows.length > MAX_COURSE_DECKS) {
    throw new ValidationError(
      `A course can have at most ${MAX_COURSE_DECKS} decks`,
    );
  }
  const orderedDecks: OrderedDeck[] = rows.map((row) => ({
    key: requireValue(row, "deck_key", table.name),
    title: requireValue(row, "title", table.name),
    order: Number(requireValue(row, "order", table.name)),
  }));
  if (
    orderedDecks.some((deck) => !Number.isInteger(deck.order) || deck.order < 1)
  ) {
    throw new ValidationError(
      "Decks: order must be a whole number starting at 1",
    );
  }
  const keys = orderedDecks.map((deck) => deck.key);
  if (new Set(keys).size !== keys.length)
    throw new ValidationError("Decks has duplicate deck_key values");
  const orders = orderedDecks.map((deck) => deck.order);
  if (new Set(orders).size !== orders.length)
    throw new ValidationError("Decks has duplicate order values");
  return orderedDecks.sort((left, right) => left.order - right.order);
}

function createDecks(table: ImportTable): Map<string, ImportedDeck> {
  return new Map(
    orderedDecksFromTable(table).map((deck) => [
      deck.key,
      { title: deck.title, cards: [] },
    ]),
  );
}

function addCardsToDecks(
  table: ImportTable,
  decks: Map<string, ImportedDeck>,
): void {
  requireColumns(table, ["deck_key", "front", "answer"]);
  const rows = makeImportRows(table);
  if (rows.length === 0) throw new ValidationError("Cards has no card rows");
  if (rows.length > MAX_CARDS_PER_IMPORTED_COURSE) {
    throw new ValidationError(
      `A course can have at most ${MAX_CARDS_PER_IMPORTED_COURSE} cards`,
    );
  }
  for (const row of rows) {
    const deckKey = requireValue(row, "deck_key", table.name);
    const deck = decks.get(deckKey);
    if (!deck) {
      throw new ValidationError(
        `Cards, row ${row.rowNumber}: unknown deck_key ${deckKey}`,
      );
    }
    deck.cards.push(cardFromRow(row, table.name));
  }
  for (const deck of decks.values()) {
    if (deck.cards.length === 0) {
      throw new ValidationError(`Deck ${deck.title} has no cards`);
    }
  }
}

export function parseFlashcardCourseTables(
  tables: ImportTable[],
): ImportedFlashcardCourse {
  const courseTable = tableByName(tables, "course");
  requireColumns(courseTable, ["course_title", "description"]);
  const courseRows = makeImportRows(courseTable);
  if (courseRows.length !== 1) {
    throw new ValidationError("Course needs exactly one course row");
  }
  const courseRow = courseRows[0];
  const decks = createDecks(tableByName(tables, "decks"));
  addCardsToDecks(tableByName(tables, "cards"), decks);
  return {
    title: requireValue(courseRow, "course_title", courseTable.name),
    description: courseRow.values.description?.trim() || null,
    decks: [...decks.values()],
  };
}

function sheetTables(
  sheets: { sheet: string; data: SheetData }[],
): ImportTable[] {
  return sheets.map((sheet) => ({
    name: sheet.sheet,
    rows: normalizeRows(sheet.data),
  }));
}

export async function parseCourseWorkbook(
  contents: Buffer,
): Promise<ImportedFlashcardCourse> {
  try {
    const sheets = await readXlsxFile(contents);
    return parseFlashcardCourseTables(sheetTables(sheets));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(
      "Could not read this workbook. Export it again as .xlsx.",
    );
  }
}

function assertZipEntries(zipFile: yauzl.ZipFile): void {
  if (zipFile.entryCount > REQUIRED_COURSE_FILES.length) {
    throw new ValidationError(
      "The ZIP can contain only course.csv, decks.csv and cards.csv",
    );
  }
}

function assertZipEntry(entry: yauzl.Entry): string {
  const entryName = entry.fileName.toLowerCase();
  if (
    !REQUIRED_COURSE_FILES.includes(
      entryName as (typeof REQUIRED_COURSE_FILES)[number],
    )
  ) {
    throw new ValidationError(
      "The ZIP can contain only course.csv, decks.csv and cards.csv",
    );
  }
  if (entry.uncompressedSize > MAX_IMPORT_BYTES) {
    throw new ValidationError(`${entry.fileName} is too large`);
  }
  return entryName;
}

async function readZipEntry(
  zipFile: yauzl.ZipFile,
  entry: yauzl.Entry,
): Promise<ImportTable> {
  const entryName = assertZipEntry(entry);
  const stream = await zipFile.openReadStreamPromise(entry);
  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    receivedBytes += bytes.length;
    if (receivedBytes > MAX_IMPORT_BYTES) {
      throw new ValidationError(`${entry.fileName} is too large`);
    }
    chunks.push(bytes);
  }
  return parseCsvTable(
    Buffer.concat(chunks).toString("utf8"),
    entryName.replace(".csv", ""),
  );
}

async function readZipCsvFiles(contents: Buffer): Promise<ImportTable[]> {
  const zipFile = await yauzl.fromBufferPromise(contents, {
    lazyEntries: true,
    validateEntrySizes: true,
    strictFileNames: true,
  });
  assertZipEntries(zipFile);
  const tables: ImportTable[] = [];
  for await (const entry of zipFile.eachEntry()) {
    tables.push(await readZipEntry(zipFile, entry));
  }
  return tables;
}

export async function parseCourseZip(
  contents: Buffer,
): Promise<ImportedFlashcardCourse> {
  try {
    const tables = await readZipCsvFiles(contents);
    if (tables.length !== REQUIRED_COURSE_FILES.length) {
      throw new ValidationError(
        "The ZIP needs course.csv, decks.csv and cards.csv",
      );
    }
    return parseFlashcardCourseTables(tables);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(
      "Could not read this ZIP. Create it again with the three CSV files.",
    );
  }
}
