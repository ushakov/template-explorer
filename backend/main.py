from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
from pathlib import Path
import uuid
from typing import List, Dict, Any
import json
from dotenv import load_dotenv
import jinja2
from llama_index.llms.openai import OpenAI
from typing import Literal
import time
from llama_index.core.prompts import PromptTemplate

load_dotenv()

app = FastAPI(title="Template Explorer API")

STORAGE_ROOT = Path("template-explorer/storage")
TEMPLATES_DIR = STORAGE_ROOT / "templates"
DATASETS_DIR = STORAGE_ROOT / "datasets"
RESULTS_DIR = STORAGE_ROOT / "results"

# Ensure directories exist
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
DATASETS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# In-memory job store (for simplicity)
job_store: Dict[str, Dict[str, Any]] = {}

# --- Pydantic Models ---

class TemplateMeta(BaseModel):
    id: str = Field(..., description="Unique identifier for the template")
    name: str = Field(..., description="Display name for the template")

class Template(TemplateMeta):
    content: str = Field(..., description="The template content (e.g., Jinja2 syntax)")

class TemplateCreate(BaseModel):
    name: str
    content: str

class TemplateUpdate(BaseModel):
    name: str | None = None
    content: str | None = None

class DatasetMeta(BaseModel):
    id: str = Field(..., description="Unique identifier for the dataset")
    name: str = Field(..., description="Display name for the dataset")
    num_records: int | None = Field(None, description="Number of records in the dataset")
    file_format: str = Field(..., description="File format (json or jsonl)")

# --- LLM & Runner Models ---

class LLMConfig(BaseModel):
    provider: str = "openai"
    model: str = "gpt-3.5-turbo"
    temperature: float = 0.7

class ParserSpec(BaseModel):
    type: Literal["raw", "structured", "python"] = "raw"
    pydantic_model: str | None = None # For 'structured'
    python_code: str | None = None # For 'python'

class DataSourceBinding(BaseModel):
    source_id: str
    context_key: str
    scope: Literal["record", "global"]
    row: int | None = None

class RunRequest(BaseModel):
    template_id: str | None = None
    template_text: str | None = None
    datasource_bindings: list[DataSourceBinding]
    parser: ParserSpec | None = None
    llm: LLMConfig | None = None

class RunResponse(BaseModel):
    raw_response: str
    parsed_response: str | dict | None = None
    error: str | None = None

# Pydantic Models for Batch Processing
class BatchRunRequest(RunRequest):
    pass

class BatchRunResponse(BaseModel):
    job_id: str

class JobStatus(BaseModel):
    status: str
    progress: float
    total: int
    error: str | None = None

class JobResult(BaseModel):
    results: List[Dict[str, Any]]

class SaveResultsRequest(BaseModel):
    job_id: str
    filename: str


@app.get("/")
async def read_root():
    return {"message": "Welcome to Template Explorer"}

# --- Template CRUD Endpoints ---

@app.post("/templates", response_model=TemplateMeta)
async def create_template(template_in: TemplateCreate):
    """Creates a new template and saves it to the filesystem."""
    template_id = str(uuid.uuid4())
    template_name = template_in.name
    # Basic sanitization to prevent path traversal
    if "/" in template_name or "\\" in template_name:
        raise HTTPException(status_code=400, detail="Template name cannot contain slashes.")

    file_path = TEMPLATES_DIR / f"{template_id}__{template_name}.jinja"

    # Check for name collision
    for f in TEMPLATES_DIR.iterdir():
        if f.is_file() and f.stem.split('__', 1)[1] == template_name:
            raise HTTPException(status_code=409, detail=f"A template with name '{template_name}' already exists.")

    try:
        with open(file_path, "w") as f:
            f.write(template_in.content)
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Failed to write template to disk: {e}")

    return TemplateMeta(id=template_id, name=template_name)

@app.get("/templates", response_model=List[TemplateMeta])
async def list_templates():
    """Lists all available templates."""
    templates = []
    for f in sorted(TEMPLATES_DIR.iterdir()):
        if f.is_file() and f.suffix == '.jinja':
            try:
                template_id, template_name = f.stem.split('__', 1)
                templates.append(TemplateMeta(id=template_id, name=template_name))
            except ValueError:
                # Skip files that don't match the "id__name" format
                continue
    return templates

