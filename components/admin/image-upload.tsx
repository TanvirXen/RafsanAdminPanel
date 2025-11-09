"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import apiList from "@/apiList";
import { toast } from "react-toastify";

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxSizeMB?: number;
}

export function ImageUpload({
  label,
  value,
  onChange,
  placeholder = "https://...",
  required = false,
  maxSizeMB = 10,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(value || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- tiny uploader (multipart) ---
  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Max file size is ${maxSizeMB} MB`);
      return;
    }

    try {
      setIsUploading(true);

      // Optional: quick local preview while uploading
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch(apiList.upload.image, {
        method: "POST",
        body: fd,
        // if your API auth uses cookies:
        // credentials: "include",
        // if you use bearer tokens instead, add:
        // headers: { Authorization: `Bearer ${yourToken}` },
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Image upload failed");
      }

      const j = (await res.json()) as {
        ok: true;
        url: string;
        filename: string;
        mimeType: string;
        size: number;
      };

      onChange(j.url);
      setPreview(j.url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
      // if the upload failed, revert the optimistic local preview
      if (!value) setPreview("");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // --- handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    onChange(url);
    setPreview(url);
  };
  const handleClear = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className='space-y-2'>
      <Label>
        {label} {required && <span className='text-red-500'>*</span>}
      </Label>

      {preview && (
        <div className='relative aspect-video w-full overflow-hidden rounded-lg border bg-muted'>
          {/* If you serve images from a different domain, allow it in next.config.js -> images.domains */}
          <Image
            src={preview || "/placeholder.svg"}
            alt='Preview'
            fill
            className='object-cover'
          />
          <div className='absolute right-2 top-2 flex gap-2'>
            {isUploading && (
              <span className='inline-flex items-center rounded bg-background/80 px-2 py-1 text-xs'>
                <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                Uploading…
              </span>
            )}
            <Button
              type='button'
              variant='destructive'
              size='icon'
              className='h-8 w-8'
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        } ${isUploading ? "opacity-70" : ""}`}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleInputChange}
          className='hidden'
          disabled={isUploading}
        />
        <div className='flex flex-col items-center gap-2'>
          <ImageIcon className='h-8 w-8 text-muted-foreground' />
          <div className='text-sm'>
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              className='font-semibold text-primary hover:underline'
              disabled={isUploading}
            >
              {isUploading ? "Uploading…" : "Click to upload"}
            </button>
            <span className='text-muted-foreground'> or drag and drop</span>
          </div>
          <p className='text-xs text-muted-foreground'>
            PNG, JPG, WebP, AVIF, GIF, SVG up to {maxSizeMB}MB
          </p>
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor={`${label}-image-url`} className='text-xs'>
          Or paste image URL
        </Label>
        <Input
          id={`${label}-image-url`}
          type='url'
          value={value}
          onChange={handleUrlChange}
          placeholder={placeholder}
          disabled={isUploading}
          required={required && !preview}
        />
      </div>
    </div>
  );
}
