"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SeasonFormProps {
  initialData?: any
  shows: Array<{ _id: string; title: string }>
  onSave: (data: any) => void
  onCancel: () => void
}

export function SeasonForm({ initialData, shows, onSave, onCancel }: SeasonFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    showId: initialData?.showId || "",
    description: initialData?.description || "",
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
        <Label htmlFor="title">Season Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Season 1"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Season</Button>
      </div>
    </form>
  )
}
