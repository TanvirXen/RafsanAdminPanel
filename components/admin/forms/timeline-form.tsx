"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/admin/image-upload"

interface TimelineFormProps {
  initialData?: any
  onSave: (data: any) => void
  onCancel: () => void
}

export function TimelineForm({ initialData, onSave, onCancel }: TimelineFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    date: initialData?.date || "",
    imageLink: initialData?.imageLink || "",
    description: initialData?.description || "",
    cardUrl: initialData?.cardUrl || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Company Founded"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

      <ImageUpload
        label="Timeline Image"
        value={formData.imageLink}
        onChange={(value) => setFormData({ ...formData, imageLink: value })}
        placeholder="Upload or paste timeline image URL"
        required
      />

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardUrl">Card URL (Optional)</Label>
        <Input
          id="cardUrl"
          value={formData.cardUrl}
          onChange={(e) => setFormData({ ...formData, cardUrl: e.target.value })}
          placeholder="/timeline/..."
        />
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
