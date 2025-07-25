"""Unit test for API module."""

from datetime import date, datetime

import polars as pl
from fastapi.testclient import TestClient

from olympic_coast_treks.api import app

client = TestClient(app)


def test_get_health():
    assert client.get("/health").json()["status"] == "healthy"


def test_get_plot():
    # Valid input
    resp = client.get(
        "/plot",
        params={
            "start_location": "Ozette Trailhead",
            "end_location": "Norwegian Memorial",
            "start_time": datetime(
                year=2024, month=4, day=13, hour=8, minute=0
            ),
            "speed": 1.0,
        },
    )
    assert resp.status_code == 200
    assert "data" in resp.json()
    assert "layout" in resp.json()
    # Invalid input
    resp = client.get(
        "/plot",
        params={
            "start_location": "Cape Alava",
            "end_location": "Sand Point",
            "start_time": datetime(
                year=2024, month=4, day=13, hour=8, minute=0
            ),
            "speed": 1.0,
        },
    )
    assert resp.json()["detail"] == (
        "The start location and end location must be in the same section"
    )


def test_get_routes():
    # Valid route
    resp = client.get(
        "/routes",
        params={
            "section": "south",
            "direction": "north",
            "start_date": date(year=2024, month=4, day=13),
            "end_date": date(year=2024, month=4, day=15),
        },
    )
    df = pl.DataFrame(resp.json())
    assert len(df) == 9
    # Too slow to be a valid route
    resp = client.get(
        "/routes",
        params={
            "section": "south",
            "direction": "north",
            "start_date": date(year=2024, month=4, day=13),
            "end_date": date(year=2024, month=4, day=15),
            "speed": 0.1,
        },
    )
    assert resp.json() == []
    # Invalid input
    resp = client.get(
        "/routes",
        params={
            "section": "south",
            "direction": "north",
            "start_date": date(year=2024, month=4, day=13),
            "end_date": date(year=2024, month=4, day=15),
            "min_daily_distance": -1,
        },
    )
    assert resp.json()["detail"] == (
        "``min_daily_distance`` and ``max_daily_distance`` must both be "
        "positive"
    )
