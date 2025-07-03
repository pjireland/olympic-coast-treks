"""API for Olympic Coast Treks."""

from datetime import date, datetime
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .process import calc_routes

app = FastAPI(title="Olympic Coast Treks API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Route(BaseModel):
    campsite_combination: int
    date: date
    start_location: str
    end_location: str
    first_possible_start: datetime
    last_possible_start: datetime
    first_possible_end: datetime
    last_possible_end: datetime


@app.get("/health")
def get_health():
    return {"status": "healthy"}


@app.get("/routes")
def get_routes(
    section: Literal["south", "middle", "north"],
    direction: Literal["north", "south"],
    start_date: date,
    end_date: date,
    min_daily_distance: float = 3.0,
    max_daily_distance: float = 10.0,
    speed: float = 1.0,
    min_buffer: float = 2.0,
) -> list[Route]:
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
