import { createNetwork, getDefaultRoutingAgent, openai } from "@inngest/agent-kit";
import { createServer } from "@inngest/agent-kit/server";
import { inngest } from "./client";
import Events from "./constants";
import { documentValidationAgent } from "./agents/documentValidationAgent";
import { dataExtractionAgent } from "./agents/dataExtractionAgent";
import { databaseAgent } from "./agents/databaseAgent";

const agentNetwork = createNetwork({
    name: "Document Processing Team",
    agents: [documentValidationAgent, dataExtractionAgent, databaseAgent],
    defaultModel: openai({
        model: "gpt-4o-mini",
        defaultParameters: {
            max_completion_tokens: 1000,
        }
    }),
    defaultRouter: ({ network }) => {
        // Get the current state
        const documentValidated = network.state.kv.get("document-validated");
        const dataExtracted = network.state.kv.get("data-extracted");
        const savedToDatabase = network.state.kv.get("saved-to-database");

        console.log("🔄 Router State:", { documentValidated, dataExtracted, savedToDatabase });

        // If document is not validated, use validation agent
        if (!documentValidated) {
            console.log("📄 Using Document Validation Agent");
            return documentValidationAgent;
        }

        // If document is validated but data not extracted, use extraction agent
        if (!dataExtracted) {
            console.log("📊 Using Data Extraction Agent");
            return dataExtractionAgent;
        }

        // If both validation and extraction are done but not saved, use database agent
        if (!savedToDatabase) {
            console.log("💾 Using Database Agent");
            return databaseAgent;
        }

        // If everything is done, return undefined to terminate
        console.log("✅ All processing complete");
        return undefined;
    }
});

export const server = createServer({
    agents: [documentValidationAgent, dataExtractionAgent, databaseAgent],
    networks: [agentNetwork],
});

export const processDocument = inngest.createFunction(
    { id: "Process Document" },
    { event: Events.PROCESS_DOCUMENT },
    async ({ event }) => {
        console.log("🚀 Starting document processing for:", event.data.url);

        // Set initial state
        const network = await agentNetwork.run(
            `Process this document: ${event.data.url} for user: ${event.data.userId}. 
            First validate if it's a valid financial document. 
            If valid, extract all relevant data and save it to the database. 
            If invalid, return an error message.`
        );

        // Set user ID in network state
        network.state.kv.set("user-id", event.data.userId);

        // Get the final result
        const processedDocument = network.state.kv.get("processed-document");
        const savedDocumentId = network.state.kv.get("saved-document-id");
        console.log("✅ Processing completed:", { processedDocument, savedDocumentId });

        return {
            processedDocument,
            savedDocumentId,
            success: !!savedDocumentId
        };
    }
); 