"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPDF } from "@/actions/uploadPDF";
import { AlertCircle, CheckCircle, CloudUpload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

function FileDrop() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (!user) {
        alert("Please sign in to upload files!");
        return;
      }

      const fileArray = Array.from(files);
      const pdfFiles = fileArray.filter(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        alert("Please upload PDF files only");
        return;
      }

      setIsUploading(true);

      // Start the upload process and redirect immediately
      const uploadPromise = (async () => {
        try {
          const newUploadedFiles: string[] = [];
          for (const file of pdfFiles) {
            const formData = new FormData();
            formData.append("file", file);

            const result = await uploadPDF(formData, user.id);

            if (!result.success) {
              throw new Error(result.error);
            }

            newUploadedFiles.push(file.name);
          }

          setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);
          // Clear uploaded files list after 5 seconds
          setTimeout(() => {
            setUploadedFiles([]);
          }, 5000);
        } catch (error) {
          console.error("Upload failed:", error);
          // Since we're redirecting, we'll just log the error
          console.error(
            `Upload failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        } finally {
          setIsUploading(false);
        }
      })();

      // Redirect to entries page immediately
      router.push("/entries");

      // Continue processing in the background
      await uploadPromise;
    },
    [user, router]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (!user) {
        alert("Please sign in to upload files!");
        return;
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [user, handleUpload]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleUpload(e.target.files);
      }
    },
    [handleUpload]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isUserSignedIn = !!user;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isUserSignedIn ? triggerFileInput : undefined}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDraggingOver ? "border-blue-500 bg-blue-50" : "border-gray-300"} 
          ${!isUserSignedIn ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-2"></div>
            <p>Uploading...</p>
          </div>
        ) : !isUserSignedIn ? (
          <>
            <CloudUpload className="mx-auto h-12 w-12 text-gray-400" />
            <p>Please sign in to upload files.</p>
          </>
        ) : (
          <>
            <CloudUpload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop PDF files here, or click to select files.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,.pdf"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium">Uploaded files:</h3>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            {uploadedFiles.map((fileName, i) => (
              <li key={i} className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                {fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FileDrop;
