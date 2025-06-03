from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import tempfile
import subprocess
from supabase import create_client
from dotenv import load_dotenv
import uuid
import shutil

load_dotenv()

router = APIRouter(prefix="/latex", tags=["latex"])

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

# Known pdflatex paths including your MiKTeX install
PDFLATEX_PATHS = [
    r"C:\Users\ashis\AppData\Local\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe",
    r"C:\Program Files\MiKTeX\miktex\bin\x64\pdflatex.exe",
    r"C:\Program Files\MiKTeX\miktex\bin\pdflatex.exe",
    r"C:\texlive\2023\bin\win32\pdflatex.exe",
    r"C:\texlive\2022\bin\win32\pdflatex.exe"
]

def find_pdflatex():
    # Try system path first
    path = shutil.which("pdflatex")
    if path:
        print(f"✅ Found pdflatex in system PATH: {path}")
        return path

    # Check known paths
    for path in PDFLATEX_PATHS:
        if os.path.exists(path):
            print(f"✅ Found pdflatex at: {path}")
            return path
    return None

class LatexRequest(BaseModel):
    latex_code: str

@router.post("/convert")
async def convert_latex_to_pdf(request: LatexRequest):
    try:
        pdflatex_path = find_pdflatex()
        if not pdflatex_path:
            raise HTTPException(
                status_code=500,
                detail="pdflatex not found. Please install MiKTeX or TeX Live and ensure it's in your PATH."
            )

        with tempfile.TemporaryDirectory() as temp_dir:
            tex_path = os.path.join(temp_dir, "main.tex")
            with open(tex_path, "w", encoding="utf-8") as f:
                f.write(request.latex_code)

            print(f"📄 Writing LaTeX to: {tex_path}")
            print(f"⚙️  Running pdflatex from: {pdflatex_path}")

            process = subprocess.run(
                [pdflatex_path, "-interaction=nonstopmode", "-output-directory", temp_dir, tex_path],
                capture_output=True,
                text=True
            )

            if process.returncode != 0:
                print(f"❌ pdflatex stderr: {process.stderr}")
                raise HTTPException(
                    status_code=400,
                    detail=f"LaTeX compilation failed: {process.stderr}"
                )

            pdf_path = os.path.join(temp_dir, "main.pdf")
            if not os.path.exists(pdf_path):
                raise HTTPException(
                    status_code=500,
                    detail="PDF not generated"
                )

            pdf_filename = f"latex_{uuid.uuid4()}.pdf"
            with open(pdf_path, "rb") as f:
                pdf_data = f.read()

            print(f"📤 Uploading PDF to Supabase as: {pdf_filename}")

            # Upload to Supabase storage
            supabase.storage.from_("uploads").upload(
                pdf_filename,
                pdf_data,
                {"content-type": "application/pdf"}
            )

            pdf_url = supabase.storage.from_("uploads").get_public_url(pdf_filename)

            return {
                "message": "LaTeX successfully converted to PDF",
                "pdf_url": pdf_url
            }

    except Exception as e:
        print(f"🚨 Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error converting LaTeX to PDF: {str(e)}")
