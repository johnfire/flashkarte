from dataclasses import dataclass
from typing import Optional

# Days until the next review, per rating.
HARD_INTERVAL = 0.5
MEDIUM_INTERVAL = 1.0
GOOD_INTERVAL = 3.0
PERFECT_INTERVAL = 7.0

MIN_EASINESS = 1.3


@dataclass
class SM2Progress:
    easiness: float = 2.5
    interval: float = 0.0
    repetitions: int = 0
    last_rating: Optional[int] = None


@dataclass
class SM2Result:
    easiness: float
    interval: float
    repetitions: int
    last_rating: int


def calculate(progress: SM2Progress, rating: int) -> SM2Result:
    """
    Flashkarte's scheduler: fixed cadences for Hard, Medium, Good, and Perfect.
    Rating must be 1–5; 1–2 are treated as Hard for compatibility with older
    clients and wrong-answer diagnostics.

    Unlike textbook SM-2, a rating takes effect on the interval it is given for,
    not the one after: every rating always uses its named cadence, whatever the
    card did before.

    Kept identical in packages/shared/src/sm2/sm2.ts and Kotlin Sm2Algorithm.
    """
    if not 1 <= rating <= 5:
        raise ValueError(f"Rating must be 1–5, got {rating}")

    ef = progress.easiness + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    easiness = round(max(MIN_EASINESS, ef), 6)

    if rating <= 2:
        return SM2Result(
            easiness=easiness,
            interval=HARD_INTERVAL,
            repetitions=0,
            last_rating=rating,
        )

    if rating == 3:
        interval = MEDIUM_INTERVAL
    elif rating == 4:
        interval = GOOD_INTERVAL
    else:
        interval = PERFECT_INTERVAL

    return SM2Result(
        easiness=easiness,
        interval=interval,
        repetitions=progress.repetitions + 1,
        last_rating=rating,
    )
