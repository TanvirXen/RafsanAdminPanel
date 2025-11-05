"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ImageUpload } from "@/components/admin/image-upload"

interface EpisodeFormProps {
  initialData?: any
  shows: Array<{ _id: string; title: string }>
  seasons: Array<{ _id: string; title: string; showId: string }>
  onSave: (data: any) => void
  onCancel: () => void
}

export function EpisodeForm({ initialData, shows, seasons, onSave, onCancel }: EpisodeFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    showId: initialData?.showId || "",
    seasonId: initialData?.seasonId || "",
    thumbnail: initialData?.thumbnail || "",
    link: initialData?.link || "",
    featured: initialData?.featured || false,
  })

  const filteredSeasons = formData.showId ? seasons.filter((s) => s.showId === formData.showId) : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="showId">Show</Label>
        <Select
          value={formData.showId}
          onValueChange={(value) => setFormData({ ...formData, showId: value, seasonId: "" })}
        >
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
        <Label htmlFor="seasonId">Season</Label>
        <Select
          value={formData.seasonId}
          onValueChange={(value) => setFormData({ ...formData, seasonId: value })}
          disabled={!formData.showId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a season" />
          </SelectTrigger>
          <SelectContent>
            {filteredSeasons.map((season) => (
              <SelectItem key={season._id} value={season._id}>
                {season.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Episode Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <ImageUpload
        label="Episode Thumbnail"
        value={formData.thumbnail}
        onChange={(value) => setFormData({ ...formData, thumbnail: value })}
        placeholder="Upload or paste thumbnail URL"
      />

      <div className="space-y-2">
        <Label htmlFor="link">Video Link</Label>
        <Input
          id="link"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://example.com/video"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="featured"
          checked={formData.featured}
          onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
        />
        <Label htmlFor="featured">Featured Episode</Label>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Episode</Button>
      </div>
    </form>
  )
}
