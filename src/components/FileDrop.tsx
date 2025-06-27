"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPDF } from "@/actions/uploadPDF";
import { AlertCircle, CheckCircle, CloudUpload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

function FileDrop() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async () => {
    if (!user) {
      alert("Please sign in to upload files!");
      return;
    }
    if (!uploadedFile) {
      alert("Please select a PDF file to upload");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a transaction description");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      const result = await uploadPDF(formData, user.id, description);
      if (!result.success) {
        throw new Error(result.error);
      }
      router.push("/entries");
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
    }
  }, [user, uploadedFile, description, router]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (
        file &&
        (file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf"))
      ) {
        setUploadedFile(file);
      } else {
        setUploadedFile(null);
        if (file) alert("Please upload a PDF file only");
      }
    },
    []
  );

  const triggerFileInput = useCallback(() => {
    if (!isUploading) fileInputRef.current?.click();
  }, [isUploading]);

  const isUserSignedIn = !!user;
  const canUpload =
    isUserSignedIn && uploadedFile && description.trim() && !isUploading;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        onClick={isUserSignedIn ? triggerFileInput : undefined}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          border-gray-300 ${
            !isUserSignedIn ? "opacity-70 cursor-not-allowed" : ""
          }`}
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
              Click to select a PDF file to upload.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,.pdf"
              multiple={false}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />
            {uploadedFile && (
              <div className="mt-2 text-sm text-gray-700">
                Selected: {uploadedFile.name}
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Transaction Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Sold pro plan to Manish Joshi."
          disabled={isUploading}
          required
        />
      </div>
      <button
        className={`mt-6 w-full py-2 px-4 rounded bg-blue-600 text-white font-semibold transition-colors ${
          canUpload ? "hover:bg-blue-700" : "opacity-60 cursor-not-allowed"
        }`}
        onClick={handleUpload}
        disabled={!canUpload}
        type="button"
      >
        Upload
      </button>
    </div>
  );
}

export default FileDrop;
