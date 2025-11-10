# Template Explorer

Template Explorer is an interactive playground for designing, testing, and iterating on large-language-model (LLM) prompt templates. It pairs a React front end with a FastAPI + LlamaIndex backend so analysts can bind datasets, render templates, invoke models, parse responses, and persist results without writing bespoke glue code.

## Highlights

- Author templates with Monaco-powered editing, Jinja-style placeholders, and one-click previewing.
- Upload JSON/JSONL datasets, inspect records, and attach them as record-scoped or global-scoped bindings.
- Execute prompts against OpenAI, Anthropic, or Google models via LlamaIndex, tuning temperature and other params.
- Inspect raw and parsed outputs; choose raw passthrough, Pydantic-structured parsing, or custom Python snippets.
- Run batch jobs, track progress, and download augmented datasets or merged outputs back to storage.
- Save templates, datasets, and run results for later reuse directly on the filesystem workspace.

## Architecture

```
Frontend (Vite + React + Tailwind)
  ├─ TemplateEditor, DatasourceBinder, PromptPreview
  ├─ RunnerPanel with model + parser controls
  └─ ResultViewer & DatasetInspector for JSON/JSONL data

Backend (FastAPI + LlamaIndex)
  ├─ TemplateService: CRUD templates stored as JSON
  ├─ DatasetService: upload/list/download JSON/JSONL assets
  ├─ LLMService: render templates, invoke LLMs, run batch jobs
  └─ ParseService: raw, structured (Pydantic), or custom Python parsing
```

The backend persists assets under `backend/workspace/` by default (override with a `WORKSPACE` env var). Static assets from the front end can be served via the API or run separately during development.

## Backend Setup

Requirements:

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) for dependency management

Install dependencies and run the API:

```bash
uv sync
uv run uvicorn backend.main:app --reload
```

Environment:

- Place API credentials (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`) in `backend/workspace/.env` or the directory pointed to by `WORKSPACE`.
- Templates, datasets, and results are written under `templates/`, `datasets/`, and `results/` within the workspace.

### Key Endpoints

- `GET /api/templates`, `POST /api/templates`, `PUT /api/templates/{id}`, `DELETE /api/templates/{id}`
- `GET /api/datasets`, `POST /api/datasets`, `GET /api/datasets/{id}/{index}`
- `POST /api/llm/run` for single executions
- `POST /api/llm/batch`, `GET /api/jobs/{id}/status`, `GET /api/jobs/{id}/result`

All routes exchange JSON payloads that mirror the Pydantic models defined in `backend/main.py` (`Template`, `DatasetMeta`, `RunRequest`, etc.).

## Frontend Setup

Requirements:

- Node.js 18+

Install and start Vite dev server:

```bash
cd frontend
npm install
npm run dev
```

The UI uses React Query for data fetching, Zustand for lightweight global state, Tailwind + DaisyUI for styling, and Monaco Editor for template editing. Components of interest live under `frontend/src/components/`.

## Parsing Modes

1. **Raw** – Returns the model response unchanged.
2. **Structured** – Executes `structured_predict` with a user-provided Pydantic model definition.
3. **Custom Python** – Runs a user-supplied `parse(text: str) -> Any` helper (note: no sandboxing).

These modes are surfaced in the Runner Panel and enforced server-side by `ParseService`.

## Data Storage

By default, the backend writes to `backend/workspace/` (or `WORKSPACE` if set):

- `templates/*.json` – serialized template metadata and content.
- `datasets/*.json|*.jsonl|*.txt` – uploaded or linked datasets.
- `results/*.jsonl` – batch run outputs.

You can mount alternative storage or sync these directories as needed.

## Development Notes

- Batch operations leverage FastAPI background tasks with an in-memory job store; consider migrating to persistent job tracking for production use.
- The front end expects the API under `/api`; adjust Vite proxy settings if hosting separately.
