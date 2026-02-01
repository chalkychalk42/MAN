# CLAUDE.md - Moltie Agent Network (MAN)

## Project Overview

AI-powered Solana memecoin wallet analysis platform. Monorepo with Next.js 14 frontend, Python FastAPI backend, PostgreSQL + Redis, LangGraph multi-agent system.

- **Frontend**: `frontend/` - Next.js 14, App Router, TypeScript, CSS Modules, React Flow, D3.js, Framer Motion, Zustand
- **Backend**: `backend/` - FastAPI, LangGraph agents, python-socketio, SQLAlchemy 2.0 async, Helius API
- **Infra**: `docker/` - Docker Compose (frontend, backend, postgres, redis)

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately -- don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Build & Run Commands

```bash
# Frontend
cd frontend && npm install && npm run dev     # Dev server on :3000
cd frontend && npm run build                  # Production build
cd frontend && npm run lint                   # Lint check
cd frontend && npx tsc --noEmit               # Type check

# Backend
cd backend && pip install -r requirements.txt
cd backend && uvicorn app.main:app --reload --port 8000
cd backend && pytest                          # Run tests
cd backend && alembic upgrade head            # Run migrations

# Docker (full stack)
cd docker && docker compose up                # All services
cd docker && docker compose down              # Stop all
```

## Code Conventions

- **CSS**: CSS Modules with camelCase classes. All colors/spacing via `--custom-properties` from `design-tokens.css`. No Tailwind.
- **React**: PascalCase components. Each component in its own folder: `Name/Name.tsx` + `Name.module.css` + `index.ts`
- **TypeScript**: Strict mode. Interfaces in `src/types/`. Zustand stores in `src/stores/`.
- **Python**: snake_case files/functions. PascalCase classes. Pydantic for all schemas. Async everywhere.
- **API**: REST versioned under `/api/v1/`. WebSocket events use `namespace:event` format (e.g. `agent:status`).
- **Database**: snake_case tables (plural) and columns. UUIDs for PKs. JSONB for flexible data. Alembic for migrations.
