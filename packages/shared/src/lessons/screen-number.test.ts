import {
  compareScreenNumbers,
  isValidScreenNumber,
  MAX_SCREEN_NUMBER_DECIMALS,
  normalizeScreenNumber,
  suggestScreenNumber,
} from "./screen-number";

describe("valid and canonical screen numbers", () => {
  it.each([
    ["213", "213"],
    ["213.01", "213.010"],
    ["213.010", "213.010"],
    ["213.0250", "213.025"],
    ["213.0225", "213.0225"],
    ["213.000", "213"],
    ["0.5", "0.500"],
  ])("normalises %s to %s", (input, expected) => {
    expect(normalizeScreenNumber(input)).toBe(expected);
  });

  it.each([
    "",
    "0",
    "-1",
    "213.",
    ".5",
    "1e3",
    "abc",
    "1,5",
    " 213",
    "213 ",
    "007",
    "1.1234567890123",
  ])("rejects %j", (input) => {
    expect(isValidScreenNumber(input)).toBe(false);
    expect(() => normalizeScreenNumber(input)).toThrow(RangeError);
  });

  it("is idempotent", () => {
    for (const input of ["213.01", "0.5", "7.0225", "40"]) {
      const once = normalizeScreenNumber(input);
      expect(normalizeScreenNumber(once)).toBe(once);
    }
  });
});

describe("compareScreenNumbers", () => {
  it("orders by numeric value, not by text", () => {
    expect(compareScreenNumbers("9", "10")).toBeLessThan(0);
    expect(compareScreenNumbers("213.010", "213.02")).toBeLessThan(0);
    expect(compareScreenNumbers("213.025", "213.0225")).toBeGreaterThan(0);
    expect(compareScreenNumbers("213.01", "213.010")).toBe(0);
  });

  it("is exact where floating point is not", () => {
    // 0.1 + 0.2 !== 0.3 in floating point; screen numbers must never depend on that.
    expect(compareScreenNumbers("0.300", "0.300000000001")).toBeLessThan(0);
  });
});

describe("suggestScreenNumber: the examples Chris gave", () => {
  it("steps by 0.010 after a screen, then again, then splits a gap", () => {
    expect(suggestScreenNumber("213", "214")).toBe("213.010");
    expect(suggestScreenNumber("213.010", "214")).toBe("213.020");
    expect(suggestScreenNumber("213.020", "213.030")).toBe("213.025");
  });

  it("starts at 1, and appends the next whole number", () => {
    expect(suggestScreenNumber(null, null)).toBe("1");
    expect(suggestScreenNumber("213", null)).toBe("214");
    expect(suggestScreenNumber("213.020", null)).toBe("214");
  });

  it("can insert before the first screen", () => {
    expect(suggestScreenNumber(null, "1")).toBe("0.010");
    expect(
      compareScreenNumbers(suggestScreenNumber(null, "0.010"), "0.010"),
    ).toBeLessThan(0);
  });

  it("splits a tight gap into more decimals only when it must", () => {
    expect(suggestScreenNumber("213.020", "213.025")).toBe("213.022");
    expect(suggestScreenNumber("213.024", "213.025")).toBe("213.0245");
  });

  it("refuses a bad pair", () => {
    expect(() => suggestScreenNumber("214", "213")).toThrow(RangeError);
    expect(() => suggestScreenNumber("213", "213.000")).toThrow(RangeError);
    expect(() => suggestScreenNumber("x", "214")).toThrow(RangeError);
  });
});

/** A small seeded generator, so a failure reproduces exactly. No extra dependency needed. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomNumber(random: () => number): string {
  const whole = 1 + Math.floor(random() * 500);
  const decimals = Math.floor(random() * 6);
  if (decimals === 0) return String(whole);
  const digits = Array.from({ length: decimals }, () =>
    Math.floor(random() * 10),
  ).join("");
  return normalizeScreenNumber(`${whole}.${digits}`);
}

describe("suggestScreenNumber properties (seeded, 2000 random pairs)", () => {
  const random = seededRandom(20260919);
  const pairs: Array<[string, string]> = [];
  while (pairs.length < 2000) {
    const a = randomNumber(random);
    const b = randomNumber(random);
    const order = compareScreenNumbers(a, b);
    if (order < 0) pairs.push([a, b]);
    else if (order > 0) pairs.push([b, a]);
  }

  it("always returns a valid, canonical number strictly between the neighbours", () => {
    for (const [before, after] of pairs) {
      const suggested = suggestScreenNumber(before, after);
      expect(isValidScreenNumber(suggested)).toBe(true);
      expect(normalizeScreenNumber(suggested)).toBe(suggested);
      expect(compareScreenNumbers(before, suggested)).toBeLessThan(0);
      expect(compareScreenNumbers(suggested, after)).toBeLessThan(0);
    }
  });

  it("never returns an existing neighbour", () => {
    for (const [before, after] of pairs.slice(0, 500)) {
      const suggested = suggestScreenNumber(before, after);
      expect(suggested).not.toBe(before);
      expect(suggested).not.toBe(after);
    }
  });
});

describe("nested inserts", () => {
  it("keeps inserting right after the same screen, and the order never breaks", () => {
    let numbers = ["213", "214"];
    for (let i = 0; i < 25; i++) {
      // Always insert directly after 213: the worst case, every insert halves the same gap.
      numbers = [
        numbers[0],
        suggestScreenNumber(numbers[0], numbers[1]),
        ...numbers.slice(1),
      ];
    }
    for (let i = 1; i < numbers.length; i++) {
      expect(compareScreenNumbers(numbers[i - 1], numbers[i])).toBeLessThan(0);
    }
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("only runs out after about thirty nested inserts at one exact point, and says so", () => {
    // The worst case: every insert goes directly after the same screen, halving the same gap.
    // Measured: 31 fit with 12 decimals. Real editing never comes close, and when it does the
    // owner gets a clear error (in the testing stage the numbers can be tidied).
    let after = "214";
    let inserts = 0;
    expect(() => {
      for (;;) {
        after = suggestScreenNumber("213", after);
        inserts++;
        if (inserts > 200) throw new Error("never ran out");
      }
    }).toThrow(/No room/);
    expect(inserts).toBeGreaterThanOrEqual(25);
    expect(inserts).toBeLessThanOrEqual(40);
    expect(MAX_SCREEN_NUMBER_DECIMALS).toBe(12);
  });

  it("inserting after the last-inserted screen (the usual way) goes on for a long time", () => {
    // 213 -> 213.010 -> 213.020 ...: each insert follows the previous one, so gaps are not halved.
    let last = "213";
    for (let i = 0; i < 98; i++) last = suggestScreenNumber(last, "214");
    expect(last).toBe("213.980");
    for (let i = 0; i < 10; i++) last = suggestScreenNumber(last, "214");
    expect(compareScreenNumbers(last, "214")).toBeLessThan(0);
  });
});
