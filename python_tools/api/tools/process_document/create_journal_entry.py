"""
Creates journal entries from extracted document data.
"""
from typing import Dict, List
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # required, but unused
)

async def create_journal_entry(extracted_data: Dict) -> Dict:
    """
    Create journal entries based on the extracted document data.
    
    Args:
        extracted_data (Dict): The extracted data from the document
        
    Returns:
        Dict: Journal entries with debit and credit transactions
    """
    try:
        # pass

        extracted_data_json = json.dumps(extracted_data)

        prompt =  f"""
            Create a correct and valid journal entry from the data provided.

            data : {extracted_data_json}
            create a journal entry the data in JSON format with the following keys
            {{
                "account_debited": "(string) debit account name",
                "account_credited": "(string) credit account name",
                "amount": "(number) amount involved",
                "description": "(string) a basic journal description"
            }}
        """

        # Call OpenAI API
        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are a smart chatered accountant. Your job is to create correct journal entry from given data."
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
        # import json
        data = json.loads(journal_json)
            
        return {
            "success": True,
            "journal_entries": data,
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "journal_entries": None,
            "error": str(e)
        }
