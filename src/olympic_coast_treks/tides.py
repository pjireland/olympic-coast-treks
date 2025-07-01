"""Functionality for fetching tide information."""

import os
from datetime import date

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

    Here, light is defined as being between sunrise and sunset. For efficiency,
    it is required that the input data all is on the same day.

    Parameters
    ----------
    ts : Series
        Polars Series of timestamps in local (Pacific) time. All timestamps are
        expected to fall on the same day.

    Returns
    -------
    Series
        Polars Series indicating if it is light (``True``) or dark (``False``)
        at each of the provided timestamps.
    """
    if ts.is_empty():
        return pl.Series("is_light", [], dtype=pl.Boolean)
    if ts.min().date() != ts.max().date():
        raise ValueError("All timestamps in ``ts`` should be on the same day")
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
    str_date = day.strftime("%Y%m%d")
    tides_resp = requests.get(
        "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
        params=dict(
            begin_date=str_date,
            end_date=str_date,
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
    tides_resp = tides_resp.json()
    if tides_resp.get("error", None) is not None:
        raise ValueError(tides_resp["error"]["message"])
    df = pl.DataFrame(tides_resp["predictions"])
    df = df.select(
        [
            pl.col("t").str.to_datetime().alias("timestamp"),
            pl.col("v").cast(pl.Float64).alias("height_ft"),
        ]
    )
    df = df.with_columns(is_light(df["timestamp"]))
    return df
