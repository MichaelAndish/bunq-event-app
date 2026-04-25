.PHONY: install run stop logs

install:
	docker compose build

run:
	docker compose up

stop:
	docker compose down

logs:
	docker compose logs -f
