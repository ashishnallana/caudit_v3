'use server'

interface PDFExtractionResponse {
    url: string;
    total_pages: number;
    content: string[];
}

interface PDFExtractionError {
    detail: string;
}

export async function extractPDFFromUrl(url: string): Promise<PDFExtractionResponse> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/extract-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json() as PDFExtractionError;
            throw new Error(errorData.detail || 'Failed to extract PDF');
        }

        const data = await response.json() as PDFExtractionResponse;
        return data;
    } catch (error) {
        console.error('Error extracting PDF:', error);
        throw error;
    }
} 