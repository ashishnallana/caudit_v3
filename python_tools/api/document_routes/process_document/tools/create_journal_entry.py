"""
Creates journal entries from extracted document data.
"""
from fastapi import HTTPException
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

async def create_journal_entry(transaction_details: Dict, job_id: str) -> Dict:
    """
    Create journal entries based on the extracted document data.
    
    Args:
        extracted_data (Dict): The extracted data from the document
        job_id (str, optional): The ID of the job for error tracking
        
    Returns:
        Dict: Journal entries with debit and credit transactions
    """
    try:
        transaction_description = transaction_details["description"]

        prompt =  f"""
            Create a journal entry from the transaction description.

            Generate response as in the following examples.
            1. Purchased goods for cash Rs.10,000
            {{
                "debit_account": "Purchase A/c",
                "credit_account": "Capital A/c",
                "amount": 10,000,
                "description": "Being purchased goods for cash"
            }}
            2. Purchased goods from Kiran Rs.10,000
            {{
                "debit_account": "Purchase A/c",
                "credit_account": "Kiran A/c",
                "amount": 10,000,
                "description": "Being purchased goods from Kiran"
            }}
            3. Received interest Rs.2,000
            {{
                "debit_account": "Cash A/c",
                "credit_account": "Interest A/c",
                "amount": 2,000 ,
                "description": "Being interest received"
            }}
            4. Paid Salaries Rs.30,000
            {{
                "debit_account": "Salaries A/c",
                "credit_account": "Cash A/c",
                "amount": 30,000,
                "description": "Being salaries paid"
            }}
            5. Withdrawn cash from bank Rs. 8,000
            {{
                "debit_account": "Cash A/c",
                "credit_account": "Bank A/c",
                "amount": 8000 ,
                "description": "Being withdrawn cash from bank"
            }}

            Transaction details : {transaction_description}
            create a journal entry in JSON format with the following keys
            {{
                "debit_account": "(string) debit account name",
                "credit_account": "(string) credit account name",
                "amount": "(number) amount involved",
                "description": "(string) a basic journal description"
            }}

            Make sure account names end with "A/c" example : Cash A/c, Bank A/c etc.

            Return only a valid JSON object.
        """

        # Call OpenAI API
        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert in accounting, your job is to create a journal entry from provided transaction details."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,  # Low temperature for more consistent results
            response_format={ "type": "json_object" }
        )

        result = response.choices[0].message.content
        result_json = json.loads(result)
        result_json["entry_date"] = transaction_details["date"]
            
        return result_json
        
    except Exception as e:
        error_message = f"Journal Entry error : {str(e)}"
        raise HTTPException(status_code=500, detail=error_message) 
        # if job_id:
        #     await update_in_db(
        #         item_id=job_id,
        #         updated_data={
        #             "status": "failed",
        #             "error_message": f"Error creating journal entry: {error_message}",
        #             "last_run_at": datetime.utcnow().isoformat()
        #         },
        #         table_name="document_jobs"
        #     )
