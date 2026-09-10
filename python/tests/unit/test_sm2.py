import pytest
from flashmd.sm2.algorithm import SM2Progress, calculate

FRESH = SM2Progress()


@pytest.mark.parametrize(
    "ef,interval,reps,last,rating,expected_interval,expected_ef", [
        # Fixed cadences apply from the very first review, whatever came before.
        (2.5, 0, 0, None, 3, 1, 2.36),
        (2.5, 0, 0, None, 4, 2, 2.5),
        (2.5, 0, 0, None, 5, 4, 2.6),
        (2.5, 3720, 9, 4, 4, 2, 2.5),
        (2.5, 3720, 9, 4, 3, 1, 2.36),
        # Easy compounds only when the previous review was also Easy.
        (2.6, 4, 1, 5, 5, 11, 2.7),
        (2.6, 4, 1, 4, 5, 4, 2.7),
        (1.3, 100, 9, 5, 3, 1, 1.3),
        # A lapse resets to tomorrow from any interval.
        (2.5, 270, 6, 5, 1, 1, 1.96),
        (2.5, 270, 6, 5, 2, 1, 2.18),
    ])
def test_scheduler_examples(ef, interval, reps, last, rating,
                            expected_interval, expected_ef):
    p = SM2Progress(easiness=ef, interval=interval, repetitions=reps,
                    last_rating=last)
    result = calculate(p, rating)
    assert result.interval == expected_interval
    assert abs(result.easiness - expected_ef) < 0.01


def test_hard_is_always_tomorrow_and_good_always_two_days():
    hard = good = FRESH
    for _ in range(6):
        hard = calculate(hard, 3)
        good = calculate(good, 4)
        assert hard.interval == 1
        assert good.interval == 2


def test_rating_takes_effect_immediately():
    hard = calculate(FRESH, 3)
    assert calculate(hard, 4).interval == 2
    assert calculate(hard, 5).interval == 4


def test_easy_enters_at_four_days_then_compounds():
    s = FRESH
    seq = []
    for _ in range(6):
        s = calculate(s, 5)
        seq.append(s.interval)
    assert seq == [4, 11, 31, 90, 270, 837]


def test_dropping_off_easy_and_back_on_restarts_at_entry_value():
    s = calculate(calculate(FRESH, 5), 5)
    assert s.interval == 11
    s = calculate(s, 4)
    assert s.interval == 2
    assert calculate(s, 5).interval == 4


def test_zero_interval_on_easy_row_cannot_schedule_zero_days():
    assert calculate(SM2Progress(2.5, 0, 3, 5), 5).interval == 4


def test_rating_below_3_resets_reps():
    result = calculate(SM2Progress(2.5, 20, 3, 4), 1)
    assert result.repetitions == 0
    assert result.interval == 1


def test_rating_below_3_resets_reps_for_rating_2():
    result = calculate(SM2Progress(2.5, 10, 5, 5), 2)
    assert result.repetitions == 0
    assert result.interval == 1


def test_repetitions_count_non_lapsed_reviews_not_easy_streaks():
    assert calculate(SM2Progress(2.5, 6, 2, 4), 4).repetitions == 3
    assert calculate(SM2Progress(2.5, 6, 2, 5), 3).repetitions == 3


def test_last_rating_is_carried_into_the_result():
    assert calculate(FRESH, 5).last_rating == 5
    assert calculate(FRESH, 1).last_rating == 1


def test_ef_never_below_1_3():
    assert calculate(SM2Progress(1.3, 6, 2), 1).easiness >= 1.3


def test_easy_interval_rounds_half_up_like_js_and_kotlin():
    # 2 * 2.25 == 4.5, where the builtin banker's round() returns 4 while JS
    # Math.round and Kotlin Math.round both return 5. Parity across the three
    # implementations is what keeps the sync loop from churning.
    assert round(4.5) == 4, "guard: this test is pointless if round() is half-up"
    assert calculate(SM2Progress(2.15, 2, 3, 5), 5).interval == 5


def test_invalid_rating_raises():
    with pytest.raises(ValueError):
        calculate(FRESH, 0)
    with pytest.raises(ValueError):
        calculate(FRESH, 6)
