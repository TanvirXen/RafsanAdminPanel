"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/admin/image-upload"

type BrandShape = {
  brandName: string
  imageLink: string
  externalLink: string
}

interface BrandFormProps {
  initialData?: Partial<BrandShape>
  onSave: (data: BrandShape) => any  // stays compatible with async or sync handlers
  onCancel: () => void
}

export function BrandForm({ initialData, onSave, onCancel }: BrandFormProps) {
  const [formData, setFormData] = useState<BrandShape>({
    brandName: initialData?.brandName ?? "",
    imageLink: initialData?.imageLink ?? "",
    externalLink: initialData?.externalLink ?? "",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof BrandShape, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  // keep fields in sync if initialData changes (when switching from add -> edit)
  useEffect(() => {
    setFormData({
      brandName: initialData?.brandName ?? "",
      imageLink: initialData?.imageLink ?? "",
      externalLink: initialData?.externalLink ?? "",
    })
    setErrors({})
    setSubmitting(false)
  }, [initialData])

  const set = <K extends keyof BrandShape>(key: K, val: BrandShape[K]) => {
    setFormData((p) => ({ ...p, [key]: val }))
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  const isValidUrl = (v: string) => {
    // allow absolute http(s) or site-relative (starts with '/')
    if (!v) return false
    if (v.startsWith("/")) return true
    try {
      const u = new URL(v)
      return u.protocol === "http:" || u.protocol === "https:"
    } catch {
      return false
    }
  }

  const validate = (data: BrandShape) => {
    const next: Partial<Record<keyof BrandShape, string>> = {}
    if (!data.brandName.trim()) next.brandName = "Brand name is required"
    if (!data.imageLink.trim()) next.imageLink = "Logo image is required"
    if (!data.externalLink.trim()) next.externalLink = "Website URL is required"
    else if (!isValidUrl(data.externalLink.trim()))
      next.externalLink = "Enter a valid URL (http/https or site-relative)"
    return next
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const payload: BrandShape = {
      brandName: formData.brandName.trim(),
      imageLink: formData.imageLink.trim(),
      externalLink: formData.externalLink.trim(),
    }

    const v = validate(payload)
    if (Object.values(v).some(Boolean)) {
      setErrors(v)
      return
    }

    const maybe = onSave(payload)
    if (maybe && typeof (maybe as any).then === "function") {
      setSubmitting(true)
      ;(maybe as Promise<any>)
        .catch(() => {}) // parent handles toast; we just prevent unhandled rejection
        .finally(() => setSubmitting(false))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="brandName">Brand Name<span className="text-red-500"> *</span></Label>
        <Input
          id="brandName"
          value={formData.brandName}
          onChange={(e) => set("brandName", e.target.value)}
          aria-invalid={!!errors.brandName}
          aria-describedby={errors.brandName ? "brandName-error" : undefined}
          required
        />
        {errors.brandName && (
          <p id="brandName-error" className="text-sm text-red-500">{errors.brandName}</p>
        )}
      </div>

      <div className="space-y-2">
        <ImageUpload
          label="Logo Image"
          value={formData.imageLink}
          onChange={(value) => set("imageLink", value || "")}
          placeholder="Upload or paste logo image URL"
        />
        {errors.imageLink && (
          <p className="text-sm text-red-500">{errors.imageLink}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="externalLink">Website URL<span className="text-red-500"> *</span></Label>
        <Input
          id="externalLink"
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          value={formData.externalLink}
          onChange={(e) => set("externalLink", e.target.value)}
          aria-invalid={!!errors.externalLink}
          aria-describedby={errors.externalLink ? "externalLink-error" : undefined}
          required
        />
        {errors.externalLink && (
          <p id="externalLink-error" className="text-sm text-red-500">{errors.externalLink}</p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Brand"}
        </Button>
      </div>
    </form>
  )
}
