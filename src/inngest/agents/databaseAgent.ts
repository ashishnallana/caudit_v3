import { createAgent, createTool, openai } from "@inngest/agent-kit";
import { createClient } from '@supabase/supabase-js';
import { z } from "zod";

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const saveToDatabaseTool = createTool({
    name: "save-to-database",
    description: "Saves the extracted data to the appropriate database table",
    parameters: z.object({}),
    handler: async (_, { step, network }) => {
        console.log("💾 Starting database save process");

        try {
            // Get the document type and extracted data from network state
            const documentType = network?.state.kv.get("document-type");
            const extractedData = network?.state.kv.get("extracted-data");
            const userId = network?.state.kv.get("user-id");

            console.log("📄 Retrieved from state:", { documentType, userId });

            if (!documentType || !extractedData || !userId) {
                throw new Error("Missing required data from network state");
            }

            // Get the table name based on document type
            const tableName = getTableName(documentType);
            if (!tableName) {
                throw new Error(`Invalid document type: ${documentType}`);
            }

            console.log("📊 Saving to table:", tableName);

            // Prepare the data for database insertion
            const preparedData = prepareDataForDatabase(extractedData, documentType, userId);
            console.log("📄 Prepared data:", preparedData);

            // Save to database
            if (!step) {
                throw new Error("Step is undefined");
            }

            const result = await step.run("save-to-database", async () => {
                console.log("💾 Attempting to save to database...");
                const { data: savedData, error } = await supabase
                    .from(tableName)
                    .insert([preparedData])
                    .select()
                    .single();

                if (error) {
                    console.error("❌ Database error:", error);
                    throw error;
                }

                return savedData;
            });

            console.log("✅ Data saved successfully:", result);

            // Update network state
            network?.state.kv.set("saved-to-database", true);
            network?.state.kv.set("saved-document-id", result.id);

            return result;
        } catch (error) {
            console.error("❌ Error in saveToDatabaseTool:", error);
            network?.state.kv.set("saved-to-database", false);
            network?.state.kv.set("database-error", error instanceof Error ? error.message : "Unknown error");
            return {
                error: true,
                message: error instanceof Error ? error.message : "Unknown error occurred during database save"
            };
        }
    },
});

// Helper function to get table name based on document type
function getTableName(documentType: string): string | null {
    const tableMap = {
        "Purchase Invoice": "purchase_invoices",
        "Sales Invoice": "sales_invoices",
        "Cash Receipt": "cash_receipts",
        "Cash Payment": "cash_payments",
        "Bank Statement": "bank_transactions",
        "Expense Bill": "expense_bills"
    };

    return tableMap[documentType as keyof typeof tableMap] || null;
}

// Helper function to prepare data for database insertion
function prepareDataForDatabase(data: any, documentType: string, userId: string) {
    const baseData = {
        user_id: userId,
        created_at: new Date().toISOString()
    };

    switch (documentType) {
        case "Purchase Invoice":
            return {
                ...baseData,
                invoice_number: data.invoice_number,
                vendor_name: data.vendor_name,
                invoice_date: data.invoice_date,
                items: data.items,
                total_amount: data.total_amount,
                tax_amount: data.tax_amount || 0,
                payment_mode: data.payment_mode
            };

        case "Sales Invoice":
            return {
                ...baseData,
                invoice_number: data.invoice_number,
                customer_name: data.customer_name,
                invoice_date: data.invoice_date,
                items: data.items,
                total_amount: data.total_amount,
                tax_amount: data.tax_amount || 0,
                payment_terms: data.payment_terms
            };

        case "Cash Receipt":
            return {
                ...baseData,
                receipt_number: data.receipt_number,
                payer_name: data.payer_name,
                receipt_date: data.receipt_date,
                amount: data.amount,
                payment_mode: data.payment_mode,
                description: data.description
            };

        case "Cash Payment":
            return {
                ...baseData,
                payment_number: data.payment_number,
                payee_name: data.payee_name,
                payment_date: data.payment_date,
                amount: data.amount,
                payment_mode: data.payment_mode,
                description: data.description
            };

        case "Bank Statement":
            return {
                ...baseData,
                transaction_date: data.transaction_date,
                description: data.description,
                debit_amount: data.debit_amount || 0,
                credit_amount: data.credit_amount || 0,
                balance: data.balance,
                transaction_type: data.transaction_type
            };

        case "Expense Bill":
            return {
                ...baseData,
                bill_number: data.bill_number,
                vendor_name: data.vendor_name,
                bill_date: data.bill_date,
                expense_category: data.expense_category,
                amount: data.amount,
                tax_amount: data.tax_amount || 0,
                payment_mode: data.payment_mode
            };

        default:
            throw new Error(`Unsupported document type: ${documentType}`);
    }
}

export const databaseAgent = createAgent({
    name: "Database Agent",
    description: "Saves extracted data to the appropriate database table",
    system: `You are a database management assistant. Your role is to:
    1. Save extracted data to the correct database table
    2. Handle database operations safely
    3. Ensure data integrity
    4. Return appropriate success/error messages

    IMPORTANT: You MUST use the save-to-database tool to save the data. The tool will handle all the necessary database operations.
    Do not try to save the data directly - always use the save-to-database tool.`,
    model: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
            max_completion_tokens: 1000,
        }
    }),
    tools: [saveToDatabaseTool],
}); 