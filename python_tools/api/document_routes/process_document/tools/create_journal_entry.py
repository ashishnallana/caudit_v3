"""
Creates journal entries from extracted document data.
"""
from typing import Dict, List
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
import json
from .update_in_db import update_in_db

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # required, but unused
)

async def create_journal_entry(extracted_data: Dict, job_id: str = None) -> Dict:
    """
    Create journal entries based on the extracted document data.
    
    Args:
        extracted_data (Dict): The extracted data from the document
        job_id (str, optional): The ID of the job for error tracking
        
    Returns:
        Dict: Journal entries with debit and credit transactions
    """
    try:
        extracted_data_json = json.dumps(extracted_data["extracted_data"])

        prompt =  f"""
            Create a correct and valid journal entry from the data provided.

            data : {extracted_data_json}
            create a journal entry in JSON format with the following keys
            {{
                "account_debited": "(string) debit account name",
                "account_credited": "(string) credit account name",
                "amount": "(number) amount involved",
                "description": "(string) a basic journal description"
            }}

            Make sure account names end with "A/c" example : Cash A/c, Bank A/c etc.
        """

        # Call OpenAI API
        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are a smart accountant. Your job is to create journal entry from given data."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,  # Low temperature for more consistent results
            response_format={ "type": "json_object" }
        )

        journal_json = response.choices[0].message.content
        data = json.loads(journal_json)
            
        return {
            "success": True,
            "journal_entries": data,
            "error": None
        }
        
    except Exception as e:
        error_message = str(e)
        if job_id:
            await update_in_db(
                item_id=job_id,
                updated_data={
                    "status": "failed",
                    "error_message": f"Error creating journal entry: {error_message}",
                    "last_run_at": datetime.utcnow().isoformat()
                },
                table_name="document_jobs"
            )
        return {
            "success": False,
            "journal_entries": None,
            "error": error_message
        }
