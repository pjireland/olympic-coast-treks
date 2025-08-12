"""API for Olympic Coast Treks."""

import json
from datetime import date, datetime
from importlib.metadata import version
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .plot import plot_tides_and_restrictions
from .process import calc_routes

app = FastAPI(
    title="Olympic Coast Treks API", version=version("olympic-coast-treks")
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:5173",
        "https://olympic-coast-treks.web.app",
        "https://olympic-coast-treks.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PlotlyFigureResponse(BaseModel):
    data: list[dict]
    layout: dict


class Route(BaseModel):
    campsite_combination: int
    date: date
    start_location: str
    end_location: str
    distance: float
    first_possible_start: datetime
    last_possible_start: datetime
    first_possible_end: datetime
    last_possible_end: datetime


@app.get("/health")
def get_health():
    return {"status": "healthy"}


@app.get("/plot")
def get_plot(
    start_location: str, end_location: str, start_time: datetime, speed: float
) -> PlotlyFigureResponse:
    """Get a plot of tides and restrictions given route information.

    Parameters
    ----------
    start_location : str
        Starting location.
    end_location : str
        Ending location.
    start_time : datetime
        The time to start hiking.
    speed : float
        The hiking speed (in miles per hour). ``1`` mile per hour is a
        reasonable expectation given the rocky terrain along the coast.

    Returns
    -------
    list[dict]
        Each list element indicates a time window where travel is
        possible between two locations. The keys are as follows:
        * ``campsite_combination`` : int
            Unique identifier for a possible combination of campsites. Any
            selected route must all have the same value of
            ``campsite_combination``.
        * ``date`` : date
            The date for a given day in the trip.
        * ``start_location`` : str
            The start location for a given day in the trip.
        * ``end_location`` : str
            The end location for a given day in the trip.
        * ``first_possible_start`` : datetime
            The first possible starting time within a given window.
        * ``last_possible_start`` : datetime
            The last possible starting time within a given window.
        * ``first_possible_end`` : datetime
            The first possible ending time within a given window.
        * ``last_possible_end`` : datetime
            The last possible ending time within a given window.
    """
    try:
        fig = plot_tides_and_restrictions(
            start_location=start_location,
            end_location=end_location,
            start_time=start_time,
            speed=speed,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return json.loads(fig.to_json())


@app.get("/routes")
def get_routes(
    section: Literal["south", "middle", "north"],
    direction: Literal["north", "south"],
    start_date: date,
    end_date: date,
    min_daily_distance: float = 3.0,
    max_daily_distance: float = 10.0,
    speed: float = 1.0,
    min_buffer: float = 1.0,
) -> list[Route]:
    """Get possible routes.

    Parameters
    ----------
    start_date : str
        The first start date to consider.
    end_date : str
        The last end date to consider.
    section : {'south', 'middle', 'north'}
        The section of the coast to hike. 'south' is the south coast, 'middle'
        is the south section of the north coast, and 'north' is the north
        section of the north coast.
    direction : {'north', 'south'}
        The direction of travel.
    min_daily_distance : float
        The minimum distance to hike in a day in miles.
    max_daily_distance : float
        The maximum distance to hike in a day in miles. ``10`` miles is
        typically the maximum recommended distance in a day given the rocky
        terrain along the coast.
    speed : float
        The hiking speed (in miles per hour). ``1`` mile per hour is a
        reasonable expectation given the rocky terrain along the coast.
    min_buffer : float
        The minimum allowable buffer in feet between the tidal restriction and
        the tide level. Because tide predictions are imprecise, it is
        recommended to use a value of ``1`` foot or more.

    Returns
    -------
    list[dict]
        Each list element indicates a time window where travel is
        possible between two locations. The keys are as follows:
        * ``campsite_combination`` : int
            Unique identifier for a possible combination of campsites. Any
            selected route must all have the same value of
            ``campsite_combination``.
        * ``date`` : date
            The date for a given day in the trip.
        * ``start_location`` : str
            The start location for a given day in the trip.
        * ``end_location`` : str
            The end location for a given day in the trip.
        * ``first_possible_start`` : datetime
            The first possible starting time within a given window.
        * ``last_possible_start`` : datetime
            The last possible starting time within a given window.
        * ``first_possible_end`` : datetime
            The first possible ending time within a given window.
        * ``last_possible_end`` : datetime
            The last possible ending time within a given window.
    """
    try:
        routes = calc_routes(
            start_date=start_date,
            end_date=end_date,
            section=section,
            direction=direction,
            min_daily_distance=min_daily_distance,
            max_daily_distance=max_daily_distance,
            speed=speed,
            min_buffer=min_buffer,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    return [Route(**r) for r in routes.to_dicts()]
