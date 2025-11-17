"use client";

import type React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShowFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function ShowForm({ initialData, onSave, onCancel }: ShowFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    seasons: initialData?.seasons || 0,
    reels: initialData?.reels || 0,
    featured: initialData?.featured || false,
    description: initialData?.description || "",
    thumbnail: initialData?.thumbnail || "",
    heroImage: initialData?.heroImage || "",
    // ✅ only cinematic/podcast. default = cinematic (What A Show)
    designVariant:
      (initialData?.designVariant as "cinematic" | "podcast" | undefined) ||
      "cinematic",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='space-y-2'>
        <Label htmlFor='title'>Title</Label>
        <Input
          id='title'
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          required
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label htmlFor='seasons'>Number of Seasons</Label>
          <Input
            id='seasons'
            type='number'
            value={formData.seasons}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                seasons: Number.parseInt(e.target.value) || 0,
              }))
            }
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='reels'>Number of Reels</Label>
          <Input
            id='reels'
            type='number'
            value={formData.reels}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                reels: Number.parseInt(e.target.value) || 0,
              }))
            }
          />
        </div>
      </div>

      {/* 🔥 Design variant: What A Show vs Podcast */}
      <div className='space-y-2'>
        <Label htmlFor='designVariant'>Design Variant</Label>
        <Select
          value={formData.designVariant}
          onValueChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              designVariant: val as "cinematic" | "podcast",
            }))
          }
        >
          <SelectTrigger id='designVariant' className='w-full'>
            <SelectValue placeholder='Choose design variant' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='cinematic'>What A Show (Main)</SelectItem>
            <SelectItem value='podcast'>Next Level Podcast</SelectItem>
          </SelectContent>
        </Select>
        <p className='text-xs text-muted-foreground'>
          “What A Show” style is the main show layout; “Podcast” uses the Next
          Level Podcast design.
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='description'>Description</Label>
        <Textarea
          id='description'
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={4}
        />
      </div>

      <ImageUpload
        label='Show Thumbnail'
        value={formData.thumbnail}
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, thumbnail: value }))
        }
        placeholder='Upload or paste thumbnail URL'
      />

      <ImageUpload
        label='Hero Image'
        value={formData.heroImage}
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, heroImage: value }))
        }
        placeholder='Upload or paste hero image URL'
      />

      <div className='flex items-center space-x-2'>
        <Switch
          id='featured'
          checked={formData.featured}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, featured: checked }))
          }
        />
        <Label htmlFor='featured'>Featured Show</Label>
      </div>

      <div className='flex justify-end gap-3'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit'>Save Show</Button>
      </div>
    </form>
  );
}
