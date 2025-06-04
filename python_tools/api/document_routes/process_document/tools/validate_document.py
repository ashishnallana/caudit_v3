"""
validates if the uploaded document is a financial document/invoice and identifies document type.
"""

from fastapi import HTTPException
from typing import Dict, List
import re
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # required, but unused
)

async def validate_document(content: List[str]) -> Dict:
    """
    Validate the document content to check if it's a valid financial document or invoice
    """
    try:
        validation_results = {
            "is_valid": True,
            "checks": {
                "has_content": False,
                "has_required_fields": False
            },
            "errors": None,
            "document_type": None,
            "confidence_score": 0.0
        }

        # Check if content exists
        if not content or len(content) == 0:
            validation_results["is_valid"] = False
            validation_results["errors"].append("Document has no content")
            return validation_results

        validation_results["checks"]["has_content"] = True

        # Combine all pages for analysis
        full_text = " ".join(content)

        # Prepare the prompt for OpenAI
        prompt = f"""
        Analyze the following document content and determine:
        1. Is this a financial document or invoice or some receipt?
        2. What type of document is it specifically? Choose one out of the following (sales_invoices, purchase_invoices, expense_bills, cash_receipts, cash_payments, bank_transactions)
        3. Does it contain essential financial fields (amounts, dates, parties involved)?
        4. What is your confidence score (0-1) in this assessment?

        Document content:
        {full_text[:4000]}

        Respond in JSON format:
        {{
            "is_valid": boolean,
            "document_type": string,
            "has_required_fields": boolean,
            "confidence_score": float,
            "explanation": string
        }}
        """ 

        # Call OpenAI API
        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {"role": "system", "content": "You are a document analysis expert specializing in financial documents and invoices."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Low temperature for more consistent results
            response_format={ "type": "json_object" }
        )

        # Parse the response
        analysis = response.choices[0].message.content
        import json
        analysis_data = json.loads(analysis)

        # Map the analysis data to validation results
        validation_results["checks"]["has_required_fields"] = analysis_data.get("has_required_fields", False)
        validation_results["document_type"] = analysis_data.get("document_type", None)
        validation_results["confidence_score"] = analysis_data.get("confidence_score", 0.0)
        validation_results["is_valid"] = analysis_data.get("is_valid", False)
        

        return validation_results

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during document validation: {str(e)}"
        ) 