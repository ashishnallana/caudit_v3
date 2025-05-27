from fastapi import APIRouter, HTTPException
from PyPDF2 import PdfReader
import io
import requests
from typing import Dict
from pydantic import BaseModel, HttpUrl

router = APIRouter()

class DocumentUrl(BaseModel):
    url: HttpUrl

@router.post("/extract-document")
async def extract_document(doc_url: DocumentUrl) -> Dict:
    """
    Extract text content from a document file using its URL
    """
    try:
        # Fetch the document from the URL
        response = requests.get(str(doc_url.url))
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Create a PDF reader object
        doc_file = io.BytesIO(response.content)
        doc_reader = PdfReader(doc_file)
        
        # Extract text from each page
        text_content = []
        for page in doc_reader.pages:
            text_content.append(page.extract_text())
        
        return {
            "url": str(doc_url.url),
            "total_pages": len(doc_reader.pages),
            "content": text_content
        }
    
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Error fetching document: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}") 