# --- Dataset CRUD Endpoints ---
@app.get("/datasets", response_model=List[DatasetMeta])
async def list_datasets():
    """Lists all available datasets."""
    datasets = []
    for f in sorted(DATASETS_DIR.iterdir()):
        if f.is_file() and f.suffix in ['.json', '.jsonl', '.txt']:
            try:
                dataset_id, dataset_name = f.stem.split('__', 1)
                file_format = f.suffix.lstrip('.')
                datasets.append(DatasetMeta(id=dataset_id, name=dataset_name, file_format=file_format))
            except ValueError:
                print(f"Skipping file {f} because it doesn't match the expected format.")
                continue
    return datasets

@app.post("/datasets", response_model=DatasetMeta)
async def create_dataset(file: UploadFile = File(...)):
    """Uploads a new dataset file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    # Sanitize filename
    dataset_name = Path(file.filename).stem
    if "/" in dataset_name or "\\" in dataset_name:
        raise HTTPException(status_code=400, detail="Dataset name cannot contain slashes.")

    suffix = Path(file.filename).suffix
    if suffix not in [".json", ".jsonl", ".txt"]:
        raise HTTPException(status_code=400, detail="Only .json and .jsonl files are allowed.")

    # Check for name collision
    for f in DATASETS_DIR.iterdir():
        if f.is_file() and f.stem.split('__', 1)[1] == dataset_name:
            raise HTTPException(status_code=409, detail=f"A dataset with name '{dataset_name}' already exists.")

    dataset_id = str(uuid.uuid4())
    file_path = DATASETS_DIR / f"{dataset_id}__{dataset_name}{suffix}"
    file_format = suffix.lstrip('.')

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Failed to write dataset to disk: {e}")

    return DatasetMeta(id=dataset_id, name=dataset_name, file_format=file_format)


def _find_dataset_file(dataset_id: str) -> Path | None:
    """Helper to find a dataset file by its ID."""
    for f in DATASETS_DIR.iterdir():
        if f.is_file() and f.stem.startswith(f"{dataset_id}__"):
            return f
    return None

def _load_dataset_file(file_path: Path) -> list[dict] | list[str]:
    try:
        ret = []
        if file_path.suffix == '.jsonl':
            with file_path.open('r') as f:
                for i, line in enumerate(f):
                    ret.append(json.loads(line))
        elif file_path.suffix == '.json':
            with file_path.open('r') as f:
                data = json.load(f)
                if isinstance(data, list):
                    ret = data
                elif isinstance(data, dict):
                     ret = [data] # It is a single JSON object.
        elif file_path.suffix == '.txt':
            with file_path.open('r') as f:
                ret = [f.read()]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format for record retrieval.")
    except (IOError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Error reading or parsing dataset file: {e}")
    return ret


@app.get("/datasets/{dataset_id}", response_model=DatasetMeta)
async def get_dataset(dataset_id: str):
    """Retrieves metadata for a single dataset."""
    file_path = _find_dataset_file(dataset_id)
    if not file_path or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Dataset not found")

    _, dataset_name = file_path.stem.split('__', 1)
    file_format = file_path.suffix.lstrip('.')
    data = _load_dataset_file(file_path)
    return DatasetMeta(id=dataset_id, name=dataset_name, file_format=file_format, num_records=len(data))

@app.get("/datasets/{dataset_id}/records/{record_index}", response_model=dict | str)
async def get_dataset_record(dataset_id: str, record_index: int):
    """Retrieves a single record from a dataset."""
    file_path = _find_dataset_file(dataset_id)
    if not file_path or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Dataset not found")

    data = _load_dataset_file(file_path)
    if 0 <= record_index < len(data):
        return data[record_index]
    raise HTTPException(status_code=404, detail="Record not found at that index.")


@app.delete("/datasets/{dataset_id}", status_code=204)
async def delete_dataset(dataset_id: str):
    """Deletes a dataset from the filesystem."""
    file_path = _find_dataset_file(dataset_id)
    if not file_path or not file_path.is_file():
        return

    try:
        file_path.unlink()
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete dataset file: {e}")
    return


def _find_template_file(template_id: str) -> Path | None:
    """Helper to find a template file by its ID."""
    for f in TEMPLATES_DIR.iterdir():
        if f.is_file() and f.stem.startswith(f"{template_id}__"):
            return f
    return None

@app.get("/templates/{template_id}", response_model=Template)
async def get_template(template_id: str):
    """Retrieves a single template, including its content."""
    file_path = _find_template_file(template_id)
    if not file_path or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        content = file_path.read_text()
        _, template_name = file_path.stem.split('__', 1)
        return Template(id=template_id, name=template_name, content=content)
    except IOError:
        raise HTTPException(status_code=500, detail="Could not read template file.")


@app.put("/templates/{template_id}", response_model=Template)
async def update_template(template_id: str, template_in: TemplateUpdate):
    """Updates a template's name or content."""
    file_path = _find_template_file(template_id)
    if not file_path or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Template not found")

    current_name = file_path.stem.split('__', 1)[1]
    new_name = template_in.name if template_in.name is not None else current_name

    if "/" in new_name or "\\" in new_name:
        raise HTTPException(status_code=400, detail="Template name cannot contain slashes.")

    # Handle rename
    new_file_path = file_path
    if template_in.name is not None and template_in.name != current_name:
        # Check for name collision
        for f in TEMPLATES_DIR.iterdir():
            if f.is_file() and f.stem.split('__', 1)[1] == template_in.name:
                raise HTTPException(status_code=409, detail=f"A template with name '{template_in.name}' already exists.")
        new_file_path = TEMPLATES_DIR / f"{template_id}__{template_in.name}.jinja"
        try:
            file_path.rename(new_file_path)
        except IOError as e:
            raise HTTPException(status_code=500, detail=f"Failed to rename template file: {e}")

    # Handle content update
    if template_in.content is not None:
        try:
            new_file_path.write_text(template_in.content)
        except IOError as e:
            raise HTTPException(status_code=500, detail=f"Failed to write updated content: {e}")

    updated_content = new_file_path.read_text()
    return Template(id=template_id, name=new_name, content=updated_content)


