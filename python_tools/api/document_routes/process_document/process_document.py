from fastapi import APIRouter, HTTPException, Request
import requests
import os
from typing import Dict
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from ..extract_document.extract_document import extract_document
from ..extract_document.extract_document import DocumentUrl
from .tools.validate_document import validate_document
from .tools.extract_data import extract_data
from .tools.save_to_db import save_to_db
from .tools.create_journal_entry import create_journal_entry

router = APIRouter()

supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_KEY", "")

class DocumentRequest(BaseModel):
    document_url: HttpUrl

@router.post("/process-document")
async def process_document(payload: DocumentRequest ,request: Request) -> Dict:
    """
    Process a document from the given URL for a specific user
    """
    try:
        auth_header = request.headers.get("Authorization")

        response = requests.get(
            f'{supabase_url}/auth/v1/user',
            headers={
                'Authorization': auth_header,
                'apikey': supabase_key
            }
        )

        user_data = response.json()
        print("👉", user_data)
        user_id = user_data["id"]

        # print(user_data)
        print("⭐", user_id)

        # Extract document content using the extract_document function
        doc_data = await extract_document(DocumentUrl(url=payload.document_url))

        # take access_token as input and find user_id from that
        
        # Validate the document content
        validation_results = await validate_document(doc_data["content"])
        print("⭐⭐", validation_results)
        extracted_data = await extract_data(doc_data["content"],  validation_results["document_type"])
        complete_extracted_data = extracted_data["extracted_data"]
        # print(complete_extracted_data)
        complete_extracted_data["user_id"] = user_id
        complete_extracted_data["source_document_url"] = str(payload.document_url)
        print("⭐⭐⭐", complete_extracted_data)
        # complete_extracted_data["created_at"] = datetime.now()
        saving_to_database = await save_to_db(user_id, complete_extracted_data, validation_results["document_type"])
        print("⭐⭐⭐⭐", saving_to_database)
        journal_entry = await create_journal_entry(complete_extracted_data)
        print("⭐⭐⭐⭐⭐", journal_entry)
        complete_journal_entry = journal_entry["journal_entries"]
        complete_journal_entry["user_id"] = user_id
        complete_journal_entry["entry_date"] = saving_to_database["data"][0]["date"]
        complete_journal_entry["source_type"] = validation_results["document_type"]
        complete_journal_entry["source_document_url"] = str(payload.document_url)
        complete_journal_entry["source_id"] = saving_to_database["data"][0]["id"]
        print("⭐⭐⭐⭐⭐⭐", complete_journal_entry)
        save_journal_entry = await save_to_db(user_id, complete_journal_entry, "journal_entries")
        print("⭐⭐⭐⭐⭐⭐⭐", save_journal_entry)

        # print(validation_results)
        # print(complete_extracted_data)


        # return {
        #     # "user_id" : request.user_id,
        #     "document_url": str(payload.document_url),
        #     # "token": request.token,
        #     # "user_data": user_data
        # }
        # print({
        #     "document_url": str(payload.document_url),
        #     "user_id": user_id,
        #     "status": "completed" if validation_results["is_valid"] else "validation_failed",
        #     "total_pages": doc_data["total_pages"],
        #     "content": doc_data["content"],
        #     "validation": validation_results,
        #     "extracted_data": complete_extracted_data,
        #     "saving_to_database": saving_to_database,
        #     "journal_entry": complete_journal_entry,
        #     "save_journal_entry": save_journal_entry
        # })
        return {
            "document_url": str(payload.document_url),
            "user_id": user_id,
            "status": "completed" if validation_results["is_valid"] else "validation_failed",
            "total_pages": doc_data["total_pages"],
            "content": doc_data["content"],
            "validation": validation_results,
            "extracted_data": complete_extracted_data,
            "saving_to_database": saving_to_database,
            "journal_entry": complete_journal_entry,
            "save_journal_entry": save_journal_entry
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
