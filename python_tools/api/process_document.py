from fastapi import APIRouter, HTTPException
from typing import Dict
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from .extract_document import extract_document
from .extract_document import DocumentUrl
from .tools.process_document.validate_document import validate_document
from .tools.process_document.extract_data import extract_data
from .tools.process_document.save_to_db import save_to_db
from .tools.process_document.create_journal_entry import create_journal_entry


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
        extracted_data = await extract_data(doc_data["content"],  validation_results["document_type"])
        complete_extracted_data = extracted_data["extracted_data"]
        # print(complete_extracted_data)
        complete_extracted_data["user_id"] = request.user_id
        complete_extracted_data["source_document_url"] = str(request.document_url)
        # complete_extracted_data["created_at"] = datetime.now()
        saving_to_database = await save_to_db(request.user_id, complete_extracted_data, validation_results["document_type"])

        journal_entry = await create_journal_entry(complete_extracted_data)


        # print(validation_results)
        print(complete_extracted_data)
        return {
            "document_url": str(request.document_url),
            "user_id": request.user_id,
            "status": "completed" if validation_results["is_valid"] else "validation_failed",
            "total_pages": doc_data["total_pages"],
            "content": doc_data["content"],
            "validation": validation_results,
            "extracted_data": complete_extracted_data,
            "saving_to_database": saving_to_database,
            "journal_entry": journal_entry
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
