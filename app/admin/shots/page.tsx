"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/admin/image-upload"
import { Pencil, Trash2, Plus } from "lucide-react"
import Image from "next/image"

interface Shot {
  _id: string
  image: string
  sequence: number
}

const mockShots: Shot[] = [
  { _id: "1", image: "/shot1.jpg", sequence: 1 },
  { _id: "2", image: "/shot2.jpg", sequence: 2 },
  { _id: "3", image: "/shot3.jpg", sequence: 3 },
]

export default function ShotsPage() {
  const [shots, setShots] = useState<Shot[]>(mockShots)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShot, setEditingShot] = useState<Shot | null>(null)
  const [formData, setFormData] = useState({ image: "", sequence: 1 })

  const handleAdd = () => {
    setEditingShot(null)
    setFormData({ image: "", sequence: shots.length + 1 })
    setIsDialogOpen(true)
  }

  const handleEdit = (shot: Shot) => {
    setEditingShot(shot)
    setFormData({ image: shot.image, sequence: shot.sequence })
    setIsDialogOpen(true)
  }

  const handleDelete = (shot: Shot) => {
    if (confirm("Are you sure you want to delete this shot?")) {
      setShots(shots.filter((s) => s._id !== shot._id))
    }
  }

  const handleSave = () => {
    if (!formData.image) return

    if (editingShot) {
      setShots(shots.map((s) => (s._id === editingShot._id ? { ...s, ...formData } : s)))
    } else {
      setShots([...shots, { _id: Date.now().toString(), ...formData }])
    }
    setIsDialogOpen(false)
  }

  const moveShot = (index: number, direction: "up" | "down") => {
    const newShots = [...shots]
    if (direction === "up" && index > 0) {
      ;[newShots[index], newShots[index - 1]] = [newShots[index - 1], newShots[index]]
    } else if (direction === "down" && index < newShots.length - 1) {
      ;[newShots[index], newShots[index + 1]] = [newShots[index + 1], newShots[index]]
    }
    // Update sequences
    newShots.forEach((shot, idx) => {
      shot.sequence = idx + 1
    })
    setShots(newShots)
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Shots" description="Manage gallery shots with custom sequencing" />
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shot
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shots.map((shot, index) => (
          <Card key={shot._id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video w-full bg-muted">
                <Image
                  src={shot.image || "/placeholder.svg"}
                  alt={`Shot ${shot.sequence}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sequence: {shot.sequence}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => moveShot(index, "up")} disabled={index === 0}>
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveShot(index, "down")}
                      disabled={index === shots.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(shot)} className="flex-1">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(shot)} className="flex-1">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShot ? "Edit Shot" : "Add New Shot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUpload
              label="Shot Image"
              value={formData.image}
              onChange={(value) => setFormData({ ...formData, image: value })}
              placeholder="Upload or paste image URL"
            />

            <div className="space-y-2">
              <Label htmlFor="sequence">Sequence Number</Label>
              <Input
                id="sequence"
                type="number"
                min="1"
                value={formData.sequence}
                onChange={(e) => setFormData({ ...formData, sequence: Number.parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Shot</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
