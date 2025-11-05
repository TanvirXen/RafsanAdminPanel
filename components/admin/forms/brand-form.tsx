"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/admin/image-upload"

interface BrandFormProps {
  initialData?: any
  onSave: (data: any) => void
  onCancel: () => void
}

export function BrandForm({ initialData, onSave, onCancel }: BrandFormProps) {
  const [formData, setFormData] = useState({
    brandName: initialData?.brandName || "",
    imageLink: initialData?.imageLink || "",
    externalLink: initialData?.externalLink || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="brandName">Brand Name</Label>
        <Input
          id="brandName"
          value={formData.brandName}
          onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
          required
        />
      </div>

      <ImageUpload
        label="Logo Image"
        value={formData.imageLink}
        onChange={(value) => setFormData({ ...formData, imageLink: value })}
        placeholder="Upload or paste logo image URL"
      />

      <div className="space-y-2">
        <Label htmlFor="externalLink">Website URL</Label>
        <Input
          id="externalLink"
          type="url"
          value={formData.externalLink}
          onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
          placeholder="https://..."
          required
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Brand</Button>
      </div>
    </form>
  )
}
