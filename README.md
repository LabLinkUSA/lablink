# LabLink


## Structure
LabLink is a managed donation marketplace for surplus scientific and clinical equipment. This repository now includes a greenfield implementation scaffold aligned to `docs/PRD.md`:

- `frontend/`: Next.js App Router application with public browse flows plus donor, recipient, and admin dashboards
- `backend/`: FastAPI service with Pydantic schemas, seeded demo data, and REST endpoints
- `database/`: PostgreSQL schema and Supabase policy scaffolding
- `infrastructure/`: deployment notes and environment template placeholders
- `shared/`: cross-project demo seed data

## Local Development/Onboarding

### Prerequisites
Prereqs before running the project locally: 
- make
- python3
- npm and Node.js

To confirm prereqs are installed:
```bash
node -v
npm -v
python3 --version
make --version
```

Notes: 
- Installing Node.js includes npm. 
- The project setup command will create its own Python virtual environment for the backend so you do not need to create one manually before running make setup. 

### Project setup steps 
1. make setup 

  - installs the frontend dependencies and creates `backend/.venv` with the backend package installed in editable mode.

2. make dev-backend (in new terminal) --> runs backend
3. make dev-frontend (in new terminal) --> runs frontend

### Frontend Commands
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### Backend Commands
1. `cd backend`
2. `python -m venv .venv && source .venv/bin/activate`
3. `pip install -e .`
4. `uvicorn app.main:app --reload`

### Handy root commands
For local development, point the frontend API base URL at `http://127.0.0.1:8000/api/v1` so the browser and backend use the same loopback host consistently.
