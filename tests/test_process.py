"""Unit tests for ``process`` module."""

from datetime import date, datetime

import pytest

from olympic_coast_treks.process import (
    analyze_route_on_day,
    calc_possible_campsites,
    get_locations,
    get_restrictions,
)


def test_get_locations():
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
