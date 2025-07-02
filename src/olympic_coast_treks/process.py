"""Code for processing routes."""

import itertools
from datetime import date, datetime, timedelta
from typing import Literal

import polars as pl

from .data import LOCATIONS, RESTRICTIONS
from .tides import get_tide_levels


def calc_routes(
    start_date: date,
    end_date: date,
    section: Literal["south", "middle", "north"],
    direction: Literal["north", "south"] = "north",
    min_daily_distance: float = 3.0,
    max_daily_distance: float = 10.0,
    speed: float = 1.0,
    min_buffer: float = 2.0,
) -> pl.DataFrame:
    """Calculate possible routes.

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
        recommended to use a value of ``2`` feet or more.

    Returns
    -------
    DataFrame
        Polars DataFrame. Each row indicates a time window where travel is
        possible between two locations. The columns are as follows:
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
    if max_daily_distance < min_daily_distance:
        raise ValueError(
            "The maximum daily distance is less than the minimum daily "
            "distance"
        )
    if speed <= 0:
        raise ValueError("The hiking speed must be a positive number")
    if direction not in ["north", "south"]:
        raise ValueError("``direction`` must be either 'north' or 'south'")
    if end_date <= start_date:
        raise ValueError("``end_date`` must be after ``start_date``")
    locations = get_locations(section=section, direction=direction)
    restrictions = get_restrictions(section=section, direction=direction)
    nights = (end_date - start_date).days
    campsite_lists = calc_possible_campsites(
        locations=locations,
        nights=nights,
        min_daily_distance=min_daily_distance,
        max_daily_distance=max_daily_distance,
    )
    empty_res = pl.DataFrame(
        [],
        schema={
            "campsite_combination": int,
            "date": date,
            "start_location": str,
            "end_location": str,
            "first_possible_start": datetime,
            "last_possible_start": datetime,
            "first_possible_end": datetime,
            "last_possible_end": datetime,
        },
    )
    if not campsite_lists:
        return empty_res
    valid_schedules = []
    for campsite_list_index, campsite_list in enumerate(campsite_lists):
        stops = (
            [locations["name"][0]]
            + list(campsite_list)
            + [locations["name"][-1]]
        )
        schedules_per_day = []
        for idx in range(len(stops) - 1):
            start_location = stops[idx]
            end_location = stops[idx + 1]
            day = start_date + timedelta(days=idx)
            res = analyze_route_on_day(
                start_location=start_location,
                end_location=end_location,
                day=day,
                locations=locations,
                restrictions=restrictions,
                speed=speed,
                min_buffer=min_buffer,
            )
            if res.is_empty():
                break
            schedules_per_day.append(res)
        if len(schedules_per_day) == len(stops) - 1:
            valid_schedules.append(
                pl.concat(schedules_per_day).with_columns(
                    pl.lit(campsite_list_index).alias("campsite_combination"),
                )
            )
    if valid_schedules:
        sort_columns = ["campsite_combination", "date"]
        return (
            pl.concat(valid_schedules)
            .sort(*sort_columns)
            .select(
                [
                    *sort_columns,
                    "start_location",
                    "end_location",
                    pl.all().exclude(
                        sort_columns + ["start_location", "end_location"]
                    ),
                ]
            )
        )
    else:
        return empty_res


def analyze_route_on_day(
    start_location: str,
    end_location: str,
    day: date,
    locations: pl.DataFrame,
    restrictions: pl.DataFrame,
    speed: float,
    min_buffer: float = 2.0,
) -> pl.DataFrame:
    """Analyze the the specified route on the specified day.

    Parameters
    ----------
    start_location : str
        Starting location. Must be one of the locations in ``locations``.
    end_location : str
        Ending location. Must be on the locations in ``locations``.
    day : date
        The day to consider. Must be contained in ``tides``.
    locations : DataFrame
        Polars DataFrame with location information, as returned by
        ``get_locations``.
    restrictions : DataFrame
        Tidal restrictions along the route, as returned by
        ``get_restrictions``.
    speed : float
        The hiking speed (in miles per hour). ``1`` mile per hour is a
        reasonable expectation given the rocky terrain along the coast.
    min_buffer : float
        The minimum allowable buffer in feet between the tidal restriction and
        the tide level. Because tide predictions are imprecise, it is
        recommended to use a value of ``2`` feet or more.

    Returns
    -------
    DataFrame
        Polars DataFrame. A DataFrame of possible start and end time intervals.
        For each row, travel is possible if it starts between the values
        in the ``first_possible_start`` and the ``last_possible_start``
        columns. The corresponding end times are given by the
        ``first_possible_end`` and ``last_possible_end`` columns based on the
        input speed. The start location, end location, and date are also
        included as the ``start_location``, ``end_location``, and ``date``
        columns, respectively.
    """
    tides = get_tide_levels(day=day).filter(pl.col("is_light"))
    start_id = (
        locations.filter(pl.col("name") == start_location).select("id").item()
    )
    end_id = (
        locations.filter(pl.col("name") == end_location).select("id").item()
    )
    locations = locations.filter(pl.col("id").is_between(start_id, end_id))
    first_distance = locations["distance_miles"].first()
    last_distance = locations["distance_miles"].last()
    restrictions = restrictions.filter(
        (pl.col("end_miles") >= first_distance)
        & (pl.col("start_miles") <= last_distance)
    ).with_columns(
        ((pl.col("start_miles") - first_distance) / speed).alias(
            "start_travel_time_hr"
        ),
        ((pl.col("end_miles") - first_distance) / speed).alias(
            "end_travel_time_hr"
        ),
    )
    possible_times = []
    for start_time in tides["timestamp"]:
        end_time = start_time + timedelta(
            hours=(last_distance - first_distance) / speed
        )
        if end_time > tides["timestamp"].last():
            continue
        daily_tides = tides.filter(
            tides["timestamp"].is_between(start_time, end_time)
        ).with_columns(
            (
                (pl.col("timestamp") - start_time).dt.total_minutes() / 60.0
            ).alias("travel_time_hr")
        )
        tides_and_restrictions = (
            daily_tides.lazy()
            .join(restrictions.lazy(), how="cross")
            .filter(
                pl.col("travel_time_hr").is_between(
                    pl.col("start_travel_time_hr"),
                    pl.col("end_travel_time_hr"),
                )
            )
            .group_by("travel_time_hr", maintain_order=True)
            .agg(
                pl.col("restriction_ft").min(),
                pl.col("headland_alternative").all(),
                pl.col("height_ft").max(),
            )
            .select(
                [
                    "travel_time_hr",
                    "restriction_ft",
                    "headland_alternative",
                    "height_ft",
                ]
            )
            .collect()
        )
        tides_and_restrictions = tides_and_restrictions.with_columns(
            (
                (pl.col("height_ft") + min_buffer < pl.col("restriction_ft"))
                | pl.col("headland_alternative")
            ).alias("passable")
        )
        possible_times.append(
            {
                "start_time": start_time,
                "end_time": end_time,
                "passable": tides_and_restrictions["passable"].all(),
            }
        )
    if not possible_times:
        return pl.DataFrame(
            [],
            schema={
                "first_possible_start": datetime,
                "last_possible_start": datetime,
                "first_possible_end": datetime,
                "last_possible_end": datetime,
                "start_location": str,
                "end_location": str,
                "date": date,
            },
        )
    possible_times = (
        pl.DataFrame(possible_times)
        .with_columns(pl.col("passable").rle_id().alias("run_id"))
        .filter(pl.col("passable"))
    )
    res = possible_times.group_by("run_id").agg(
        pl.col("start_time").min().alias("first_possible_start"),
        pl.col("start_time").max().alias("last_possible_start"),
        pl.col("end_time").min().alias("first_possible_end"),
        pl.col("end_time").max().alias("last_possible_end"),
    )
    res = res.with_columns(
        pl.lit(start_location).alias("start_location"),
        pl.lit(end_location).alias("end_location"),
        pl.col("first_possible_start").dt.date().alias("date"),
    ).drop("run_id")
    return res


def get_locations(
    section: Literal["south", "middle", "north"],
    direction: Literal["north", "south"] = "north",
) -> pl.DataFrame:
    """Get the location information to aid calculations.

    Parameters
    ----------
    section : {'south', 'middle', 'north'}
        The section of the coast to hike. 'south' is the south coast, 'middle'
        is the south section of the north coast, and 'north' is the north
        section of the north coast.
    direction : {'north', 'south'}
        Direction of travel.

    Returns
    -------
    DataFrame
        Polars DataFrame with the following columns:
        * ``id``: int
            A unique ID assigned to this location.
        * ``campsite`` : bool
            Whether a location has a campsite
        * ``trailhead`` : bool
            Whether a location is a trailhead
        * ``distance_miles`` : float
            Distance from southernmost terminus
    """
    if section not in LOCATIONS:
        raise ValueError(f"``section`` must be in {list(LOCATIONS.keys())}")
    if direction not in ["south", "north"]:
        raise ValueError(f"``direction`` must be 'north' or 'south'")
    locations = pl.DataFrame(LOCATIONS[section])
    # Distances are given from south to north
    # Reverse these if traveling north to south
    if direction == "south":
        locations = locations.reverse()
        locations = locations.with_columns(
            pl.col("distance_miles").max() - pl.col("distance_miles")
        )
    return locations.with_row_index("id")


def get_restrictions(
    section: Literal["south", "middle", "north"],
    direction: Literal["north", "south"] = "north",
) -> pl.DataFrame:
    """Get the location information to aid calculations.

    Parameters
    ----------
    section : {'south', 'middle', 'north'}
        The section of the coast to hike. 'south' is the south coast, 'middle'
        is the south section of the north coast, and 'north' is the north
        section of the north coast.
    direction : {'north', 'south'}
        Direction of travel.

    Returns
    -------
    DataFrame
        Polars DataFrame with the following columns:
        * ``restriction_ft`` : float
            The restriction in feet. Gives the tidal level above which which
            this restriction is not passable.
        * ``start_miles`` : float
            The distance at which this restriction starts in miles. Measured
            from the start of the hike along the direction of travel.
        * ``end_miles`` : float
            The distance at which this restriction ends in miles. Measured
            from the start of the hike along the direction of travel.
        * ``headland_alternative`` : bool
            Whether a headland alternative exists to bypass the tidal
            restriction.
    """
    if section not in RESTRICTIONS:
        raise ValueError(f"``section`` must be in {list(RESTRICTIONS.keys())}")
    if direction not in ["south", "north"]:
        raise ValueError(f"``direction`` must be 'north' or 'south'")
    restrictions = pl.DataFrame(RESTRICTIONS[section])
    # Restrictions are given from south to north
    # Reverse these if traveling north to south
    if direction == "south":
        max_distance = get_locations(section=section, direction=direction)[
            "distance_miles"
        ].max()
        restrictions = restrictions.select(
            pl.exclude(["start_miles", "end_miles"]),
            (max_distance - pl.col("start_miles")).alias("end_miles"),
            (max_distance - pl.col("end_miles")).alias("start_miles"),
        ).sort("start_miles")
    return restrictions


def calc_possible_campsites(
    locations: pl.DataFrame,
    nights: int,
    min_daily_distance: float,
    max_daily_distance: float,
) -> list[tuple]:
    """Calculate possible campsites.

    Parameters
    ----------
    locations : DataFrame
        Location information from ``get_locations``.
    nights : int
        The number of nights to camp.
    min_daily_distance : float
        The minimum distance to travel in a day, in miles.
    max_daily_distance : float
        The maximum distance to travel in a day, in miles.

    Returns
    -------
    list[tuple]
        A list of tuples, each tuple containing the possible campsites.
    """
    if nights < 1:
        raise ValueError("``nights`` must be at least 1")
    if min_daily_distance <= 0 or max_daily_distance <= 0:
        raise ValueError(
            "``min_daily_distance`` and ``max_daily_distance`` must both be "
            "positive"
        )
    if min_daily_distance > max_daily_distance:
        raise ValueError(
            "``min_daily_distance`` must be greater than "
            "``max_daily_distance``"
        )
    campsite_combinations = list(
        itertools.combinations(
            locations.filter(pl.col("campsite"))["name"], nights
        )
    )
    valid_campsites = []
    for campsites in campsite_combinations:
        filter_locations = locations.filter(
            pl.col("name").is_in(campsites) | pl.col("trailhead")
        )
        daily_distances = (
            filter_locations["distance_miles"]
            - filter_locations["distance_miles"].shift(1)
        ).drop_nulls()
        if daily_distances.is_between(
            min_daily_distance, max_daily_distance
        ).all():
            valid_campsites.append(campsites)
    return valid_campsites


if __name__ == "__main__":
    # print(
    #     calc_routes(
    #         start_date=date(2023, 5, 26),
    #         end_date=date(2023, 5, 29),
    #         section="middle",
    #         direction="south",
    #         min_daily_distance=3,
    #         max_daily_distance=10,
    #     )
    # )
    print(
        calc_routes(
            start_date=date(2024, 4, 13),
            end_date=date(2024, 4, 15),
            section="north",
            direction="north",
            min_daily_distance=3,
            max_daily_distance=10,
        )
    )