@app.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: str):
    """Deletes a template from the filesystem."""
    file_path = _find_template_file(template_id)
    if not file_path or not file_path.is_file():
        return # Already gone

    try:
        file_path.unlink()
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template file: {e}")

def execute_llm_run(request: RunRequest, record: Dict[str, Any] | None) -> Dict[str, Any]:
    # 1. Get Template Content
    if request.template_id:
        template_file = _find_template_file(request.template_id)
        if not template_file:
            raise ValueError("Template not found")
        template_content = template_file.read_text()
    else:
        template_content = request.template_text or ""

    # 2. Build Context
    context = {}
    for binding in request.datasource_bindings:
        dataset_file = _find_dataset_file(binding.source_id)
        if not dataset_file:
            raise ValueError(f"Dataset with ID {binding.source_id} not found.")

        context_key = binding.context_key

        if binding.scope == "global":
            data = _load_dataset_file(dataset_file)
            row = binding.row or 0
            if not (0 <= row < len(data)):
                raise ValueError("Invalid row index for global binding.")
            context_value = data[row]
        else: # record scope
            if record:
                context_value = record
            else:
                # For a single run, we assume the first record is used for any 'record' scoped datasets
                data = _load_dataset_file(dataset_file)
                if data:
                    context_value = data[0]

        if context_key == '' and isinstance(context_value, dict):
            context = { **context, **context_value }
        else:
            context[context_key] = context_value

    # 3. Render Prompt
    jinja_env = jinja2.Environment()
    template = jinja_env.from_string(template_content)
    prompt = template.render(context)

    # 4. Execute LLM & Parse
    llm = OpenAI(model=request.llm.model, temperature=request.llm.temperature)
    parser_spec = request.parser or ParserSpec()

    if parser_spec.type == "structured" and parser_spec.pydantic_model:
        try:
            DynamicModel = create_model_from_string(parser_spec.pydantic_model)
            parsed_response = llm.structured_predict(DynamicModel, PromptTemplate(prompt))
            raw_response = str(parsed_response)
            # pydantic_parser = PydanticOutputParser(DynamicModel)
            # chain = QueryPipeline(chain=[("llm", llm), ("parser", pydantic_parser)])
            # parsed_response = chain.run(prompt=prompt)
            # raw_response = str(parsed_response) # Or get from intermediate steps
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise ValueError(f"Pydantic model parsing failed: {e}")
    elif parser_spec.type == "python" and parser_spec.python_code:
        raw_response = llm.complete(prompt).text
        try:
            parsed_response = execute_custom_python(parser_spec.python_code, raw_response)
        except Exception as e:
            raise ValueError(f"Custom Python parsing failed: {e}")
    else: # Raw
        raw_response = llm.complete(prompt).text
        parsed_response = raw_response

    return {"raw_response": raw_response, "parsed_response": parsed_response.model_dump()}

