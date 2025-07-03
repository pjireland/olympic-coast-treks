.PHONY: test style

style:
	uv run ruff check . && uv run ruff format .

test:
	uv run pytest -v
