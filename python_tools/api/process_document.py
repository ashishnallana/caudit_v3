from fastapi import APIRouter, HTTPException
import requests
import os
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

supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_KEY", "")

class DocumentRequest(BaseModel):
    document_url: HttpUrl
    user_id: str
    token: str

@router.post("/process-document")
async def process_document(request: DocumentRequest) -> Dict:
    """
    Process a document from the given URL for a specific user
    """
    try:

        response = requests.get(
            f'{supabase_url}/auth/v1/user',
            headers={
                'Authorization': f'Bearer {request.token}',
                'apikey': supabase_key
            }
        )

        user_data = response.json()
        # print(user_data)

        # # Extract document content using the extract_document function
        # doc_data = await extract_document(DocumentUrl(url=request.document_url))

        # # take access_token as input and find user_id from that
        
        # # Validate the document content
        # validation_results = await validate_document(doc_data["content"])
        # extracted_data = await extract_data(doc_data["content"],  validation_results["document_type"])
        # complete_extracted_data = extracted_data["extracted_data"]
        # # print(complete_extracted_data)
        # complete_extracted_data["user_id"] = request.user_id
        # complete_extracted_data["source_document_url"] = str(request.document_url)
        # # complete_extracted_data["created_at"] = datetime.now()
        # saving_to_database = await save_to_db(request.user_id, complete_extracted_data, validation_results["document_type"])

        # journal_entry = await create_journal_entry(complete_extracted_data)
        # complete_journal_entry = journal_entry["journal_entries"]
        # complete_journal_entry["user_id"] = request.user_id
        # complete_journal_entry["entry_date"] = saving_to_database["data"][0]["receipt_date"]
        # complete_journal_entry["source_type"] = validation_results["document_type"]
        # complete_journal_entry["source_document_url"] = str(request.document_url)
        # complete_journal_entry["source_id"] = saving_to_database["data"][0]["id"]
        # save_journal_entry = await save_to_db(request.user_id, complete_journal_entry, "journal_entries")

        # print(validation_results)
        # print(complete_extracted_data)
        return {
            "user_id" : request.user_id,
            "document_url": str(request.document_url),
            "token": request.token,
            "user_data": user_data
        }
        # return {
        #     "document_url": str(request.document_url),
        #     "user_id": request.user_id,
        #     "status": "completed" if validation_results["is_valid"] else "validation_failed",
        #     "total_pages": doc_data["total_pages"],
        #     "content": doc_data["content"],
        #     "validation": validation_results,
        #     "extracted_data": complete_extracted_data,
        #     "saving_to_database": saving_to_database,
        #     "journal_entry": complete_journal_entry,
        #     "save_journal_entry": save_journal_entry
        # }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
