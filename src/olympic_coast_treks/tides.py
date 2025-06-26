"""Functionality for fetching tide information."""

import os
from datetime import date, timedelta

import diskcache
import polars as pl
import pytz
import requests
from astral import LocationInfo
from astral.sun import sun

tide_cache = diskcache.Cache(
    os.path.join(os.path.expanduser("~"), ".tide-cache")
)


def is_light(ts: pl.Series) -> pl.Series:
    """Is it light outside during the input timestamps?

    Here, light is defined as being between sunrise and sunset.

    Parameters
    ----------
    ts : Series
        Polars Series of timestamps in local (Pacific) time.

    Returns
    -------
    Series
        Polars Series indicating if it is light (``True``) or dark (``False``)
        at each of the provided timestamps.
    """
    city = LocationInfo(
        "La Push", "USA", "America/Los_Angeles", 47.9053, -124.626
    )
    pacific_tz = pytz.timezone("America/Los_Angeles")
    s = sun(city.observer, date=ts.min().date(), tzinfo=pacific_tz)
    sunrise, sunset = s["sunrise"].replace(tzinfo=None), s["sunset"].replace(
        tzinfo=None
    )
    return ((ts >= sunrise) & (ts <= sunset)).alias("is_light")


@tide_cache.memoize(expire=86_400)
def get_tide_levels(day: date) -> pl.DataFrame:
    """Get tide levels on a given data using the NOAA API.

    Also includes information on whether or not it is light outside.

    Parameters
    ----------
    day : date
        The day to consider.

    Returns
    -------
    DataFrame
        Polars DataFrame with the following columns:
        * ``timestamp`` : datetime
            The timestamp considered (in local time).
        * ``height_ft`` : float
            The predicted tidal height in feet.
        * ``is_light``: bool
            Whether or not it is light outside at the specified time.
    """
    tides_resp = requests.get(
        "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
        params=dict(
            begin_date=day.strftime("%Y%m%d"),
            end_date=(day + timedelta(days=1)).strftime("%Y%m%d"),
            product="predictions",
            datum="MLLW",
            units="english",
            time_zone="lst_ldt",
            # La Push station
            station="9442396",
            format="json",
        ),
    )
    if tides_resp.status_code != 200:
        raise ValueError(
            "Error getting tide information, status code: "
            f"{tides_resp.status_code}"
        )
    df = pl.DataFrame(tides_resp.json()["predictions"])
    df = df.select(
        [
            pl.col("t").str.to_datetime().alias("timestamp"),
            pl.col("v").cast(pl.Float64).alias("height_ft"),
        ]
    )
    df = df.with_columns(is_light(df["timestamp"]))
    return df
