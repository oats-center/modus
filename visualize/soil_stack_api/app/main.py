import typing as t
import aiofiles
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import RedirectResponse, HTMLResponse
import subprocess
import uuid
from pathlib import Path
app = FastAPI()

OUTPUT_PATH = Path("/tmp/soil_data")
OUTPUT_PATH.mkdir(exist_ok=True)


def render_quarto():
    cmd = ["/opt/quarto/0.9.522/bin/quarto", "render", "/code/app/parse.qmd", "--to", "html"]
    process = subprocess.run(
        cmd, 
        capture_output=True
    )
    print( 'exit status:', process.returncode )
    print( 'stdout:', process.stdout.decode() )
    print( 'stderr:', process.stderr.decode() )
    with open("/code/app/parse.html") as f:
        out = f.read()
    return out

@app.get("/")
def read_root():
    return RedirectResponse(url='/redoc')


@app.post("/upload_soil_data")
async def upload_file(file: UploadFile): 
    """Upload a soil sample data file. It can either be a modus file or a modus/json file."""
    return {"filename": file.filename}

@app.post("/modus_json_to_html")
async def modus_json_to_html(files: t.List[UploadFile]): 
    """Upload a soil sample data file. It can either be a modus file or a modus/json file."""

    if isinstance(files, list):
        for f in files:
            destination_file_path = OUTPUT_PATH / f.filename
            async with aiofiles.open(destination_file_path, 'wb') as out_file:
                while content := await f.read(1024):  # async read file chunk
                    await out_file.write(content)  # async write file chunk

    # todo remove files after
    return {"Result": "OK", "filenames": [file.filename for file in files]}


@app.get("/render_test")
def render_test():
    return HTMLResponse(render_quarto())