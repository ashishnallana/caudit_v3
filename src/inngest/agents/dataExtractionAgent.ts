import { extractPDFFromUrl } from "@/actions/extractPDFFromUrl";
import { createAgent, createTool, openai } from "@inngest/agent-kit";
import { z } from "zod";

const extractDataTool = createTool({
    name: "extract-data",
    description: "Extracts relevant data from the financial document based on its type",
    parameters: z.object({
        pdfUrl: z.string(),
        documentType: z.string(),
    }),
    handler: async ({ pdfUrl, documentType }, { step, network }) => {
        console.log("🔍 Starting data extraction for document type:", documentType);

        try {
            // Get the document type from network state if not provided
            const actualDocumentType = documentType || network?.state.kv.get("document-type");
            console.log("📄 Document type from state:", actualDocumentType);

            if (!actualDocumentType) {
                throw new Error("No document type provided or found in state");
            }

            // Extract text content from the PDF
            console.log("📄 Attempting to extract PDF content...");
            const { content } = await extractPDFFromUrl(pdfUrl);
            console.log("📄 PDF Content extracted:", content ? "Content received" : "No content");

            if (!content) {
                throw new Error("No content extracted from PDF");
            }

            // Get the schema for the document type
            const schema = getSchemaForDocumentType(actualDocumentType);
            if (!schema) {
                throw new Error(`Invalid document type: ${actualDocumentType}`);
            }
            console.log("📋 Using schema for:", actualDocumentType);

            console.log("🤖 Starting AI inference...");
            const result = await step?.ai.infer("extract-data", {
                model: openai({
                    model: "gpt-4o-mini",
                    defaultParameters: {
                        max_completion_tokens: 2000,
                    },
                }),
                body: {
                    messages: [
                        {
                            role: "system",
                            content: `You are an AI system that extracts structured data from financial documents.
Your task is to analyze the document content and extract all relevant information based on the document type.
You must return a JSON object matching the provided schema exactly.

Document Type: ${actualDocumentType}
Required Schema:
${JSON.stringify(schema, null, 2)}

Important:
1. Extract all fields specified in the schema
2. Format dates as YYYY-MM-DD
3. Format amounts as numbers (not strings)
4. Ensure all required fields are present
5. Return only the extracted data in the exact schema format
6. For items array, ensure each item has all required fields (description, quantity, rate, amount)`
                        },
                        {
                            role: "user",
                            content: `Please extract all relevant data from this ${actualDocumentType}:

${content}`
                        }
                    ],
                },
            });

            console.log("🤖 AI Response received:", result);

            if (!result) {
                throw new Error("No response from AI model");
            }

            const messageContent = result.choices?.[0]?.message?.content;
            if (!messageContent) {
                throw new Error("No message content in AI response");
            }

            let extractedData;
            try {
                extractedData = JSON.parse(messageContent);
            } catch (error) {
                console.error("Failed to parse AI response:", messageContent);
                throw new Error("Invalid JSON response from AI model");
            }

            console.log("📄 Extracted Data:", extractedData);

            // Store the extracted data in the network state
            network?.state.kv.set("extracted-data", extractedData);
            network?.state.kv.set("data-extracted", true);

            console.log("✅ Data extraction completed successfully");
            return extractedData;
        } catch (error) {
            console.error("❌ Error in extractDataTool:", error);
            network?.state.kv.set("data-extracted", false);
            network?.state.kv.set("extraction-error", error instanceof Error ? error.message : "Unknown error");
            return {
                error: true,
                message: error instanceof Error ? error.message : "Unknown error occurred during extraction"
            };
        }
    },
});

// Helper function to get schema based on document type
function getSchemaForDocumentType(documentType: string) {
    const schemas = {
        "Purchase Invoice": {
            invoice_number: "string",
            vendor_name: "string",
            invoice_date: "string",
            items: [{
                description: "string",
                quantity: "number",
                rate: "number",
                amount: "number"
            }],
            total_amount: "number",
            tax_amount: "number",
            payment_mode: "string"
        },
        "Sales Invoice": {
            invoice_number: "string",
            customer_name: "string",
            invoice_date: "string",
            items: [{
                description: "string",
                quantity: "number",
                rate: "number",
                amount: "number"
            }],
            total_amount: "number",
            tax_amount: "number",
            payment_terms: "string"
        },
        "Cash Receipt": {
            receipt_number: "string",
            payer_name: "string",
            receipt_date: "string",
            amount: "number",
            payment_mode: "string",
            description: "string"
        },
        "Cash Payment": {
            payment_number: "string",
            payee_name: "string",
            payment_date: "string",
            amount: "number",
            payment_mode: "string",
            description: "string"
        },
        "Bank Statement": {
            transaction_date: "string",
            description: "string",
            debit_amount: "number",
            credit_amount: "number",
            balance: "number",
            transaction_type: "string"
        },
        "Expense Bill": {
            bill_number: "string",
            vendor_name: "string",
            bill_date: "string",
            expense_category: "string",
            amount: "number",
            tax_amount: "number",
            payment_mode: "string"
        }
    };

    return schemas[documentType as keyof typeof schemas] || null;
}

export const dataExtractionAgent = createAgent({
    name: "Data Extraction Agent",
    description: "Extracts structured data from financial documents based on their type",
    system: `You are an AI-powered data extraction assistant. Your role is to:
    1. Extract all relevant fields based on the document type
    2. Format the data according to the provided schema
    3. Ensure all required fields are present
    4. Handle different document formats and layouts
    5. Normalize dates, amounts, and other fields to the correct format`,
    model: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
            max_completion_tokens: 2000,
        }
    }),
    tools: [extractDataTool],
});