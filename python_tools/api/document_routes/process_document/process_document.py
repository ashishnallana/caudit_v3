from fastapi import APIRouter, HTTPException, Request
import requests
import os
from typing import Dict
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from ..extract_document.extract_document import extract_document
from ..extract_document.extract_document import DocumentUrl
from .tools.validate_document import validate_document
from .tools.validate_and_extract_details import validate_and_extract_details
from .tools.extract_data import extract_data
from .tools.save_to_db import save_to_db
from .tools.update_in_db import update_in_db
from .tools.create_journal_entry import create_journal_entry
from .tools.create_ledger_entry import create_ledger_entry

router = APIRouter()

supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_KEY", "")

class DocumentRequest(BaseModel):
    document_url: HttpUrl
    description: str
    job_id: str

@router.post("/process-document")
async def process_document(payload: DocumentRequest ,request: Request) -> Dict:
    """
    Process a new transaction
    The user provides a supporting document and desciption/reason of the transaction
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
        user_id = user_data["id"]

        await update_in_db(
            item_id=str(payload.job_id),
            updated_data={
                "status": "in progress",
                "last_run_at": datetime.utcnow().isoformat()
            },
            table_name="job"
        )


        # Extract document content using the extract_document function
        extracted_document_content = await extract_document(DocumentUrl(url=payload.document_url))
        extracted_transaction_details = await validate_and_extract_details(extracted_document_content["content"], payload.description)
        created_journal_entry = await create_journal_entry(extracted_transaction_details, payload.job_id)
        # created_ledger_entries = await create_ledger_entry(created_journal_entry, payload.job_id) # [entry1, entry2]    

        created_journal_entry["user_id"] = user_id
        created_journal_entry["reference_no"] = extracted_transaction_details["reference_no"]
        created_journal_entry["job_id"] = payload.job_id

        saved_journal_entry = await save_to_db(created_journal_entry, "journal_entry") 

        await update_in_db(
            item_id=str(payload.job_id),
            updated_data={
                "status": "parsed",
                "journal_entry_id": saved_journal_entry[0]["id"],
                "last_run_at": datetime.utcnow().isoformat()
            },
            table_name="job"
        )   

        return {
            "success": True,
            "extracted_document_content": extracted_document_content,
            "extracted_transaction_details": extracted_transaction_details,
            "created_journal_entry": created_journal_entry,
            "saved_journal_entry": saved_journal_entry
            # "created_ledger_entries": created_ledger_entries
        }
    
    except Exception as e:
        error_message = str(e)
        # Update the job status to failed with error message
        await update_in_db(
            item_id=str(payload.job_id),
            updated_data={
                "status": "failed",
                "error_message": error_message,
                "last_run_at": datetime.utcnow().isoformat()
            },
            table_name="job"
        )
        raise HTTPException(status_code=500, detail=f"Error : {error_message}")
