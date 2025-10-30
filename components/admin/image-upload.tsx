"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, ImageIcon } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  category?: string
}

export function ImageUpload({
  label,
  value,
  onChange,
  placeholder = "https://...",
  required = false,
  category = "general",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string>(value || "")
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getExistingPath = () => {
    if (!value) return null
    if (value.startsWith("/uploads/")) {
      return `public${value}`
    }
    if (value.startsWith("public/")) {
      return value
    }
    return null
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)
      const existingPath = getExistingPath()
      if (existingPath) {
        formData.append("existingPath", existingPath)
      }

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Upload failed" }))
        throw new Error(error.message || "Upload failed")
      }

      const json = await response.json()
      const newUrl = json.url as string
      setPreview(newUrl)
      onChange(newUrl)
      return newUrl
    } catch (error: any) {
      alert(error.message || "Failed to upload image")
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    void uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    onChange(url)
    setPreview(url)
  }

  const handleClear = () => {
    setPreview("")
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {preview && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <Image src={preview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-semibold text-primary hover:underline"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Click to upload"}
            </button>
            <span className="text-muted-foreground"> or drag and drop</span>
          </div>
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image-url" className="text-xs">
          Or paste image URL
        </Label>
        <Input id="image-url" type="url" value={value} onChange={handleUrlChange} placeholder={placeholder} />
      </div>
    </div>
  )
}
