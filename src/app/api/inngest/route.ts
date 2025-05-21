import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processDocument } from "@/inngest/agent";

// api that serves zero functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        // functions will be passed here.
        processDocument
    ],
})