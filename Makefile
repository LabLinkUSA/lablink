SHELL := /bin/zsh

.PHONY: setup setup-frontend setup-backend dev-frontend dev-backend

setup: setup-frontend setup-backend

setup-frontend:
	cd frontend && npm install

setup-backend:
	cd backend && python3 -m venv .venv
	cd backend && . .venv/bin/activate && pip install --upgrade pip && pip install -e .

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --reload-dir app --reload-exclude '.venv/*' --reload-exclude 'lablink_backend.egg-info/*' --reload-exclude '__pycache__/*'
