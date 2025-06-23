"""
validates if the uploaded document is a financial document/invoice and identifies document type.
"""

from fastapi import HTTPException
from typing import Dict, List
import re
import os
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime
from .update_in_db import update_in_db

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # required, but unused
)

async def validate_document(document_content: List[str], transaction_description: str) -> Dict:
    """
    Validate the document content and the transaction's description to check if it's a valid transaction to make a journal entry.
    """
    try:
        # Combine all pages of the document
        document_content_str = " ".join(document_content)

        prompt = f"""
        Analyze the following document content and transaction description and determine if it is a valid transaction with a supporting document.
        
        Transaction description: "{transaction_description}"
        Document content: ```{document_content_str[:4000]}```

        Respond in JSON format:
        {{
            "is_valid_data": boolean (true if the document and the description supports a valid transaction, otherwise false),
            "description" : str (Suggest a more suited description for the transaction based on the document content and previous description)
        }}
        """ 

        # Call OpenAI API
        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {"role": "system", "content": "You are an expert in accounting, your job is to check if the given data supports a valid transaction to create a journal entry."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for more consistent results
            response_format={ "type": "json_object" }
        )

        # Parse the response
        result = response.choices[0].message.content
        import json
        result_json = json.loads(result)

        return result_json

    except Exception as e:
        error_message = f"Error during document validation: {str(e)}"
        raise HTTPException(status_code=500, detail=error_message) 