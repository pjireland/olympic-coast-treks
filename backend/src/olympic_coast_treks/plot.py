"""Plotting functionality."""

from datetime import datetime, timedelta

import numpy as np
import plotly.graph_objects as go
import polars as pl
from plotly.subplots import make_subplots

from .data import LOCATIONS
from .process import get_locations, get_restrictions, get_tide_levels


def plot_tides_and_restrictions(
    start_location: str,
    end_location: str,
    start_time: datetime,
    speed: float,
) -> go.Figure:
    """Plot the tides and restrictions given route information.

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
    plotly.Figure
        Figure showing the route information, complete with distances, tides,
        and restrictions.
    """
    if speed <= 0:
        raise ValueError("The hiking speed must be a positive number")
    if start_location == end_location:
        raise ValueError("start and end locations must be different")
    locations = pl.concat(
        [
            pl.DataFrame(value).with_columns(pl.lit(key).alias("section"))
            for key, value in LOCATIONS.items()
        ]
    )
    filtered_locations = locations.filter(
        (pl.col("name") == start_location) | (pl.col("name") == end_location)
    )
    if len(filtered_locations) == 0:
        raise ValueError("Invalid start and end locations")
    if len(filtered_locations.filter(pl.col("name") == start_location)) == 0:
        raise ValueError("Invalid start location")
    if len(filtered_locations.filter(pl.col("name") == end_location)) == 0:
        raise ValueError("Invalid end location")
    section = filtered_locations.select(
        pl.col("section").mode().first()
    ).item()
    filtered_locations = filtered_locations.filter(
        pl.col("section") == section
    )
    if len(filtered_locations) < 2:
        raise ValueError(
            "The start location and end location must be in the same section"
        )
    assert len(filtered_locations) == 2
    if filtered_locations.item(0, "name") == start_location:
        direction = "north"
    else:
        direction = "south"
    locations = get_locations(section=section, direction=direction)
    start_id = (
        locations.filter(pl.col("name") == start_location).select("id").item()
    )
    end_id = (
        locations.filter(pl.col("name") == end_location).select("id").item()
    )
    locations = locations.filter(pl.col("id").is_between(start_id, end_id))
    first_distance = locations["distance_miles"].first()
    last_distance = locations["distance_miles"].last()
    locations = locations.with_columns(
        timestamp=start_time
        + pl.duration(
            minutes=60 * (pl.col("distance_miles") - first_distance) / speed
        )
    )
    restrictions = (
        get_restrictions(section=section, direction=direction)
        .filter(
            (pl.col("end_miles") >= first_distance)
            & (pl.col("start_miles") <= last_distance)
        )
        .with_columns(
            pl.col("start_miles").clip(lower_bound=first_distance),
            pl.col("end_miles").clip(upper_bound=last_distance),
        )
        .with_columns(
            start_time=start_time
            + pl.duration(
                minutes=60 * (pl.col("start_miles") - first_distance) / speed
            ),
            end_time=start_time
            + pl.duration(
                minutes=60 * (pl.col("end_miles") - first_distance) / speed
            ),
        )
    )
    end_time = start_time + timedelta(
        hours=(last_distance - first_distance) / speed
    )
    tides = []
    for tide_day in pl.date_range(
        start_time.date(), end_time.date(), "1d", eager=True
    ).to_list():
        tides.append(get_tide_levels(day=tide_day))
    # Include adjacent values in case we don't line up perfectly
    tides = pl.concat(tides).filter(
        pl.col("timestamp").is_between(
            start_time - timedelta(minutes=6),
            end_time + timedelta(minutes=6),
            closed="none",
        )
    )
    if restrictions.is_empty():
        xaxis_min = tides["height_ft"].min()
        xaxis_max = tides["height_ft"].max()
    else:
        xaxis_min = np.floor(
            min(tides["height_ft"].min(), restrictions["restriction_ft"].min())
        )
        xaxis_max = np.ceil(
            max(tides["height_ft"].max(), restrictions["restriction_ft"].max())
        )
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(
        go.Scatter(
            x=[xaxis_min] + tides["height_ft"].to_list() + 2 * [xaxis_min],
            y=[tides["timestamp"].min()]
            + tides["timestamp"].to_list()
            + [tides["timestamp"].max(), tides["timestamp"].min()],
            mode="lines",
            line_width=0,
            legendgroup="tides",
            name="Tide level",
            fill="toself",
        ),
        secondary_y=False,
    )
    fig.add_trace(
        go.Scatter(
            x=tides["height_ft"].to_list(),
            y=(
                (tides["timestamp"] - start_time).dt.total_seconds()
                * speed
                / 3600
            ).to_list(),
            showlegend=False,
            hoverinfo="skip",
            mode="lines",
            line_width=0,
        ),
        secondary_y=True,
    )
    # Give list of lists, showing when it starts and ends being dark
    night_ranges = (
        tides.with_row_index()
        .with_columns(pl.col("is_light").rle_id().alias("group"))
        .with_columns(
            [
                pl.col("index").first().over("group").alias("first_idx"),
                pl.col("index").last().over("group").alias("last_idx"),
            ]
        )
        .filter(
            (pl.col("index") == pl.col("first_idx"))
            | (pl.col("index") == pl.col("last_idx"))
        )
        .with_columns(
            ~pl.col("is_light").shift(-1).alias("is_not_light_next"),
            pl.col("timestamp").shift(-1).alias("next_timestamp"),
        )
        .filter(~pl.col("is_light") & pl.col("is_not_light_next"))
        .select(pl.col("timestamp"), pl.col("next_timestamp"))
        .to_numpy()
        .tolist()
    )
    idx = 0
    for start_timestamp_night, end_timestamp_night in night_ranges:
        fig.add_trace(
            go.Scatter(
                x=[xaxis_min, xaxis_min, xaxis_max, xaxis_max, xaxis_min],
                y=[
                    start_timestamp_night,
                    end_timestamp_night,
                    end_timestamp_night,
                    start_timestamp_night,
                    start_timestamp_night,
                ],
                fill="toself",
                mode="lines",
                line_width=0,
                fillcolor="rgba(128, 128, 128, 0.5)",
                legendgroup="night",
                name="After sunset and before sunrise",
                hovertemplate="",
                hoverinfo="name",
                hoverlabel_namelength=-1,
                showlegend=True if idx == 0 else False,
            )
        )
        idx += 1
    first_with_alternative = True
    first_without_alternative = True
    for row in restrictions.iter_rows(named=True):
        if first_with_alternative and row["headland_alternative"]:
            show_legend = True
        elif first_without_alternative and not row["headland_alternative"]:
            show_legend = True
        else:
            show_legend = False
        if not row["headland_alternative"]:
            name = (
                "Tide must be below this level. "
                "No alternative route available."
            )
        else:
            name = "Use inland alternative when tide is above this level."

        fig.add_trace(
            go.Scatter(
                x=[row["restriction_ft"]] * 2 + [xaxis_max, xaxis_max],
                y=[
                    row["start_time"],
                    row["end_time"],
                    row["end_time"],
                    row["start_time"],
                ],
                mode="lines",
                line_width=0,
                line_color=(
                    "#00CC96" if row["headland_alternative"] else "#EF553B"
                ),
                legendgroup=f"restrictions-{row['headland_alternative']}",
                name=name,
                fill="toself",
                showlegend=show_legend,
                fillpattern=dict(
                    shape="/" if row["headland_alternative"] else "x",
                    fillmode="overlay",
                ),
                hovertemplate="",
                hoverinfo="name",
                hoverlabel_namelength=-1,
            ),
            secondary_y=False,
        )
        if row["headland_alternative"]:
            first_with_alternative = False
        if not row["headland_alternative"]:
            first_without_alternative = False
    idx = 0
    ozette_idx = 0
    for location in locations.iter_rows(named=True):
        if idx == 0:
            if direction == "north":
                annotation_position = "top left"
            else:
                annotation_position = "bottom left"
        else:
            if direction == "north":
                annotation_position = (
                    "top left" if idx % 2 == 0 else "bottom left"
                )
            else:
                annotation_position = (
                    "bottom left" if idx % 2 == 0 else "top left"
                )
        fig.add_hline(
            y=location["distance_miles"] - first_distance,
            line_dash="dot",
            annotation_text=location["name"]
            + ("*" if "Ozette River" in location["name"] else ""),
            yref="y2",
            annotation_position=annotation_position,
        )
        if "Ozette River" in location["name"] and ozette_idx == 0:
            fig.update_layout(margin=dict(b=150))  # Increase bottom margin
            fig.add_annotation(
                text=(
                    '* From the National Park Service: "The Ozette River must '
                    "be forded. <br>"
                    "The crossing may be impossible in winter and can be "
                    "hazardous year<br>round at high tide and/or after heavy "
                    'rain. It is recommended to ford<br>at low tide."'
                ),
                xref="paper",
                yref="paper",
                x=0.0,
                y=-0.18,
                xanchor="left",
                yanchor="top",
                showarrow=False,
                font=dict(size=14, color="red"),
                align="left",
            )
            ozette_idx += 1
        idx += 1
    fig.update_yaxes(
        title="Local time",
        secondary_y=False,
        showgrid=False,
    )
    fig.update_yaxes(
        title="Distance (miles)",
        secondary_y=True,
        showgrid=False,
        zeroline=False,
        overlaying="y",
    )
    fig.update_xaxes(
        title="Level (feet)",
        range=[xaxis_min, xaxis_max],
        ticklabelstandoff=10,
    )
    fig.update_layout(
        legend=dict(yanchor="bottom", y=1.02, xanchor="left", x=0)
    )
    fig.update_yaxes(
        range=(
            [start_time, end_time]
            if direction == "north"
            else [end_time, start_time]
        ),
        ticklabelposition="outside left",
        ticklabelstandoff=5,
    )
    fig.update_yaxes(
        range=(
            [0, last_distance - first_distance]
            if direction == "north"
            else [last_distance - first_distance, 0]
        ),
        secondary_y=True,
    )
    return fig
