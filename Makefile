SHELL := /bin/zsh

.PHONY: setup setup-frontend setup-backend dev-frontend dev-backend db-new db-push db-dry-run db-status

setup: setup-frontend setup-backend

setup-frontend:
	cd frontend && npm install

setup-backend:
	cd backend && python3 -m venv .venv
	cd backend && . .venv/bin/activate && pip install --upgrade pip && pip install -e .

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
