"use client";

import { useEffect, useRef, useState } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { resolvePagination } from "@/lib/pagination";
import { broadcastAdminSync, useAdminSync } from "@/hooks/use-admin-sync";

import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
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

type ShotsResponse = {
  shots: Shot[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
};

const PAGE_SIZE = 9;

export default function ShotsPage() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [formData, setFormData] = useState<{ image: string; sequence: number }>(
    { image: "", sequence: 1 }
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalShots, setTotalShots] = useState(0);

  // -------- confirmation modal (promise-based) --------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((v: boolean) => void) | undefined>(
    undefined
  );

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

  const loadShots = async (pageToLoad = page) => {
    try {
      const j = await apiFetch<ShotsResponse>(
        withQuery(apiList.shots.list, {
          page: pageToLoad,
          limit: PAGE_SIZE,
        })
      );
      const pagination = resolvePagination(j, PAGE_SIZE);
      setShots((j.shots || []).sort((a, b) => a.sequence - b.sequence));
      setPage(pagination.page);
      setTotalPages(pagination.pages);
      setTotalShots(pagination.total);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load shots");
    }
  };

  // -------- load --------
  useEffect(() => {
    void loadShots();
  }, []);

  useAdminSync("shots", () => {
    void loadShots(page);
  });

  // -------- CRUD --------
  const handleAdd = () => {
    setEditingShot(null);
    setFormData({ image: "", sequence: totalShots + 1 });
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

    try {
      await apiFetch(apiList.shots.delete(shot._id), { method: "DELETE" });
      await loadShots();
      broadcastAdminSync("shots");
      toast.success("Shot deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete shot");
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

    try {
      if (editingShot) {
        await apiFetch<{ shot: Shot }>(apiList.shots.update(editingShot._id), {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Shot updated");
      } else {
        await apiFetch<{ shot: Shot }>(apiList.shots.create, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Shot created");
      }
      await loadShots();
      broadcastAdminSync("shots");
      setIsDialogOpen(false);
    } catch (e: any) {
      toast.error(
        e?.message ||
          (editingShot ? "Failed to update shot" : "Failed to create shot")
      );
    }
  };

  // swap order + persist the two affected sequences
  const moveShot = async (index: number, direction: "up" | "down") => {
    const a = shots[index];
    const b = direction === "up" ? shots[index - 1] : shots[index + 1];
    if (!a || !b) return;

    const original = [...shots];

    // optimistic UI swap
    const swapped = [...shots];
    [swapped[index], swapped[direction === "up" ? index - 1 : index + 1]] = [
      b,
      a,
    ];
    swapped.forEach((s, i) => (s.sequence = i + 1));
    setShots(swapped);

    try {
      await Promise.all([
        apiFetch(apiList.shots.update(a._id), {
          method: "PATCH",
          body: JSON.stringify({
            sequence: swapped.find((x) => x._id === a._id)?.sequence,
          }),
        }),
        apiFetch(apiList.shots.update(b._id), {
          method: "PATCH",
          body: JSON.stringify({
            sequence: swapped.find((x) => x._id === b._id)?.sequence,
          }),
        }),
      ]);
      await loadShots();
      broadcastAdminSync("shots");
    } catch {
      setShots(original); // revert on failure
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
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={totalShots}
        currentCount={shots.length}
        itemLabel='shots'
        onPageChange={(nextPage) => void loadShots(nextPage)}
      />

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
