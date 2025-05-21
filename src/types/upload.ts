export interface UploadResponse {
    success: boolean;
    error?: string;
    data?: {
        path: string;
        fileName: string;
    };
} 