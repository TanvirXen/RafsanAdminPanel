// app/admin/banners/page.tsx
"use client";

import { useEffect, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/admin/image-upload";
import { Save } from "lucide-react";
import { toast } from "react-toastify";

type BannerType = "about" | "gallery";

type BannerDto = {
  type?: BannerType;
  title?: string;
  subtitle?: string;
  kicker?: string;
  ctaLabel?: string;
  ctaHref?: string;
  mobileImage?: string;
  desktopImage?: string;
  heroImage?: string;
  alt?: string;
};

type BannerForm = {
  title: string;
  subtitle: string;
  kicker: string;
  ctaLabel: string;
  ctaHref: string;
  mobileImage: string;
  desktopImage: string;
  heroImage: string;
  alt: string;
};

const EMPTY_FORM: BannerForm = {
  title: "",
  subtitle: "",
  kicker: "",
  ctaLabel: "",
  ctaHref: "",
  mobileImage: "",
  desktopImage: "",
  heroImage: "",
  alt: "",
};

export default function BannerSettingsPage() {
  const [activeType, setActiveType] = useState<BannerType>("about");
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAbout = activeType === "about";
  const isGallery = activeType === "gallery";

  // -------- load banner --------
  const loadBanner = async (type: BannerType) => {
    setLoading(true);
    try {
      const json = await apiFetch<{ banner?: BannerDto }>(
        apiList.banners.get(type)
      );
      const banner = json.banner || {};

      setForm({
        title: banner.title || (isAbout ? "RAFSAN SABAB" : "Media Gallery"),
        subtitle:
          banner.subtitle ||
          (isGallery
            ? "Some of the remarkable events that I have had the privilege to host."
            : ""),
        kicker:
          banner.kicker ||
          "From the classrooms of IBA to the bright lights of the stage and screen.",
        ctaLabel:
          banner.ctaLabel || "Host | Content Creator | Storyteller",
        ctaHref: banner.ctaHref || "/about",
        mobileImage: banner.mobileImage || "/assets/aboutBanner.png",
        desktopImage: banner.desktopImage || "/assets/aboutBannerD.png",
        heroImage: banner.heroImage || "/assets/mediaB.jpg",
        alt: banner.alt || "Media Gallery hero",
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load banner");
      setForm(EMPTY_FORM);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanner(activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  // -------- save banner --------
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: BannerDto = {
        type: activeType,
        title: form.title,
        subtitle: form.subtitle,
        kicker: form.kicker,
        ctaLabel: form.ctaLabel,
        ctaHref: form.ctaHref,
        mobileImage: form.mobileImage,
        desktopImage: form.desktopImage,
        heroImage: form.heroImage,
        alt: form.alt,
      };

      await apiFetch<{ banner?: BannerDto }>(
        apiList.banners.update(activeType),
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      toast.success("Banner saved successfully");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  // -------- handlers --------
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <PageHeader
        title="Banner Settings"
        description="Manage About and Gallery hero banners"
      />

      {/* toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-gray-300 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setActiveType("about")}
            className={`px-4 py-2 ${
              activeType === "about" ? "bg-black text-white" : "bg-white"
            }`}
          >
            About Banner
          </button>
          <button
            type="button"
            onClick={() => setActiveType("gallery")}
            className={`px-4 py-2 ${
              activeType === "gallery" ? "bg-black text-white" : "bg-white"
            }`}
          >
            Gallery Banner
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isAbout ? "About Banner" : "Gallery Banner"}
          </CardTitle>
          <CardDescription>
            {isAbout
              ? "Controls the hero banner on the About page."
              : "Controls the hero banner on the Media Gallery page."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}

          {/* Images */}
          {isAbout && (
            <div className="grid gap-4 md:grid-cols-2">
              <ImageUpload
                label="Mobile / Tablet Image"
                value={form.mobileImage}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, mobileImage: value }))
                }
                placeholder="/assets/aboutBanner.png"
              />
              <ImageUpload
                label="Desktop Image"
                value={form.desktopImage}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, desktopImage: value }))
                }
                placeholder="/assets/aboutBannerD.png"
              />
            </div>
          )}

          {isGallery && (
            <div className="space-y-4">
              <ImageUpload
                label="Hero Image"
                value={form.heroImage}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, heroImage: value }))
                }
                placeholder="/assets/mediaB.jpg"
              />
              <div className="space-y-2">
                <Label htmlFor="alt">Hero Alt Text</Label>
                <Input
                  id="alt"
                  name="alt"
                  value={form.alt}
                  onChange={handleInputChange}
                  placeholder="Media Gallery hero"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Text content */}
          <div className="space-y-4">
            {isAbout && (
              <div className="space-y-2">
                <Label htmlFor="kicker">Kicker / Intro Line</Label>
                <Textarea
                  id="kicker"
                  name="kicker"
                  rows={2}
                  value={form.kicker}
                  onChange={handleInputChange}
                  placeholder="From the classrooms of IBA to the bright lights of the stage and screen."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                placeholder={isAbout ? "RAFSAN SABAB" : "Media Gallery"}
              />
            </div>

            {isGallery && (
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Textarea
                  id="subtitle"
                  name="subtitle"
                  rows={2}
                  value={form.subtitle}
                  onChange={handleInputChange}
                  placeholder="Some of the remarkable events that I have had the privilege to host."
                />
              </div>
            )}

            {isAbout && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ctaLabel">CTA Label</Label>
                  <Input
                    id="ctaLabel"
                    name="ctaLabel"
                    value={form.ctaLabel}
                    onChange={handleInputChange}
                    placeholder="Host | Content Creator | Storyteller"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaHref">CTA Link</Label>
                  <Input
                    id="ctaHref"
                    name="ctaHref"
                    value={form.ctaHref}
                    onChange={handleInputChange}
                    placeholder="/about"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Banner"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
