import { parseInlineMarkup, spansToMarkup } from "./inline-markup";

const plain = (text: string) => ({ text });

describe("parseInlineMarkup", () => {
  it("reads bold, italic, both, and code", () => {
    expect(
      parseInlineMarkup("A **bold** and *italic* and `code` word"),
    ).toEqual([
      plain("A "),
      { text: "bold", bold: true },
      plain(" and "),
      { text: "italic", italic: true },
      plain(" and "),
      { text: "code", code: true },
      plain(" word"),
    ]);
    expect(parseInlineMarkup("***both***")).toEqual([
      { text: "both", bold: true, italic: true },
    ]);
  });

  it("leaves plain text as one span", () => {
    expect(parseInlineMarkup("Just words.")).toEqual([plain("Just words.")]);
  });

  it("treats multiplication and stray asterisks as plain text", () => {
    for (const text of [
      "4 * 768 = 3072",
      "2*3 and 4*5",
      "a * b * c",
      "5*",
      "*",
    ]) {
      expect(parseInlineMarkup(text)).toEqual([plain(text)]);
    }
  });

  it("does not open across a letter or digit, so a word's inner asterisk stays", () => {
    expect(parseInlineMarkup("x*y*z")).toEqual([plain("x*y*z")]);
  });

  it("recognises markup next to punctuation and brackets", () => {
    expect(parseInlineMarkup("(*mat*), **and** *floor*.")).toEqual([
      plain("("),
      { text: "mat", italic: true },
      plain("), "),
      { text: "and", bold: true },
      plain(" "),
      { text: "floor", italic: true },
      plain("."),
    ]);
  });

  it("leaves an unterminated marker as literal text", () => {
    expect(parseInlineMarkup("an *open italic")).toEqual([
      plain("an *open italic"),
    ]);
    expect(parseInlineMarkup("an **open bold")).toEqual([
      plain("an **open bold"),
    ]);
    expect(parseInlineMarkup("a lone ` backtick")).toEqual([
      plain("a lone ` backtick"),
    ]);
  });

  it("lets a backslash escape *, a backtick and a backslash", () => {
    expect(parseInlineMarkup("a \\*star\\* and a \\`tick\\` and \\\\")).toEqual(
      [plain("a *star* and a `tick` and \\")],
    );
    expect(parseInlineMarkup("*it \\* has a star*")).toEqual([
      { text: "it * has a star", italic: true },
    ]);
  });

  it("keeps a backslash before any other character", () => {
    expect(parseInlineMarkup("C:\\temp and \\n")).toEqual([
      plain("C:\\temp and \\n"),
    ]);
  });

  it("does not nest: an italic inside bold stays literal text", () => {
    expect(parseInlineMarkup("**bold *not italic* bold**")).toEqual([
      { text: "bold *not italic* bold", bold: true },
    ]);
  });

  it("takes code literally, with no markup or escapes inside", () => {
    expect(parseInlineMarkup("`a *b* **c**`")).toEqual([
      { text: "a *b* **c**", code: true },
    ]);
  });

  it("copes with the empty string and with unicode", () => {
    expect(parseInlineMarkup("")).toEqual([]);
    expect(parseInlineMarkup("**größer** als √d_k")).toEqual([
      { text: "größer", bold: true },
      plain(" als √d_k"),
    ]);
  });
});

describe("spansToMarkup", () => {
  it("writes markup that parses back to the same spans", () => {
    const spans = [
      plain("The "),
      { text: "token", bold: true },
      plain(" is "),
      { text: "a piece", italic: true },
      plain(" of "),
      { text: "text", code: true },
      plain(", 4 * 768 and 5*."),
    ];
    const markup = spansToMarkup(spans);
    expect(markup).not.toBeNull();
    expect(parseInlineMarkup(markup as string)).toEqual(spans);
  });

  it("escapes asterisks, backticks and backslashes in plain text", () => {
    const spans = [plain("a * b `c` \\d")];
    const markup = spansToMarkup(spans) as string;
    expect(markup).toBe("a \\* b \\`c\\` \\\\d");
    expect(parseInlineMarkup(markup)).toEqual(spans);
  });

  it("gives up (null) when the spans cannot be written and read back identically", () => {
    expect(spansToMarkup([{ text: "x", math: {} }])).toBeNull();
    expect(spansToMarkup([{ text: "x", code: true, bold: true }])).toBeNull();
    expect(spansToMarkup([{ text: " padded ", bold: true }])).toBeNull();
    expect(spansToMarkup([{ text: "a`b", code: true }])).toBeNull();
    // italic run of letters directly followed by a letter cannot close: "cat" + "s"
    expect(
      spansToMarkup([{ text: "cat", italic: true }, plain("s")]),
    ).toBeNull();
    // two adjacent plain spans merge when read back, so they are not the same spans
    expect(spansToMarkup([plain("a"), plain("b")])).toBeNull();
  });
});
