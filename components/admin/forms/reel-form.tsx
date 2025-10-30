"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/admin/image-upload"

interface ReelFormProps {
  initialData?: any
  shows: Array<{ _id: string; title: string }>
  onSave: (data: any) => void
  onCancel: () => void
}

export function ReelForm({ initialData, shows, onSave, onCancel }: ReelFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    showId: initialData?.showId || "",
    description: initialData?.description || "",
    thumbnail: initialData?.thumbnail || "",
    link: initialData?.link || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="showId">Show</Label>
        <Select value={formData.showId} onValueChange={(value) => setFormData({ ...formData, showId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a show" />
          </SelectTrigger>
          <SelectContent>
            {shows.map((show) => (
              <SelectItem key={show._id} value={show._id}>
                {show.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Reel Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <ImageUpload
        label="Reel Thumbnail"
        value={formData.thumbnail}
        onChange={(value) => setFormData({ ...formData, thumbnail: value })}
        placeholder="Upload or paste thumbnail URL"
        category="reels/thumbnails"
      />

      <div className="space-y-2">
        <Label htmlFor="link">Video Link</Label>
        <Input
          id="link"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://example.com/reel"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Reel</Button>
      </div>
    </form>
  )
}
