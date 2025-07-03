# Olympic Coast Treks

The `olympic-coast-treks` package provides a frontend (TODO) and backend
for planning multi-night backpacking treks along the the Olympic Coast
in Washington, taking into account route information, tide levels,
tidal restrictions, and sunrise and sunset times.

## Disclaimer

While this tool is designed to assist with planning, it is not intended to be a
replacement for more detailed analysis on the part of the hiker.
Any route suggestions provided should be checked against the latest maps,
tide tables, and any information provided by Olympic National Park,
the Ozette Indian Reservation, and the Makah Reservation.

Refer to the software license for information about use and liability.

## Planning routes

The simplest approach for planning routes is through the web interface (TODO).

## Backend development

We recommend using [`uv`](https://docs.astral.sh/uv/).

### Clone the package locally

```bash
git clone https://github.com/pjireland/olympic-coast-treks.git
```

Then navigate to the `backend` subdirectory within `olympic-coast-treks`.

### Set up environment

From within the `backend` subdirectory:
```bash
uv sync
```

### Run unit tests

From within the `backend` subdirectory:
```bash
make test
```

### Run style checks and fixes

From within the `backend` subdirectory:
```bash
make style
```

### Starting a local API

From within the `backend` subdirectory:
```bash
make api
```

API docs can be then be accessed via http://localhost:8000/docs.
