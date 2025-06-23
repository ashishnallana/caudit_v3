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

        print("👉👉", user_id)

        # starting new process
        # print("⭐", "starting new process")
        # result = await update_in_db(
        #     item_id=str(payload.job_id),
        #     updated_data={"status": "in_progress"},  # Only include the field you want to update
        #     table_name="document_jobs"
        # )

        success = True

        # Extract document content using the extract_document function
        document_content = await extract_document(DocumentUrl(url=payload.document_url))
        document_validation = await validate_document(document_content, payload.description)

        if document_validation["is_valid_data"] == False:
            raise HTTPException(status_code=400, detail="Invalid data") 

        return {
            "success": success,
            "is_valid_information": document_validation
        }
    
    except Exception as e:
        error_message = str(e)
        # Update the job status to failed with error message
        # await update_in_db(
        #     item_id=str(payload.job_id),
        #     updated_data={
        #         "status": "failed",
        #         "error_message": error_message,
        #         "last_run_at": datetime.utcnow().isoformat()
        #     },
        #     table_name="document_jobs"
        # )
        raise HTTPException(status_code=500, detail=f"Error processing document: {error_message}")
