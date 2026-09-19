import * as apiModule from "../api";
import { resolveCardIds, resolveCardReferences } from "./card-references";

jest.mock("../api", () => ({ get: jest.fn() }));
const mockApi = apiModule as jest.Mocked<typeof apiModule>;

const DECK = "20000000-0000-4000-8000-000000000001";
const OTHER_DECK = "20000000-0000-4000-8000-000000000002";
const CARD_A = "30000000-0000-4000-8000-00000000000a";
const CARD_B = "30000000-0000-4000-8000-00000000000b";
const decks = new Map([
  [
    DECK,
    {
      cards: [
        { id: CARD_A, position: 0 },
        { id: CARD_B, position: 17 },
      ],
    },
  ],
]);

describe("resolveCardReferences", () => {
  it("passes a UUID straight through", () => {
    expect(resolveCardReferences([CARD_A], new Map())).toEqual([CARD_A]);
  });

  it("maps a card number to the card at position number minus one", () => {
    const ids = resolveCardReferences(
      [
        { deck_id: DECK, card_number: 1 },
        { deck_id: DECK, card_number: 18 },
      ],
      decks,
    );
    expect(ids).toEqual([CARD_A, CARD_B]);
  });

  it("removes duplicates, whichever way a card was named", () => {
    const ids = resolveCardReferences(
      [CARD_A, { deck_id: DECK, card_number: 1 }],
      decks,
    );
    expect(ids).toEqual([CARD_A]);
  });

  it("names the deck and number when a card does not exist", () => {
    expect(() =>
      resolveCardReferences([{ deck_id: DECK, card_number: 99 }], decks),
    ).toThrow(`Deck ${DECK} has no card number 99`);
    expect(() =>
      resolveCardReferences([{ deck_id: OTHER_DECK, card_number: 1 }], decks),
    ).toThrow(/no card number 1/);
  });
});

describe("resolveCardIds", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fetches each referenced deck once", async () => {
    mockApi.get.mockResolvedValue({
      cards: [
        { id: CARD_A, position: 0 },
        { id: CARD_B, position: 1 },
      ],
    });
    const ids = await resolveCardIds([
      { deck_id: DECK, card_number: 1 },
      { deck_id: DECK, card_number: 2 },
    ]);
    expect(ids).toEqual([CARD_A, CARD_B]);
    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith(`/api/decks/${DECK}`);
  });

  it("makes no request when only UUIDs or nothing are given", async () => {
    expect(await resolveCardIds([])).toEqual([]);
    expect(await resolveCardIds([CARD_A])).toEqual([CARD_A]);
    expect(mockApi.get).not.toHaveBeenCalled();
  });
});
