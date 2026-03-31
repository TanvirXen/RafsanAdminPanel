"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "@/components/admin/image-upload"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const NOTABLE_EVENT_TYPES = [
  "Event Hosting",
  "Sessions & Workshops",
  "Brand Collaboration",
  "Corporate Shows",
] as const

type NotableEventType = (typeof NOTABLE_EVENT_TYPES)[number]

type NotableEventFormData = {
  title: string
  type: NotableEventType
  date: string
  imageLink: string
  description: string
  featured: boolean
}

interface NotableEventFormProps {
  initialData?: Partial<NotableEventFormData>
  onSave: (data: NotableEventFormData) => void
  onCancel: () => void
}

export function NotableEventForm({ initialData, onSave, onCancel }: NotableEventFormProps) {
  const [formData, setFormData] = useState<NotableEventFormData>({
    title: initialData?.title || "",
    type: initialData?.type || NOTABLE_EVENT_TYPES[0],
    date: initialData?.date ? initialData.date.slice(0, 10) : "",
    imageLink: initialData?.imageLink || "",
    description: initialData?.description || "",
    featured: initialData?.featured || false,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof NotableEventFormData, string>>>({})

  useEffect(() => {
    setFormData({
      title: initialData?.title || "",
      type: initialData?.type || NOTABLE_EVENT_TYPES[0],
      date: initialData?.date ? initialData.date.slice(0, 10) : "",
      imageLink: initialData?.imageLink || "",
      description: initialData?.description || "",
      featured: initialData?.featured || false,
    })
    setErrors({})
  }, [initialData])

  const set = <K extends keyof NotableEventFormData>(key: K, value: NotableEventFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const validate = (data: NotableEventFormData) => {
    const next: Partial<Record<keyof NotableEventFormData, string>> = {}

    if (!data.title.trim()) next.title = "Title is required"
    if (!data.type) next.type = "Type is required"
    if (!data.date) next.date = "Date is required"
    if (!data.imageLink.trim()) next.imageLink = "Event image is required"
    if (!data.description.trim()) next.description = "Description is required"

    return next
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: NotableEventFormData = {
      title: formData.title.trim(),
      type: formData.type,
      date: formData.date,
      imageLink: formData.imageLink.trim(),
      description: formData.description.trim(),
      featured: formData.featured,
    }

    const validationErrors = validate(payload)
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors)
      return
    }

    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select value={formData.type} onValueChange={(value) => set("type", value as NotableEventType)}>
          <SelectTrigger id="type" className="w-full" aria-invalid={!!errors.type}>
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {NOTABLE_EVENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => set("date", e.target.value)}
          required
        />
        {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
      </div>

      <ImageUpload
        label="Event Image"
        value={formData.imageLink}
        onChange={(value) => set("imageLink", value || "")}
        placeholder="Upload or paste event image URL"
        required
      />
      {errors.imageLink && <p className="text-sm text-red-500">{errors.imageLink}</p>}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          required
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="featured"
          checked={formData.featured}
          onCheckedChange={(checked) => set("featured", checked)}
        />
        <Label htmlFor="featured">Featured Event</Label>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}
