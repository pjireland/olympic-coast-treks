"""Unit tests for ``plot`` module."""

from datetime import datetime

import pytest

from olympic_coast_treks.plot import plot_tides_and_restrictions


def test_plot_tides_and_restrictions():
    with pytest.raises(ValueError):
        plot_tides_and_restrictions(
            start_location="Ozette Trailhead",
            end_location="Ozette Trailhead",
            start_time=datetime(year=2024, month=1, day=1, hour=1, minute=0),
            speed=1.0,
            min_buffer=1.0,
        )
    with pytest.raises(ValueError):
        plot_tides_and_restrictions(
            start_location="Invalid name",
            end_location="Ozette Trailhead",
            start_time=datetime(year=2024, month=1, day=1, hour=1, minute=0),
            speed=1.0,
            min_buffer=1.0,
        )
    with pytest.raises(ValueError):
        plot_tides_and_restrictions(
            start_location="Ozette Trailhead",
            end_location="Invalid name",
            start_time=datetime(year=2024, month=1, day=1, hour=1, minute=0),
            speed=1.0,
            min_buffer=1.0,
        )
    with pytest.raises(ValueError):
        plot_tides_and_restrictions(
            start_location="Ozette Trailhead",
            end_location="Cape Alava",
            start_time=datetime(year=2024, month=1, day=1, hour=1, minute=0),
            speed=0.0,
            min_buffer=1.0,
        )
    with pytest.raises(ValueError):
        plot_tides_and_restrictions(
            start_location="Ozette Trailhead",
            end_location="Cape Alava",
            start_time=datetime(year=2024, month=1, day=1, hour=1, minute=0),
            speed=1.0,
            min_buffer=-1.0,
        )
    # On different sections
    with pytest.raises(ValueError):
        plot_tides_and_restrictions(
            start_location="Ozette Trailhead",
            end_location="Oil City",
            start_time=datetime(year=2024, month=1, day=1, hour=1, minute=0),
            speed=1.0,
            min_buffer=-1.0,
        )
    plot_tides_and_restrictions(
        start_location="Point of Arches",
        end_location="Cape Alava",
        start_time=datetime(year=2025, month=7, day=4, hour=4, minute=0),
        speed=0.1,  # Go very slowly to handle edge case of multiple days
    )
    # Reverse direction and test
    plot_tides_and_restrictions(
        start_location="Cedar Creek",
        end_location="Sand Point",
        start_time=datetime(year=2025, month=7, day=4, hour=4, minute=0),
        speed=1.0,
    )
