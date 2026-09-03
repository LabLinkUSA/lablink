SHELL := /bin/zsh

.PHONY: setup setup-frontend setup-backend setup-e2e dev-frontend dev-backend db-new db-push db-dry-run db-status test-backend test-e2e

setup: setup-frontend setup-backend setup-e2e

setup-frontend:
	cd frontend && npm install

setup-backend:
	cd backend && python3 -m venv .venv
	cd backend && . .venv/bin/activate && pip install --upgrade pip && pip install -e .

setup-e2e:
	cd e2e && npm install

front:
	cd frontend && npm run dev

back:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --reload-dir app --reload-exclude '.venv/*' --reload-exclude 'lablink_backend.egg-info/*' --reload-exclude '__pycache__/*'

db-new:
	@test -n "$(name)" || (echo 'Usage: make db-new name=<migration_name>' && exit 1)
	supabase migration new "$(name)"

db-push:
	supabase db push --yes

db-dry-run:
	supabase db push --dry-run

db-status:
	supabase migration list

test-backend:
	cd backend && . .venv/bin/activate && python -m pytest tests/ -v

test-e2e:
	cd e2e && npx playwright test --config=playwright.config.ts
