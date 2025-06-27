"""
validates if the uploaded document and the description gives all the required information.
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

async def validate_and_extract_details(document_content: List[str], transaction_description: str) -> Dict:
    """
    Validate the document content and the transaction's description to check if it's a valid transaction to make a journal entry.
    """
    try:
        # Combine all pages of the document
        document_content_str = " ".join(document_content)

        prompt = f"""
        Analyze the following document content and transaction description and extract the required information.
        
        Transaction description: "{transaction_description}"
        Document content: ```{document_content_str[:4000]}```

        Please analyze the provided document content and transaction description. Your task is to determine if they together support a valid financial transaction, and to extract key details.
        Set the value to NULL if the information is not available.

        Return your answer as a JSON object with the following fields:
        {{
            "is_valid_data": boolean   // true if both the document and description support a valid transaction; false otherwise
            "description": string      // Suggest a clear, improved transaction description based on both the document and the original description. Include details such as the amount involved and the accounts affected.
            "date": string             // The date of the transaction, in YYYY-MM-DD format. If no valid date is provided set it to null.
            "reference_no": string // get the supporting document's reference number such as transaction id, invoice number or reciept number etc. If no valid reference number is provided set it to null.
        }}
        """ 

        # Call OpenAI API
        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {"role": "system", "content": "You are an expert in accounting, your job is to check if the given data supports a valid transaction and extract key information from the provided data."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for more consistent results
            response_format={ "type": "json_object" }
        )

        # Parse the response
        result = response.choices[0].message.content
        import json
        result_json = json.loads(result)

        if result_json["is_valid_data"] == False:
            raise HTTPException(status_code=400, detail="Invalid data")
        
        if result_json["date"] == None:
            raise HTTPException(status_code=400, detail="No date provided.")

        return result_json

    except Exception as e:
        error_message = f"Data error : {str(e)}"
        raise HTTPException(status_code=500, detail=error_message) 