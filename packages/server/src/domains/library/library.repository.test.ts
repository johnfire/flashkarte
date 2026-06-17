import { escapeLike } from "./library.repository";

describe("escapeLike (DATA-003)", () => {
  test("escapes ILIKE wildcards so a search term matches literally", () => {
    expect(escapeLike("%")).toBe("\\%");
    expect(escapeLike("_")).toBe("\\_");
    expect(escapeLike("a%b_c")).toBe("a\\%b\\_c");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
  });

  test("leaves ordinary terms unchanged", () => {
    expect(escapeLike("french verbs")).toBe("french verbs");
  });
});
