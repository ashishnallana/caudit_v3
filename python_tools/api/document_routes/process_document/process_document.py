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
    job_id: str

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
        user_id = user_data["id"]

        print("👉👉", user_id)

        # starting new process
        print("⭐", "starting new process")
        result = await update_in_db(
            item_id=str(payload.job_id),
            updated_data={"status": "in_progress"},  # Only include the field you want to update
            table_name="document_jobs"
        )

        # Extract document content using the extract_document function
        doc_data = await extract_document(DocumentUrl(url=payload.document_url))
        
        # Validate the document content
        validation_results = await validate_document(doc_data["content"], payload.job_id)
        print("⭐⭐", validation_results)

        # extract doc data
        extracted_data = await extract_data(doc_data["content"], validation_results["document_type"], payload.job_id)
        complete_extracted_data = {}
        complete_extracted_data["extracted_data"] = extracted_data["extracted_data"]
        complete_extracted_data["document_type"] = validation_results["document_type"]
        complete_extracted_data["file_url"] = str(payload.document_url)
        complete_extracted_data["user_id"] = user_id
        complete_extracted_data["job_id"] = str(payload.job_id)
        print("⭐⭐⭐", complete_extracted_data)

        # save extracted data
        saving_to_database = await save_to_db(user_id, complete_extracted_data, "documents")
        print("⭐⭐⭐⭐", saving_to_database)

        # create journal entry
        journal_entry = await create_journal_entry(complete_extracted_data, payload.job_id)
        print("⭐⭐⭐⭐⭐", journal_entry)
        complete_journal_entry = journal_entry["journal_entries"]
        complete_journal_entry["user_id"] = user_id
        complete_journal_entry["entry_date"] = saving_to_database["data"][0]["extracted_data"]["date"]
        complete_journal_entry["source_id"] = saving_to_database["data"][0]["id"]
        print("⭐⭐⭐⭐⭐⭐", complete_journal_entry)

        # save journal entry
        save_journal_entry = await save_to_db(user_id, complete_journal_entry, "journal_entries")
        print("⭐⭐⭐⭐⭐⭐⭐", save_journal_entry)

        # ledger entry 
        # here we return two ledger entries for each of the account involved in the transaction.
        ledger_entries = await create_ledger_entry(complete_journal_entry, payload.job_id)
        print("⭐⭐⭐⭐⭐⭐⭐⭐", ledger_entries)

        # saving ledger entries
        save_entry_results = []
        for entry in ledger_entries["ledger_entries"]:
            complete_entry = entry
            complete_entry["user_id"] = user_id
            complete_entry["journal_entry_id"] = save_journal_entry["data"][0]["id"]
            save_entry = await save_to_db(user_id, complete_entry, "ledger_entries")
            save_entry_results.append(save_entry)
        
        print("⭐⭐⭐⭐⭐⭐⭐⭐⭐", save_entry_results)

        # end of process
        result = await update_in_db(
            item_id=str(payload.job_id),
            updated_data={
                "status": "parsed",
                "document_id": saving_to_database["data"][0]["id"],
                "journal_entry_id": save_journal_entry["data"][0]["id"],
                "debit_ledger_entry_id": save_entry_results[0]["data"][0]["id"],
                "credit_ledger_entry_id": save_entry_results[1]["data"][0]["id"]
                },
            table_name="document_jobs"
        )

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
        error_message = str(e)
        # Update the job status to failed with error message
        await update_in_db(
            item_id=str(payload.job_id),
            updated_data={
                "status": "failed",
                "error_message": error_message,
                "last_run_at": datetime.utcnow().isoformat()
            },
            table_name="document_jobs"
        )
        raise HTTPException(status_code=500, detail=f"Error processing document: {error_message}")
