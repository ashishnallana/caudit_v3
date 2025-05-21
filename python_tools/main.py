from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
import io
import requests
from typing import Dict
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="PDF Extractor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class PDFUrl(BaseModel):
    url: HttpUrl

@app.get("/")
async def root():
    return {"message": "PDF Extractor API is running"}

@app.post("/extract-pdf")
async def extract_pdf(pdf_url: PDFUrl) -> Dict:
    """
    Extract text content from a PDF file using its URL
    """
    try:
        # Fetch the PDF from the URL
        response = requests.get(str(pdf_url.url))
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Create a PDF reader object
        pdf_file = io.BytesIO(response.content)
        pdf_reader = PdfReader(pdf_file)
        
        # Extract text from each page
        text_content = []
        for page in pdf_reader.pages:
            text_content.append(page.extract_text())
        
        return {
            "url": str(pdf_url.url),
            "total_pages": len(pdf_reader.pages),
            "content": text_content
        }
    
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Error fetching PDF: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 