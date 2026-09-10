import math
from dataclasses import dataclass
from typing import Optional

# Days until the next review, per rating. Easy is only the entry value.
LAPSE_INTERVAL = 1
HARD_INTERVAL = 1
GOOD_INTERVAL = 2
EASY_ENTRY_INTERVAL = 4

MIN_EASINESS = 1.3


@dataclass
class SM2Progress:
    easiness: float = 2.5
    interval: int = 0
    repetitions: int = 0
    last_rating: Optional[int] = None


@dataclass
class SM2Result:
    easiness: float
    interval: int
    repetitions: int
    last_rating: int


def _round_half_up(value: float) -> int:
    """
    Python's round() is banker's rounding: round(5.5) == 6 but round(4.5) == 4.
    JS Math.round and Kotlin Math.round are both half-up, so using the builtin
    here would let the three implementations disagree on an exact .5 interval
    and churn the sync loop forever. Match them explicitly.
    """
    return math.floor(value + 0.5)


def calculate(progress: SM2Progress, rating: int) -> SM2Result:
    """
    Flashkarte's scheduler: fixed cadences for Again/Hard/Good, compounding for
    Easy. rating must be 1–5 (1–2 Again, 3 Hard, 4 Good, 5 Easy).

    Unlike textbook SM-2, a rating takes effect on the interval it is given for,
    not the one after: Hard always means tomorrow and Good always means two days,
    whatever the card did before. Only a card that stays on Easy compounds, and
    it compounds by the easiness this review just produced.

    repetitions still counts consecutive non-lapsed reviews — the `learned` deck
    stat filters on it, so it must not be repurposed as an Easy streak. Staying
    on Easy is detected via last_rating instead.

    Kept identical in packages/shared/src/sm2/sm2.ts and Kotlin Sm2Algorithm.
    """
    if not 1 <= rating <= 5:
        raise ValueError(f"Rating must be 1–5, got {rating}")

    ef = progress.easiness + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    easiness = round(max(MIN_EASINESS, ef), 6)

    if rating < 3:
        return SM2Result(
            easiness=easiness,
            interval=LAPSE_INTERVAL,
            repetitions=0,
            last_rating=rating,
        )

    if rating == 3:
        interval = HARD_INTERVAL
    elif rating == 4:
        interval = GOOD_INTERVAL
    else:
        # Entering Easy from any other level restarts at the entry value; only an
        # Easy-after-Easy compounds. Guard the interval so a corrupt or zero row
        # can't schedule a card at 0 days and wedge it as permanently due.
        stayed_on_easy = progress.last_rating == 5 and progress.interval > 0
        interval = (
            _round_half_up(progress.interval * easiness)
            if stayed_on_easy
            else EASY_ENTRY_INTERVAL
        )

    return SM2Result(
        easiness=easiness,
        interval=interval,
        repetitions=progress.repetitions + 1,
        last_rating=rating,
    )
