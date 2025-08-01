"""Unit tests for ``tides`` module."""

from datetime import date

import polars as pl
import pytest
from numpy.testing import assert_almost_equal

from olympic_coast_treks.tides import get_tide_levels, is_light


def test_is_light():
    ts = pl.Series("ts", [], dtype=pl.Datetime)
    light_times = is_light(ts)
    assert light_times.is_empty()
    ts = pl.Series(
        "ts",
        [
            "2024-01-15 08:03:00",
            "2024-01-16 08:04:00",
            "2024-01-16 08:05:00",
        ],
    ).str.to_datetime()
    # Function requires all timestamps to be on the same day
    with pytest.raises(ValueError):
        is_light(ts)
    ts = pl.Series(
        "ts",
        [
            "2024-01-15 08:03:00",
            "2024-01-15 08:04:00",
            "2024-01-15 08:05:00",
        ],
    ).str.to_datetime()
    light_times = is_light(ts)
    assert light_times.equals(pl.Series([False, True, True]))


def test_get_tide_levels():
    levels = get_tide_levels(date(year=2025, month=3, day=1))
    assert len(levels) == 240
    assert levels.columns == ["timestamp", "height_ft", "is_light"]
    assert (~levels["is_light"][0:70]).all()
    assert levels["is_light"][71:181].all()
    assert (~levels["is_light"][182:]).all()
    assert_almost_equal(levels["height_ft"][1], 8.773, decimal=3)
    assert_almost_equal(levels["height_ft"].mean(), 4.82895, decimal=5)
    with pytest.raises(ValueError):
        get_tide_levels(date(year=3000, month=3, day=1))
