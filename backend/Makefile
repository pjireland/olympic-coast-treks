.PHONY: test style api

style:
	uv run ruff check . && uv run ruff format .

test:
	uv run pytest -v

api:
	uv run uvicorn olympic_coast_treks.api:app --reload
