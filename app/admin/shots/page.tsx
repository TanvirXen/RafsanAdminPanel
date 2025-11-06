"use client";

import { useEffect, useRef, useState } from "react";
import apiList from "@/apiList";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/image-upload";
import { Pencil, Trash2, Plus } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";

interface Shot {
  _id: string;
  image: string;
  sequence: number;
}

export default function ShotsPage() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [formData, setFormData] = useState<{ image: string; sequence: number }>(
    { image: "", sequence: 1 }
  );

  // -------- confirmation modal (promise-based) --------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((v: boolean) => void) | undefined>(undefined);

  const askConfirm = (title: string, desc: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmTitle(title);
      setConfirmDesc(desc);
      setConfirmOpen(true);
    });

  const resolveConfirm = (v: boolean) => {
    setConfirmOpen(false);
    confirmResolveRef.current?.(v);
    confirmResolveRef.current = undefined;
  };

  // -------- load --------
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiList.shots.list, { credentials: "include" });
        const j = await res.json();
        setShots(
          (j.shots || []).sort((a: Shot, b: Shot) => a.sequence - b.sequence)
        );
      } catch {
        toast.error("Failed to load shots");
      }
    })();
  }, []);

  // -------- CRUD --------
  const handleAdd = () => {
    setEditingShot(null);
    setFormData({ image: "", sequence: (shots?.length || 0) + 1 });
    setIsDialogOpen(true);
  };

  const handleEdit = (shot: Shot) => {
    setEditingShot(shot);
    setFormData({ image: shot.image, sequence: shot.sequence });
    setIsDialogOpen(true);
  };

  const handleDelete = async (shot: Shot) => {
    const ok = await askConfirm(
      "Delete Shot",
      "Are you sure you want to delete this shot?"
    );
    if (!ok) return;

    const res = await fetch(apiList.shots.delete(shot._id), {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setShots((prev) => prev.filter((s) => s._id !== shot._id));
      toast.success("Shot deleted");
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j.message || "Failed to delete shot");
    }
  };

  const handleSave = async () => {
    if (!formData.image?.trim()) {
      toast.error("Image is required");
      return;
    }
    const payload = {
      image: formData.image.trim(),
      sequence: Math.max(1, Number(formData.sequence || 1)),
    };

    if (editingShot) {
      const res = await fetch(apiList.shots.update(editingShot._id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setShots((prev) =>
          prev
            .map((s) => (s._id === editingShot._id ? j.shot : s))
            .sort((a, b) => a.sequence - b.sequence)
        );
        toast.success("Shot updated");
        setIsDialogOpen(false);
      } else {
        toast.error(j.message || "Failed to update shot");
      }
    } else {
      const res = await fetch(apiList.shots.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setShots((prev) =>
          [...prev, j.shot].sort((a, b) => a.sequence - b.sequence)
        );
        toast.success("Shot created");
        setIsDialogOpen(false);
      } else {
        toast.error(j.message || "Failed to create shot");
      }
    }
  };

  // swap order + persist the two affected sequences
  const moveShot = async (index: number, direction: "up" | "down") => {
    const a = shots[index];
    const b = direction === "up" ? shots[index - 1] : shots[index + 1];
    if (!a || !b) return;

    // optimistic UI swap
    const swapped = [...shots];
    [swapped[index], swapped[direction === "up" ? index - 1 : index + 1]] = [
      b,
      a,
    ];
    // recompute sequences to be contiguous
    swapped.forEach((s, i) => (s.sequence = i + 1));
    setShots(swapped);

    // persist the two changed items (the rest kept same sequence)
    try {
      await Promise.all([
        fetch(apiList.shots.update(a._id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sequence: swapped.find((x) => x._id === a._id)?.sequence,
          }),
        }),
        fetch(apiList.shots.update(b._id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sequence: swapped.find((x) => x._id === b._id)?.sequence,
          }),
        }),
      ]);
    } catch {
      toast.error("Failed to persist new order");
    }
  };

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <div className='flex items-center justify-between'>
        <PageHeader
          title='Shots'
          description='Manage gallery shots with custom sequencing'
        />
        <Button onClick={handleAdd}>
          <Plus className='mr-2 h-4 w-4' />
          Add Shot
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {shots.map((shot, index) => (
          <Card key={shot._id} className='overflow-hidden'>
            <CardContent className='p-0'>
              <div className='relative aspect-video w-full bg-muted'>
                <Image
                  src={shot.image || "/placeholder.svg"}
                  alt={`Shot ${shot.sequence}`}
                  fill
                  className='object-cover'
                />
              </div>
              <div className='space-y-3 p-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>
                    Sequence: {shot.sequence}
                  </span>
                  <div className='flex gap-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => moveShot(index, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => moveShot(index, "down")}
                      disabled={index === shots.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleEdit(shot)}
                    className='flex-1'
                  >
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDelete(shot)}
                    className='flex-1'
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] sm:max-w-md max-h-[85vh] p-0 overflow-hidden'>
          <DialogHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4'>
            <DialogTitle>
              {editingShot ? "Edit Shot" : "Add New Shot"}
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-y-auto px-6 py-5 max-h-[calc(85vh-64px)] space-y-4'>
            <ImageUpload
              label='Shot Image'
              value={formData.image}
              onChange={(value) =>
                setFormData((p) => ({ ...p, image: value || "" }))
              }
              placeholder='Upload or paste image URL'
            />
            <div className='space-y-2'>
              <Label htmlFor='sequence'>Sequence Number</Label>
              <Input
                id='sequence'
                type='number'
                min={1}
                value={formData.sequence}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    sequence: Math.max(1, parseInt(e.target.value || "1", 10)),
                  }))
                }
              />
            </div>
            <div className='flex justify-end gap-3'>
              <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Shot</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) resolveConfirm(false);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>{confirmDesc}</p>
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='outline' onClick={() => resolveConfirm(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={() => resolveConfirm(true)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
