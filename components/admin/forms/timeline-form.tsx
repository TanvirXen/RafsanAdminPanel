"use client"

import type React from "react"

import { useEffect, useState } from "react"
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

// Same options as backend SLOT_KEYS
const SLOT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Not mapped / generic —" },
  { value: "journeyHero", label: "Journey • Hero card" },
  { value: "journey1Left", label: "Journey 1 • Left" },
  { value: "journey1Right", label: "Journey 1 • Right" },
  { value: "journey2Left", label: "Journey 2 • Left" },
  { value: "journey2Right", label: "Journey 2 • Right" },
  { value: "journey3Left", label: "Journey 3 • Left" },
  { value: "journey3TopRight", label: "Journey 3 • Top Right" },
  { value: "journey3BottomRight", label: "Journey 3 • Bottom Right" },
  { value: "setbackMainLeft", label: "Setback • Main Left" },
  { value: "setbackMainRight", label: "Setback • Main Right" },
  { value: "setbackMosaicLeft", label: "Setback Mosaic • Left" },
  { value: "setbackMosaicTopRight", label: "Setback Mosaic • Top Right" },
  {
    value: "setbackMosaicBottomRight",
    label: "Setback Mosaic • Bottom Right",
  },
]

// Helper: backend sends ISO, input[type=date] wants yyyy-MM-dd
function normalizeDateForInput(raw: string | undefined): string {
  if (!raw) return ""
  // If it's already yyyy-MM-dd just return it
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function TimelineForm({ initialData, onSave, onCancel }: TimelineFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    date: normalizeDateForInput(initialData?.date),
    imageLink: initialData?.imageLink || "",
    description: initialData?.description || "",
    cardUrl: initialData?.cardUrl || "",
    slotKey: initialData?.slotKey || "",
  })

  // If initialData changes (editing a different row), sync into state
  useEffect(() => {
    if (!initialData) return
    setFormData({
      title: initialData?.title || "",
      date: normalizeDateForInput(initialData?.date),
      imageLink: initialData?.imageLink || "",
      description: initialData?.description || "",
      cardUrl: initialData?.cardUrl || "",
      slotKey: initialData?.slotKey || "",
    })
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // onSave will handle converting date → ISO & sending to backend
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
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

      {/* Date */}
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

      {/* Image */}
      <ImageUpload
        label="Timeline Image"
        value={formData.imageLink}
        onChange={(value) => setFormData({ ...formData, imageLink: value })}
        placeholder="Upload or paste timeline image URL"
        required
      />

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={4}
          required
        />
      </div>

      {/* Card URL */}
      <div className="space-y-2">
        <Label htmlFor="cardUrl">Card URL (Optional)</Label>
        <Input
          id="cardUrl"
          value={formData.cardUrl}
          onChange={(e) =>
            setFormData({ ...formData, cardUrl: e.target.value })
          }
          placeholder="/timeline/..."
        />
      </div>

      {/* Slot mapping */}
      <div className="space-y-2">
        <Label htmlFor="slotKey">Front-end Slot (optional)</Label>
        <select
          id="slotKey"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={formData.slotKey}
          onChange={(e) =>
            setFormData({ ...formData, slotKey: e.target.value })
          }
        >
          {SLOT_OPTIONS.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose where this card will appear in the About page (Journey / Setback).  
          Leave it as &quot;Not mapped&quot; if it&apos;s just a generic timeline entry.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}
