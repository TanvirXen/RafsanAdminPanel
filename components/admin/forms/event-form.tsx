"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/admin/image-upload"
import { Plus, X, GripVertical } from "lucide-react"

type EventType = "Free" | "Free_with_approval" | "Paid" | "Paid_with_approval"

type Brand = { _id: string; brandName: string; imageLink?: string }

interface CustomField {
  id: string
  name: string
  type: "text" | "email" | "phone" | "number" | "select" | "textarea"
  label: string
  required: boolean
  options?: string[]
}

interface EventFormProps {
  initialData?: {
    title?: string
    date?: string[]
    venue?: string
    type?: EventType
    description?: string
    imageLinkBg?: string
    imageLinkOverlay?: string
    // may be IDs, populated objects, or legacy brand names
    brands?: Array<string | { _id: string; brandName?: string }>
    customFields?: CustomField[]
    category?: string
  }
  brands?: Brand[]                         // <-- pass from API
  onBrandsChange?: (ids: string[]) => void // optional live callback for parent
  onSave: (data: any) => void
  onCancel: () => void
}

export function EventForm({
  initialData,
  brands = [],
  onBrandsChange,
  onSave,
  onCancel,
}: EventFormProps) {
  // --------- normalize initial brand ids (IDs, objects, or names) ----------
  const initialBrandIds = useMemo<string[]>(() => {
    const all = initialData?.brands ?? []
    if (!all.length) return []
    const byName = new Map(brands.map((b) => [b.brandName, b._id]))
    const ids = all
      .map((b) => {
        if (!b) return null
        if (typeof b === "string") {
          // if string matches a known id, use it; otherwise try name->id
          const byId = brands.find((x) => x._id === b)?._id
          return byId ?? byName.get(b) ?? null
        }
        // populated object
        return b._id ?? byName.get((b as any).brandName || "") ?? null
      })
      .filter(Boolean) as string[]
    // de-dupe
    return Array.from(new Set(ids))
  }, [initialData?.brands, brands])

  // ---------------------------- form state ----------------------------
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    date: initialData?.date?.length ? initialData.date : [""],
    venue: initialData?.venue || "",
    type: (initialData?.type as EventType) || "Free",
    description: initialData?.description || "",
    imageLinkBg: initialData?.imageLinkBg || "",
    imageLinkOverlay: initialData?.imageLinkOverlay || "",
    brands: initialBrandIds, // <-- IDs only in local state
    customFields: (initialData?.customFields as CustomField[]) || [],
    category: initialData?.category || "event",
  })

  // keep brand selection in sync if brands/initialData arrive later
  useEffect(() => {
    setFormData((prev) => ({ ...prev, brands: initialBrandIds }))
  }, [initialBrandIds])

  // bubble brand changes up so the parent can render chips if desired
  useEffect(() => {
    onBrandsChange?.(formData.brands)
  }, [formData.brands, onBrandsChange])

  // ---------------------------- handlers ----------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addDate = () => setFormData((p) => ({ ...p, date: [...p.date, ""] }))
  const removeDate = (i: number) =>
    setFormData((p) => ({ ...p, date: p.date.filter((_, idx) => idx !== i) }))
  const updateDate = (i: number, v: string) =>
    setFormData((p) => {
      const d = [...p.date]
      d[i] = v
      return { ...p, date: d }
    })

  const toggleBrand = (brandId: string, checked?: boolean) => {
    setFormData((p) => {
      const has = p.brands.includes(brandId)
      let next: string[]
      if (checked === undefined) {
        next = has ? p.brands.filter((id) => id !== brandId) : [...p.brands, brandId]
      } else {
        next = checked ? (has ? p.brands : [...p.brands, brandId]) : p.brands.filter((id) => id !== brandId)
      }
      // de-dupe just in case
      next = Array.from(new Set(next))
      return { ...p, brands: next }
    })
  }

  const addCustomField = () =>
    setFormData((p) => ({
      ...p,
      customFields: [
        ...p.customFields,
        { id: Date.now().toString(), name: "", type: "text", label: "", required: false } as CustomField,
      ],
    }))

  const removeCustomField = (id: string) =>
    setFormData((p) => ({ ...p, customFields: p.customFields.filter((f) => f.id !== id) }))

  const updateCustomField = (id: string, updates: Partial<CustomField>) =>
    setFormData((p) => ({
      ...p,
      customFields: p.customFields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }))

  const addFieldOption = (fieldId: string) =>
    setFormData((p) => ({
      ...p,
      customFields: p.customFields.map((f) => (f.id === fieldId ? { ...f, options: [...(f.options || []), ""] } : f)),
    }))

  const updateFieldOption = (fieldId: string, optionIndex: number, value: string) =>
    setFormData((p) => ({
      ...p,
      customFields: p.customFields.map((f) => {
        if (f.id !== fieldId) return f
        const opts = [...(f.options || [])]
        opts[optionIndex] = value
        return { ...f, options: opts }
      }),
    }))

  const removeFieldOption = (fieldId: string, optionIndex: number) =>
    setFormData((p) => ({
      ...p,
      customFields: p.customFields.map((f) =>
        f.id === fieldId ? { ...f, options: (f.options || []).filter((_, i) => i !== optionIndex) } : f
      ),
    }))

  // ---------------------------- UI ----------------------------
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Event Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Event Date(s)</Label>
        {formData.date.map((date, index) => (
          <div key={index} className="flex gap-2">
            <Input type="date" value={date} onChange={(e) => updateDate(index, e.target.value)} required />
            {formData.date.length > 1 && (
              <Button type="button" variant="outline" size="icon" onClick={() => removeDate(index)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addDate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Another Date
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="venue">Venue</Label>
          <Input
            id="venue"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as EventType })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Free_with_approval">Free with Approval</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Paid_with_approval">Paid with Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category || "event"}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event">Event</SelectItem>
            <SelectItem value="workshop">Workshop</SelectItem>
          </SelectContent>
        </Select>
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

      <div className="grid gap-4 md:grid-cols-2">
        <ImageUpload
          label="Background Image"
          value={formData.imageLinkBg}
          onChange={(value) => setFormData({ ...formData, imageLinkBg: value })}
          placeholder="Upload or paste background image URL"
        />

        <ImageUpload
          label="Overlay Image"
          value={formData.imageLinkOverlay}
          onChange={(value) => setFormData({ ...formData, imageLinkOverlay: value })}
          placeholder="Upload or paste overlay image URL"
        />
      </div>

      {/* Associated brands from API (IDs) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Associated Brands</CardTitle>
          <CardDescription>Select brands that are sponsoring or associated with this event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {brands.map((brand) => {
              const checked = formData.brands.includes(brand._id)
              return (
                <div key={brand._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand._id}`}
                    checked={checked}
                    onCheckedChange={(c) => toggleBrand(brand._id, Boolean(c))}
                  />
                  <label
                    htmlFor={`brand-${brand._id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {brand.brandName}
                  </label>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registration Form Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration Form Fields</CardTitle>
          <CardDescription>
            Create custom fields that attendees will fill out when registering for this event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.customFields.map((field: CustomField, index: number) => (
            <Card key={field.id} className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Field {index + 1}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomField(field.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Field Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                        placeholder="e.g., Full Name, Email Address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Field Name (ID)</Label>
                      <Input
                        value={field.name}
                        onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                        placeholder="e.g., full_name, email"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Field Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value: any) => updateCustomField(field.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="textarea">Text Area</SelectItem>
                          <SelectItem value="select">Dropdown Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id={`required-${field.id}`}
                        checked={field.required}
                        onCheckedChange={(c) => updateCustomField(field.id, { required: Boolean(c) })}
                      />
                      <label htmlFor={`required-${field.id}`} className="text-sm font-medium leading-none">
                        Required field
                      </label>
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div className="space-y-2">
                      <Label>Dropdown Options</Label>
                      {(field.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateFieldOption(field.id, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeFieldOption(field.id, optionIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addFieldOption(field.id)}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addCustomField} className="w-full bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Field
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Event</Button>
      </div>
    </form>
  )
}