def create_model_from_string(model_code: str) -> type[BaseModel]:
    """Dynamically creates a Pydantic model from a string of Python code."""
    local_scope = {}
    try:
        exec(model_code, globals(), local_scope)
    except Exception as e:
        raise ValueError(f"Invalid Pydantic model definition: {e}")

    for name, value in local_scope.items():
        if isinstance(value, type) and issubclass(value, BaseModel) and value is not BaseModel and not name.startswith("_"):
            return value

    raise ValueError("No Pydantic model class found in the provided code. Make sure to define a class that inherits from pydantic.BaseModel.")

def execute_custom_python(code: str, text_input: str) -> Any:
    """Executes a custom Python parsing function."""
    local_scope = {}
    try:
        exec(code, globals(), local_scope)
    except Exception as e:
        raise ValueError(f"Invalid Python code for parsing: {e}")

    parser_func = local_scope.get("parse")
    if not callable(parser_func):
        raise ValueError("A 'parse' function was not found in the provided code.")

    try:
        return parser_func(text_input)
    except Exception as e:
        raise ValueError(f"Error executing the 'parse' function: {e}")

# Refactor /llm/run to use the new function
@app.post("/llm/run", response_model=RunResponse)
async def run_llm(request: RunRequest):
    try:
        result = execute_llm_run(request, None)
        return RunResponse(**result)
    except (ValueError, HTTPException) as e:
        return RunResponse(raw_response="", error=str(e))

# Background task for batch processing
def batch_process_task(job_id: str, request: BatchRunRequest):
    job_store[job_id] = {"status": "running", "progress": 0, "total": 0, "results": [], "error": None}

    try:
        # Identify record-scoped dataset
        record_scoped_binding = next((b for b in request.datasource_bindings if b.scope == 'record'), None)
        if not record_scoped_binding:
            raise ValueError("Batch run requires at least one 'record' scoped dataset.")

        record_dataset_file = _find_dataset_file(record_scoped_binding.source_id)
        if not record_dataset_file:
            raise ValueError(f"Record-scoped dataset {record_scoped_binding.source_id} not found.")

        record_data = _load_dataset_file(record_dataset_file)
        total_records = len(record_data)
        job_store[job_id]["total"] = total_records

        for i, record in enumerate(record_data):
            try:
                result = execute_llm_run(request, record)
                job_store[job_id]["results"].append({"input_record": record, **result})
            except Exception as e:
                job_store[job_id]["results"].append({"input_record": record, "error": str(e)})

            job_store[job_id]["progress"] = i + 1
            time.sleep(0.1) # Simulate work

        job_store[job_id]["status"] = "completed"

    except Exception as e:
        job_store[job_id]["status"] = "failed"
        job_store[job_id]["error"] = str(e)


@app.post("/llm/batch", response_model=BatchRunResponse)
async def run_batch(request: BatchRunRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    background_tasks.add_task(batch_process_task, job_id, request)
    return BatchRunResponse(job_id=job_id)

@app.get("/jobs/{job_id}/status", response_model=JobStatus)
async def get_job_status(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatus(status=job["status"], progress=job["progress"], total=job["total"], error=job["error"])

@app.get("/jobs/{job_id}/result", response_model=JobResult)
async def get_job_result(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job is not yet complete.")
    return JobResult(results=job["results"])

@app.post("/jobs/save")
async def save_job_results(request: SaveResultsRequest):
    job = job_store.get(request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job is not yet complete.")

    # Sanitize filename
    if "/" in request.filename or "\\" in request.filename:
        raise HTTPException(status_code=400, detail="Filename cannot contain slashes.")

    file_path = RESULTS_DIR / f"{request.filename}.jsonl"

    if file_path.exists():
        raise HTTPException(status_code=409, detail="A file with that name already exists.")

    try:
        with file_path.open("w") as f:
            for item in job["results"]:
                f.write(json.dumps(item) + "\n")
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Failed to save results to disk: {e}")

    return {"message": "Results saved successfully", "path": str(file_path)}