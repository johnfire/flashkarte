import pytest
from flashmd.sm2.algorithm import SM2Progress, calculate


@pytest.mark.parametrize("ef,interval,reps,rating,expected_interval,expected_ef", [
    (2.5, 0, 0, 4, 1,  2.5),
    (2.5, 1, 1, 4, 6,  2.5),
    (2.5, 6, 2, 4, 15, 2.5),
    (2.5, 6, 2, 3, 15, 2.36),
    (2.5, 6, 2, 1, 1,  1.96),
    (1.3, 6, 2, 3, 8,  1.3),
])
def test_sm2_examples(ef, interval, reps, rating, expected_interval, expected_ef):
    p = SM2Progress(easiness=ef, interval=interval, repetitions=reps)
    result = calculate(p, rating)
    assert result.interval == expected_interval
    assert abs(result.easiness - expected_ef) < 0.01


def test_rating_below_3_resets_reps():
    p = SM2Progress(easiness=2.5, interval=20, repetitions=3)
    result = calculate(p, 1)
    assert result.repetitions == 0
    assert result.interval == 1


def test_rating_below_3_resets_reps_for_rating_2():
    p = SM2Progress(easiness=2.5, interval=10, repetitions=5)
    result = calculate(p, 2)
    assert result.repetitions == 0
    assert result.interval == 1


def test_ef_never_below_1_3():
    p = SM2Progress(easiness=1.3, interval=6, repetitions=2)
    result = calculate(p, 1)
    assert result.easiness >= 1.3


def test_repetitions_increment_on_success():
    p = SM2Progress(easiness=2.5, interval=6, repetitions=2)
    result = calculate(p, 4)
    assert result.repetitions == 3


def test_invalid_rating_raises():
    p = SM2Progress()
    with pytest.raises(ValueError):
        calculate(p, 0)
    with pytest.raises(ValueError):
        calculate(p, 6)
