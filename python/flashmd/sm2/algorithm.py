from dataclasses import dataclass


@dataclass
class SM2Progress:
    easiness: float = 2.5
    interval: int = 0
    repetitions: int = 0


@dataclass
class SM2Result:
    easiness: float
    interval: int
    repetitions: int


def calculate(progress: SM2Progress, rating: int) -> SM2Result:
    """
    Pure SM-2 calculation. rating must be 1–5.
    Returns updated progress values (no DB side effects).

    Interval uses the OLD easiness before EF is updated.
    """
    if not 1 <= rating <= 5:
        raise ValueError(f"Rating must be 1–5, got {rating}")

    old_ef = progress.easiness
    reps = progress.repetitions
    prev_interval = progress.interval

    if rating < 3:
        new_interval = 1
        new_reps = 0
    else:
        if reps == 0:
            new_interval = 1
        elif reps == 1:
            new_interval = 6
        else:
            new_interval = round(prev_interval * old_ef)
        new_reps = reps + 1

    new_ef = old_ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    new_ef = max(1.3, new_ef)

    return SM2Result(
        easiness=round(new_ef, 6),
        interval=new_interval,
        repetitions=new_reps,
    )
