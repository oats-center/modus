from typing import Union
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import RedirectResponse, HTMLResponse
import subprocess
import uuid
app = FastAPI()


@app.get("/")
def read_root():
    return RedirectResponse(url='/redoc')


@app.post("/upload_soil_data")
async def upload_file(file: UploadFile): 
    """Upload a soil sample data file. It can either be a modus file or a modus/json file."""
    return {"filename": file.filename}


@app.get("/render_quarto", response_class=HTMLResponse)
def render_quarto():
    cmd = ["/opt/quarto/0.9.522/bin/quarto", "render", "/code/app/soil.qmd", "--to", "html"]
    print(" ".join(cmd))
    process = subprocess.run(
        cmd, 
        capture_output=True
    )
    print( 'exit status:', process.returncode )
    print( 'stdout:', process.stdout.decode() )
    print( 'stderr:', process.stderr.decode() )
    with open("/code/app/soil.html") as f:
        out = f.read()
    return out