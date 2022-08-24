import typing as t
import aiofiles
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import RedirectResponse, HTMLResponse
import subprocess
import uuid
import shutil
from pathlib import Path
app = FastAPI()

OUTPUT_PATH = Path("/tmp/soil_data")


def render_quarto():
    cmd = ["/opt/quarto/0.9.522/bin/quarto", "render", "/code/app/reports/soil.qmd", "--to", "html"]
    process = subprocess.run(
        cmd, 
        capture_output=True
    )
    print(" ".join(cmd))
    print(process.stdout)
    print(process.stderr)
    with open("/code/app/reports/soil.html") as f:
        out = f.read()
    return out

@app.get("/")
def read_root():
    return RedirectResponse(url='/redoc')




@app.post("/modus_json_to_html")
def modus_json_to_html(files: t.List[UploadFile]): 
    """Upload a soil sample data file. It can either be a modus file or a modus/json file."""
    
    OUTPUT_PATH.mkdir(exist_ok=True)
    

    for f in files:
        destination_file_path = OUTPUT_PATH / f"{str(uuid.uuid4())}.json"
        with destination_file_path.open("wb") as buffer:
            shutil.copyfileobj(f.file, buffer)

    # todo remove files after
    html = render_quarto()
    try:
        shutil.rmtree(OUTPUT_PATH)
    except FileNotFoundError:
        print("deleting did not work")
    return HTMLResponse(html) 


@app.get("/render_test")
def render_test():
    return HTMLResponse(render_quarto())