"""Unit tests for ``process`` module."""

from datetime import date, datetime

import pytest
import polars as pl

from olympic_coast_treks.process import (
    analyze_route_on_day,
    calc_possible_campsites,
    calc_routes,
    get_locations,
    get_restrictions,
)


def test_get_locations():
    with pytest.raises(ValueError):
        get_locations(section="asdf", direction="south")
    with pytest.raises(ValueError):
        get_locations(section="south", direction="asdf")
    for section in ["south", "middle", "north"]:
        res = {}
        for direction in ["south", "north"]:
            res[direction] = get_locations(
                section=section, direction=direction
            )
            assert set(res[direction].columns) == {
                "id",
                "name",
                "distance_miles",
                "campsite",
                "trailhead",
            }
            assert res[direction]["trailhead"][0]
            assert res[direction]["trailhead"][-1]
            assert res[direction]["distance_miles"].is_sorted()
        assert len(res["south"]) == len(res["north"])
        assert (
            res["south"]["distance_miles"][-1]
            == res["north"]["distance_miles"][-1]
        )
        assert (
            res["south"]["distance_miles"][0]
            == res["north"]["distance_miles"][0]
        )


def test_get_restrictions():
    with pytest.raises(ValueError):
        get_restrictions(section="asdf", direction="south")
    with pytest.raises(ValueError):
        get_restrictions(section="south", direction="asdf")
    for section in ["south", "middle", "north"]:
        res = {}
        for direction in ["south", "north"]:
            res[direction] = get_restrictions(
                section=section, direction=direction
            )
            assert set(res[direction].columns) == {
                "restriction_ft",
                "start_miles",
                "end_miles",
                "headland_alternative",
            }
            assert res[direction]["start_miles"].is_sorted()
            assert res[direction]["end_miles"].is_sorted()
        assert len(res["south"]) == len(res["north"])


def test_calc_possible_campsites():
    locations = get_locations(section="south", direction="north")
    for nights in [-1, 0]:
        with pytest.raises(ValueError):
            calc_possible_campsites(
                locations=locations,
                nights=nights,
                min_daily_distance=5,
                max_daily_distance=10,
            )
    for min_daily_distance in [-1, 0, 11]:
        with pytest.raises(ValueError):
            calc_possible_campsites(
                locations=locations,
                nights=1,
                min_daily_distance=min_daily_distance,
                max_daily_distance=10,
            )
    for max_daily_distance in [-1, 0, 4]:
        with pytest.raises(ValueError):
            calc_possible_campsites(
                locations=locations,
                nights=1,
                min_daily_distance=5,
                max_daily_distance=max_daily_distance,
            )
    res = calc_possible_campsites(
        locations=locations,
        nights=2,
        min_daily_distance=3,
        max_daily_distance=10,
    )
    assert len(res) == 3
    assert res[0] == ("Mosquito Creek", "Toleak Point")
    assert res[1] == ("Mosquito Creek", "Strawberry Point")
    assert res[2] == ("Mosquito Creek", "Scott Creek")


def test_analyze_route_on_day():
    locations = get_locations(section="south", direction="north")
    restrictions = get_restrictions(section="south", direction="north")
    # Impossible to complete trip - going too slow
    res = analyze_route_on_day(
        start_location="Oil City",
        end_location="Mosquito Creek",
        day=date(2022, 9, 9),
        locations=locations,
        restrictions=restrictions,
        speed=0.01,
        min_buffer=0.0,
    )
    assert res.is_empty()
    assert set(res.columns) == {
        "first_possible_start",
        "last_possible_start",
        "first_possible_end",
        "last_possible_end",
        "start_location",
        "end_location",
        "date",
    }
    # Impossible to complete trip - tides too high
    res = analyze_route_on_day(
        start_location="Oil City",
        end_location="Mosquito Creek",
        day=date(2022, 9, 9),
        locations=locations,
        restrictions=restrictions,
        speed=1.0,
        min_buffer=0.0,
    )
    assert res.is_empty()
    assert set(res.columns) == {
        "first_possible_start",
        "last_possible_start",
        "first_possible_end",
        "last_possible_end",
        "start_location",
        "end_location",
        "date",
    }
    res = analyze_route_on_day(
        start_location="Oil City",
        end_location="Mosquito Creek",
        day=date(2022, 9, 9),
        locations=locations,
        restrictions=restrictions,
        speed=2.0,
        min_buffer=0.0,
    )
    assert len(res) == 2
    assert res["first_possible_start"][0] == datetime(
        year=2022, month=9, day=9, hour=6, minute=54
    )
    assert res["last_possible_start"][0] == datetime(
        year=2022, month=9, day=9, hour=7, minute=54
    )
    assert res["first_possible_start"][1] == datetime(
        year=2022, month=9, day=9, hour=16, minute=36
    )
    assert res["last_possible_start"][1] == datetime(
        year=2022, month=9, day=9, hour=16, minute=36
    )


