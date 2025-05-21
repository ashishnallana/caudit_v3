import { extractPDFFromUrl } from "@/actions/extractPDFFromUrl";
import { createAgent, createTool, openai } from "@inngest/agent-kit";
import { z } from "zod";

const validateDocumentTool = createTool({
    name: "validate-document",
    description: "Validates if the PDF is a valid financial document",
    parameters: z.object({
        pdfUrl: z.string(),
    }),
    handler: async ({ pdfUrl }, { step, network }) => {
        console.log("🔍 Starting document validation for URL:", pdfUrl);

        try {
            // Extract text content from the PDF
            console.log("📄 Attempting to extract PDF content...");
            const { content } = await extractPDFFromUrl(pdfUrl);
            console.log("📄 PDF Content extracted:", content ? "Content received" : "No content");

            if (!content) {
                throw new Error("No content extracted from PDF");
            }

            console.log("🤖 Starting AI inference...");
            const result = await step?.ai.infer("validate-document", {
                model: openai({
                    model: "gpt-4o-mini",
                    defaultParameters: {
                        max_completion_tokens: 1000,
                    },
                }),
                body: {
                    messages: [
                        {
                            role: "system",
                            content: `You are an AI system that validates financial documents. 
Your task is to analyze document content and determine if it's a valid financial document.
You must return a JSON object with the following structure:
{
    "isValid": boolean,
    "documentType": string | null,
    "reason": string
}

Valid document types are:
- Purchase Invoice
- Sales Invoice
- Cash Receipt
- Cash Payment
- Bank Statement
- Expense Bill

If the document is not a valid financial document, set isValid to false, documentType to null, and provide a reason.
If the document is valid, set isValid to true, specify the documentType, and provide a brief reason for the classification.`
                        },
                        {
                            role: "user",
                            content: `Please analyze this document content and determine if it's a valid financial document:

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

            const response = JSON.parse(messageContent);
            console.log("📄 Parsed Response:", response);

            if (!response.isValid || !response.documentType || !response.reason) {
                throw new Error("Invalid response structure from AI model");
            }

            // Set the validation state in the network
            if (response.isValid) {
                network?.state.kv.set("document-validated", true);
                network?.state.kv.set("document-type", response.documentType);
                network?.state.kv.set("validation-reason", response.reason);
            } else {
                network?.state.kv.set("document-validated", false);
                network?.state.kv.set("validation-error", response.reason);
            }

            console.log("✅ Document validation completed successfully");
            return response;
        } catch (error) {
            console.error("❌ Error in validateDocumentTool:", error);
            network?.state.kv.set("document-validated", false);
            network?.state.kv.set("validation-error", error instanceof Error ? error.message : "Unknown error");
            return {
                isValid: false,
                documentType: null,
                reason: error instanceof Error ? error.message : "Unknown error occurred during validation",
                error: true
            };
        }
    },
});

export const documentValidationAgent = createAgent({
    name: "Document Validation Agent",
    description: "Validates if a document is a valid financial document",
    system: `You are an AI-powered document validation assistant. Your role is to:
    1. Determine if a document is a valid financial document or not.
    2. Identify the type of financial document from these categories:
       - Purchase Invoice
       - Sales Invoice
       - Cash Receipt
       - Cash Payment
       - Bank Statement
       - Expense Bill
    3. Return structured data for further processing.
    `,
    model: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
            max_completion_tokens: 1000,
        }
    }),
    tools: [validateDocumentTool],
}); 