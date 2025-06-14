"""
Extracts structured data from document content using LLM.
"""

from fastapi import HTTPException
from typing import Dict, List
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

req_formats = {
  "purchase_invoices" : {
    "invoice_number": "(text) invoice number",
    "vendor_name" : "(text) name of the vendor",
    "date" : "(date) date of the invoice",
    "items" : "([{desc, qty, rate, amount}, …]) list of items",
    "total_amount" : "(number) total amount",
    "tax_amount" : "(number) tax amount",
    "payment_mode" : "(text) mode of payment"
  },
  "sales_invoices": {
    "invoice_number": "(text) Invoice number",
    "customer_name": "(text) Name of the customer",
    "date": "(date) Date of the invoice",
    "items": "([{'desc': text, 'qty': number, 'rate': number, 'amount': number}, ...]) List of invoice items",
    "total_amount": "(number) Total amount including all charges",
    "tax_amount": "(number) Tax amount (optional, defaults to 0)",
    "payment_terms": "(text) Payment terms (e.g., Net 30, Due on receipt)"
  },

  "cash_receipts": {
    "receipt_number": "(text) Receipt number",
    "payer_name": "(text) Name of the payer",
    "date": "(date) Date of the receipt",
    "amount": "(number) Amount received",
    "payment_mode": "(text) Mode of payment (e.g., cash, card, bank transfer)",
    "description": "(text) Generate additional notes or description"
  },

  "cash_payments": {
    "payment_number": "(text) Payment number",
    "payee_name": "(text) Name of the payee",
    "date": "(date) Date of the payment",
    "amount": "(number) Amount paid",
    "payment_mode": "(text) Mode of payment (e.g., cash, cheque)",
    "description": "(text) Generate additional notes or description"
  },

  "bank_transactions": {
    "date": "(date) Date of the transaction",
    "description": "(text) Transaction description",
    "debit_amount": "(number) Amount debited (optional, defaults to 0)",
    "credit_amount": "(number) Amount credited (optional, defaults to 0)",
    "balance": "(number) Account balance after the transaction",
    "transaction_type": "(text) Type of transaction (e.g., NEFT, IMPS, Cheque)"
  },

  "expense_bills": {
    "bill_number": "(text) Bill number",
    "vendor_name": "(text) Name of the vendor",
    "date": "(date) Date of the bill",
    "expense_category": "(text) Expense category (e.g., Travel, Utilities)",
    "amount": "(number) Bill amount",
    "tax_amount": "(number) Tax amount (optional, defaults to 0)",
    "payment_mode": "(text) Mode of payment (e.g., cash, card, bank transfer)"
  }
}


async def extract_data(content: List[str], document_type: str, job_id: str = None) -> Dict:
    """
    Extract structured data from document content based on document type
    """
    try:
        # Combine all pages for analysis
        full_text = " ".join(content)

        # Get fields for the specific document type
        fields = req_formats.get(document_type, {})
        if not fields:
            error_message = f"Unsupported document type: {document_type}"
            if job_id:
                await update_in_db(
                    item_id=job_id,
                    updated_data={
                        "status": "failed",
                        "error_message": error_message,
                        "last_run_at": datetime.utcnow().isoformat()
                    },
                    table_name="document_jobs"
                )
            raise HTTPException(status_code=400, detail=error_message)

        # Prepare the prompt for data extraction
        prompt = f"""
        Extract the following information from the document content. If a field is not found, set it to null.
        
        Document content:
        {full_text[:4000]}

        Required fields, their types and description:
        {fields}

        Respond in JSON format with the extracted data. Ensure all dates are in YYYY-MM-DD format.
        """

        # Call OpenAI API
        response = client.chat.completions.create(
            model="llama3:latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are a document data extraction expert. Extract only the requested fields and format them according to the specified types."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,  # Low temperature for more consistent results
            response_format={ "type": "json_object" }
        )

        # Parse the response
        extracted_data = response.choices[0].message.content
        import json
        data = json.loads(extracted_data)

        return {
            "document_type": document_type,
            "extracted_data": data,
            "confidence_score": 0.95  # You might want to get this from the LLM response
        }

    except Exception as e:
        error_message = f"Error during data extraction: {str(e)}"
        if job_id:
            await update_in_db(
                item_id=job_id,
                updated_data={
                    "status": "failed",
                    "error_message": error_message,
                    "last_run_at": datetime.utcnow().isoformat()
                },
                table_name="document_jobs"
            )
        raise HTTPException(status_code=500, detail=error_message)