def test_calc_routes():
    # This is a route I've done, so I know it works
    res = calc_routes(
        start_date=date(year=2024, month=4, day=13),
        end_date=date(year=2024, month=4, day=15),
        section="north",
        direction="north",
        speed=1.0,
        min_buffer=0.0,
        min_daily_distance=3,
        max_daily_distance=10,
    )
    # Always must start from Ozette TH
    assert list(
        res.group_by("campsite_combination").first()["start_location"].unique()
    ) == ["Ozette Trailhead"]
    # Always must end at Hatchery Road
    assert list(
        res.group_by("campsite_combination").last()["end_location"].unique()
    ) == ["Hatchery Road"]
    # Always must take 3 days
    assert list(
        res.group_by("campsite_combination")
        .agg(pl.col("date").n_unique().alias("unique_count"))["unique_count"]
        .unique()
    ) == [3]
    # Must always start where we ended the previous day
    assert list(
        res.unique(
            subset=[
                "campsite_combination",
                "date",
                "start_location",
                "end_location",
            ]
        )
        .sort(["campsite_combination", "date"])
        .group_by("campsite_combination")
        .agg(
            [
                pl.col("*"),
                (pl.col("end_location") == pl.col("start_location").shift(-1))
                .drop_nulls()
                .all()
                .alias("start_where_ended"),
            ]
        )["start_where_ended"]
        .unique()
    ) == [True]
    # Check that a route I did previously shows as a potential one
    assert (
        len(
            res.filter(
                (pl.col("start_location") == "Ozette Trailhead")
                & (pl.col("end_location") == "Seafield Creek")
                & (pl.col("date") == date(year=2024, month=4, day=13))
            )
        )
        > 0
    )
    assert (
        len(
            res.filter(
                (pl.col("start_location") == "Seafield Creek")
                & (pl.col("end_location") == "Point of Arches")
                & (pl.col("date") == date(year=2024, month=4, day=14))
            )
        )
        > 0
    )
    assert (
        len(
            res.filter(
                (pl.col("start_location") == "Point of Arches")
                & (pl.col("end_location") == "Hatchery Road")
                & (pl.col("date") == date(year=2024, month=4, day=15))
            )
        )
        > 0
    )
    # Regression test to make sure the route information stays constant
    assert len(res) == 27
    # This is another route I've done, so I know it works
    res = calc_routes(
        start_date=date(year=2023, month=5, day=26),
        end_date=date(year=2023, month=5, day=29),
        section="middle",
        direction="south",
        speed=1.0,
        min_buffer=0.0,
        min_daily_distance=3,
        max_daily_distance=10,
    )
    # Always must start from Ozette TH
    assert list(
        res.group_by("campsite_combination").first()["start_location"].unique()
    ) == ["Ozette Trailhead"]
    # Always must end at Hatchery Road
    assert list(
        res.group_by("campsite_combination").last()["end_location"].unique()
    ) == ["Rialto Beach"]
    # Always must take 4 days
    assert list(
        res.group_by("campsite_combination")
        .agg(pl.col("date").n_unique().alias("unique_count"))["unique_count"]
        .unique()
    ) == [4]
    # Must always start where we ended the previous day
    assert list(
        res.unique(
            subset=[
                "campsite_combination",
                "date",
                "start_location",
                "end_location",
            ]
        )
        .sort(["campsite_combination", "date"])
        .group_by("campsite_combination")
        .agg(
            [
                pl.col("*"),
                (pl.col("end_location") == pl.col("start_location").shift(-1))
                .drop_nulls()
                .all()
                .alias("start_where_ended"),
            ]
        )["start_where_ended"]
        .unique()
    ) == [True]
    # Check that a route I did previously shows as a potential one
    assert (
        len(
            res.filter(
                (pl.col("start_location") == "Ozette Trailhead")
                & (pl.col("end_location") == "Yellow Banks")
                & (pl.col("date") == date(year=2023, month=5, day=26))
            )
        )
        > 0
    )
    assert (
        len(
            res.filter(
                (pl.col("start_location") == "Yellow Banks")
                & (pl.col("end_location") == "Cedar Creek")
                & (pl.col("date") == date(year=2023, month=5, day=27))
            )
        )
        > 0
    )
    assert (
        len(
            res.filter(
                (pl.col("start_location") == "Cedar Creek")
                & (pl.col("end_location") == "Chilean Memorial")
                & (pl.col("date") == date(year=2023, month=5, day=28))
            )
        )
        > 0
    )
    assert (
        len(
            res.filter(
                (pl.col("start_location") == "Chilean Memorial")
                & (pl.col("end_location") == "Rialto Beach")
                & (pl.col("date") == date(year=2023, month=5, day=29))
            )
        )
        > 0
    )
    # Regression test to make sure the route information stays constant
    assert len(res) == 30
