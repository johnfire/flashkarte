import pytest
from flashmd.sm2.algorithm import SM2Progress, calculate

FRESH = SM2Progress()


@pytest.mark.parametrize(
    "ef,interval,reps,last,rating,expected_interval,expected_ef", [
        # Fixed cadences apply from the very first review, whatever came before.
        (2.5, 0, 0, None, 1, 0.5, 1.96),
        (2.5, 0, 0, None, 3, 1, 2.36),
        (2.5, 0, 0, None, 4, 3, 2.5),
        (2.5, 0, 0, None, 5, 7, 2.6),
        (2.5, 3720, 9, 4, 4, 3, 2.5),
        (2.5, 3720, 9, 4, 3, 1, 2.36),
        (1.3, 100, 9, 5, 3, 1, 1.3),
        # A lapse resets to twelve hours from any interval.
        (2.5, 270, 6, 5, 1, 0.5, 1.96),
        (2.5, 270, 6, 5, 2, 0.5, 2.18),
    ])
def test_scheduler_examples(ef, interval, reps, last, rating,
                            expected_interval, expected_ef):
    p = SM2Progress(easiness=ef, interval=interval, repetitions=reps,
                    last_rating=last)
    result = calculate(p, rating)
    assert result.interval == expected_interval
    assert abs(result.easiness - expected_ef) < 0.01


def test_four_ratings_always_use_their_fixed_intervals():
    hard = medium = good = perfect = FRESH
    for _ in range(6):
        hard = calculate(hard, 1)
        medium = calculate(medium, 3)
        good = calculate(good, 4)
        perfect = calculate(perfect, 5)
        assert hard.interval == 0.5
        assert medium.interval == 1
        assert good.interval == 3
        assert perfect.interval == 7


def test_rating_takes_effect_immediately():
    hard = calculate(FRESH, 1)
    assert calculate(hard, 3).interval == 1
    assert calculate(hard, 4).interval == 3
    assert calculate(hard, 5).interval == 7


def test_perfect_stays_at_one_week():
    s = FRESH
    seq = []
    for _ in range(6):
        s = calculate(s, 5)
        seq.append(s.interval)
    assert seq == [7, 7, 7, 7, 7, 7]


def test_rating_below_3_resets_reps():
    result = calculate(SM2Progress(2.5, 20, 3, 4), 1)
    assert result.repetitions == 0
    assert result.interval == 0.5


def test_rating_below_3_resets_reps_for_rating_2():
    result = calculate(SM2Progress(2.5, 10, 5, 5), 2)
    assert result.repetitions == 0
    assert result.interval == 0.5


def test_repetitions_count_non_lapsed_reviews_not_easy_streaks():
    assert calculate(SM2Progress(2.5, 6, 2, 4), 4).repetitions == 3
    assert calculate(SM2Progress(2.5, 6, 2, 5), 3).repetitions == 3


def test_last_rating_is_carried_into_the_result():
    assert calculate(FRESH, 5).last_rating == 5
    assert calculate(FRESH, 1).last_rating == 1


def test_ef_never_below_1_3():
    assert calculate(SM2Progress(1.3, 6, 2), 1).easiness >= 1.3


def test_invalid_rating_raises():
    with pytest.raises(ValueError):
        calculate(FRESH, 0)
    with pytest.raises(ValueError):
        calculate(FRESH, 6)
