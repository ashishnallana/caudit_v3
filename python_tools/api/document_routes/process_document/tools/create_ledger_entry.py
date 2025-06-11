"""
Creates ledger entries from journal entry data.
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

async def create_ledger_entry(journal_entry: Dict) -> Dict:
    """
    Create ledger entries based on the journal entry data.

    what is in credit in JE, will go to the debit side in ledger entry and vice versa
    
    Args:
        journal_entry (Dict): The journal entry data containing debit and credit information
        
    Returns:
        Dict: Ledger entries for both debit and credit accounts
    """
    try:
        journal_entry_json = journal_entry
        # journal_entry_json = json.dumps(journal_entry)

        # we will be creating 2 entries for each account involved in the  journal entry

        entry1 = {
            "account_name": journal_entry_json["account_debited"],
            "transaction_type": "debit",
            "amount": journal_entry_json["amount"],
            "entry_date": journal_entry_json["entry_date"],
            "description": f"""To {journal_entry_json["account_credited"]}"""

        }

        entry2 = {
            "account_name": journal_entry_json["account_credited"],
            "transaction_type": "credit",
            "amount": journal_entry_json["amount"],
            "entry_date": journal_entry_json["entry_date"],
            "description": f"""By {journal_entry_json["account_debited"]}"""
        }

            
        return {
            "success": True,
            "ledger_entries": [entry1, entry2],
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "ledger_entries": None,
            "error": str(e)
        } 