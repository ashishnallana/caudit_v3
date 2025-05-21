from fastapi import HTTPException
from typing import Dict, List
import re
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def validate_document(content: List[str]) -> Dict:
    """
    Validate the document content using OpenAI GPT-4 to check if it's a valid financial document or invoice
    """
    try:
        validation_results = {
            "is_valid": True,
            "checks": {
                "has_content": False,
                "is_financial_document": False,
                "is_invoice": False,
                "has_required_fields": False
            },
            "errors": [],
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
        1. Is this a financial document or invoice?
        2. What type of document is it specifically?
        3. Does it contain essential financial fields (amounts, dates, parties involved)?
        4. What is your confidence score (0-1) in this assessment?

        Document content:
        {full_text[:4000]}  # Limiting to first 4000 chars to stay within token limits

        Respond in JSON format:
        {{
            "is_financial_document": boolean,
            "is_invoice": boolean,
            "document_type": string,
            "has_required_fields": boolean,
            "confidence_score": float,
            "explanation": string
        }}
        """

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
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

        # Update validation results
        validation_results["checks"]["is_financial_document"] = analysis_data["is_financial_document"]
        validation_results["checks"]["is_invoice"] = analysis_data["is_invoice"]
        validation_results["checks"]["has_required_fields"] = analysis_data["has_required_fields"]
        validation_results["document_type"] = analysis_data["document_type"]
        validation_results["confidence_score"] = analysis_data["confidence_score"]

        # Add explanation to errors if document is invalid
        if not analysis_data["is_financial_document"]:
            validation_results["errors"].append(f"Not a valid financial document: {analysis_data['explanation']}")
            validation_results["is_valid"] = False
        elif not analysis_data["has_required_fields"]:
            validation_results["errors"].append(f"Missing required fields: {analysis_data['explanation']}")
            validation_results["is_valid"] = False

        return validation_results

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during document validation: {str(e)}"
        ) 