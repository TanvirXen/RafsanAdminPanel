"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/admin/image-upload"
import { Plus, X, GripVertical } from "lucide-react"

interface EventFormProps {
  initialData?: any
  onSave: (data: any) => void
  onCancel: () => void
}

const availableBrands = [
  { _id: "1", brandName: "TechCorp" },
  { _id: "2", brandName: "InnovateLabs" },
  { _id: "3", brandName: "DevTools Inc" },
  { _id: "4", brandName: "CloudSystems" },
]

interface CustomField {
  id: string
  name: string
  type: "text" | "email" | "phone" | "number" | "select" | "textarea"
  label: string
  required: boolean
  options?: string[]
}

export function EventForm({ initialData, onSave, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    date: initialData?.date || [""],
    venue: initialData?.venue || "",
    type: initialData?.type || "Free",
    description: initialData?.description || "",
    imageLinkBg: initialData?.imageLinkBg || "",
    imageLinkOverlay: initialData?.imageLinkOverlay || "",
    brands: initialData?.brands || [],
    customFields: initialData?.customFields || [],
    category: initialData?.category || "event", // Added category field
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const addDate = () => {
    setFormData({ ...formData, date: [...formData.date, ""] })
  }

  const removeDate = (index: number) => {
    setFormData({ ...formData, date: formData.date.filter((_, i) => i !== index) })
  }

  const updateDate = (index: number, value: string) => {
    const newDates = [...formData.date]
    newDates[index] = value
    setFormData({ ...formData, date: newDates })
  }

  const toggleBrand = (brandName: string) => {
    const brands = formData.brands.includes(brandName)
      ? formData.brands.filter((b: string) => b !== brandName)
      : [...formData.brands, brandName]
    setFormData({ ...formData, brands })
  }

  const addCustomField = () => {
    const newField: CustomField = {
      id: Date.now().toString(),
      name: "",
      type: "text",
      label: "",
      required: false,
    }
    setFormData({ ...formData, customFields: [...formData.customFields, newField] })
  }

  const removeCustomField = (id: string) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.filter((f: CustomField) => f.id !== id),
    })
  }

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.map((f: CustomField) => (f.id === id ? { ...f, ...updates } : f)),
    })
  }

  const addFieldOption = (fieldId: string) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.map((f: CustomField) =>
        f.id === fieldId ? { ...f, options: [...(f.options || []), ""] } : f,
      ),
    })
  }

  const updateFieldOption = (fieldId: string, optionIndex: number, value: string) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.map((f: CustomField) => {
        if (f.id === fieldId && f.options) {
          const newOptions = [...f.options]
          newOptions[optionIndex] = value
          return { ...f, options: newOptions }
        }
        return f
      }),
    })
  }

  const removeFieldOption = (fieldId: string, optionIndex: number) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.map((f: CustomField) => {
        if (f.id === fieldId && f.options) {
          return { ...f, options: f.options.filter((_, i) => i !== optionIndex) }
        }
        return f
      }),
    })
  }

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
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Associated Brands</CardTitle>
          <CardDescription>Select brands that are sponsoring or associated with this event</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableBrands.map((brand) => (
              <div key={brand._id} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand._id}`}
                  checked={formData.brands.includes(brand.brandName)}
                  onCheckedChange={() => toggleBrand(brand.brandName)}
                />
                <label
                  htmlFor={`brand-${brand._id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {brand.brandName}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                        onCheckedChange={(checked) => updateCustomField(field.id, { required: checked as boolean })}
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
