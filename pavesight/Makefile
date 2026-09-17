.PHONY: up down build seed test logs

up:
	docker compose up --build

down:
	docker compose down

build:
	docker compose build

seed:
	docker compose run --rm backend python -m seed.seed_data

test:
	docker compose run --rm backend pytest

logs:
	docker compose logs -f
