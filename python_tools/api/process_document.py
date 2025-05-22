from fastapi import APIRouter, HTTPException
from typing import Dict
from pydantic import BaseModel, HttpUrl
from .extract_document import extract_document
from .extract_document import DocumentUrl
from .tools.process_document.validate_document import validate_document

router = APIRouter(prefix="/api", tags=["document"])

class DocumentRequest(BaseModel):
    document_url: HttpUrl
    user_id: str

@router.post("/process-document")
async def process_document(request: DocumentRequest) -> Dict:
    """
    Process a document from the given URL for a specific user
    """
    try:
        # Extract document content using the extract_document function
        doc_data = await extract_document(DocumentUrl(url=request.document_url))
        
        # Validate the document content
        validation_results = await validate_document(doc_data["content"])
        # extracted_data = await extract_docuement(doc_data["content"])
        # print(validation_results)
        
        return {
            "document_url": str(request.document_url),
            "user_id": request.user_id,
            "status": "completed" if validation_results["is_valid"] else "validation_failed",
            "total_pages": doc_data["total_pages"],
            "content": doc_data["content"],
            "validation": validation_results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
