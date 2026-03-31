// app/admin/banners/page.tsx
"use client";

import { useEffect, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { broadcastAdminSync } from "@/hooks/use-admin-sync";

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

type SettingsDto = {
  heroSection?: {
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
  };
  aboutSection?: {
    title?: string;
    description?: string;
    image?: string;
  };
};

type HeroSectionForm = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
};

type StoryTeaserForm = {
  title: string;
  description: string;
  image: string;
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

const EMPTY_HERO_SECTION: HeroSectionForm = {
  title: "",
  subtitle: "",
  description: "",
  image: "",
};

const EMPTY_STORY_TEASER: StoryTeaserForm = {
  title: "",
  description: "",
  image: "",
};

export default function BannerSettingsPage() {
  const [activeType, setActiveType] = useState<BannerType>("about");
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [heroSection, setHeroSection] =
    useState<HeroSectionForm>(EMPTY_HERO_SECTION);
  const [storyTeaser, setStoryTeaser] =
    useState<StoryTeaserForm>(EMPTY_STORY_TEASER);
  const [loadingPageSections, setLoadingPageSections] = useState(false);
  const [savingHeroSection, setSavingHeroSection] = useState(false);
  const [savingStoryTeaser, setSavingStoryTeaser] = useState(false);

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

      const isAboutType = type === "about";
      const isGalleryType = type === "gallery";

      setForm({
        title: banner.title || (isAboutType ? "RAFSAN SABAB" : "Media Gallery"),
        subtitle:
          banner.subtitle ||
          (isGalleryType
            ? "Some of the remarkable events that I have had the privilege to host."
            : ""),
        kicker:
          banner.kicker ||
          "From the classrooms of IBA to the bright lights of the stage and screen.",
        ctaLabel: banner.ctaLabel || "Host | Content Creator | Storyteller",
        ctaHref: banner.ctaHref || "/about",
        mobileImage:
          banner.mobileImage ||
          (isAboutType ? "/assets/aboutBanner.png" : "/assets/aboutBanner.png"),
        desktopImage:
          banner.desktopImage ||
          (isAboutType
            ? "/assets/aboutBannerD.png"
            : "/assets/aboutBannerD.png"),
        heroImage:
          banner.heroImage ||
          (isGalleryType ? "/assets/mediaB.jpg" : "/assets/mediaB.jpg"),
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

  const loadPageSections = async () => {
    setLoadingPageSections(true);
    try {
      const response = await apiFetch<{ setting?: SettingsDto; data?: SettingsDto }>(
        apiList.settings.get
      );
      const settings = response.setting || response.data || {};

      setHeroSection({
        ...EMPTY_HERO_SECTION,
        ...(settings.heroSection || {}),
      });
      setStoryTeaser({
        ...EMPTY_STORY_TEASER,
        ...(settings.aboutSection || {}),
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load homepage sections");
    } finally {
      setLoadingPageSections(false);
    }
  };

  useEffect(() => {
    void loadPageSections();
  }, []);

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

      broadcastAdminSync(["banners", "settings"]);
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

  const updatePageSections = async (payload: SettingsDto) => {
    const response = await apiFetch<{ setting?: SettingsDto; data?: SettingsDto }>(
      apiList.settings.update,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    const settings = response.setting || response.data || {};

    setHeroSection((prev) => ({
      ...prev,
      ...(settings.heroSection || {}),
    }));
    setStoryTeaser((prev) => ({
      ...prev,
      ...(settings.aboutSection || {}),
    }));

    broadcastAdminSync(["settings", "banners"]);
  };

  const handleSaveHeroSection = async () => {
    setSavingHeroSection(true);
    try {
      await updatePageSections({ heroSection });
      toast.success("Homepage hero section saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save homepage hero section");
    } finally {
      setSavingHeroSection(false);
    }
  };

  const handleSaveStoryTeaser = async () => {
    setSavingStoryTeaser(true);
    try {
      await updatePageSections({ aboutSection: storyTeaser });
      toast.success("Story teaser section saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save story teaser section");
    } finally {
      setSavingStoryTeaser(false);
    }
  };

  return (
    <div className='p-6 flex flex-col gap-6'>
      <PageHeader
        title='Banner Settings'
        description='Manage About, Gallery, homepage hero, and story teaser sections'
      />

      {/* toggle */}
      <div className='flex justify-end'>
        <div className='inline-flex rounded-full border border-gray-300 overflow-hidden text-sm'>
          <button
            type='button'
            onClick={() => setActiveType("about")}
            className={`px-4 py-2 ${
              activeType === "about" ? "bg-black text-white" : "bg-white"
            }`}
          >
            About Banner
          </button>
          <button
            type='button'
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
          <CardTitle>{isAbout ? "About Banner" : "Gallery Banner"}</CardTitle>
          <CardDescription>
            {isAbout
              ? "Controls the hero banner on the About page."
              : "Controls the hero banner on the Media Gallery page."}
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          {loading && <p className='text-sm text-muted-foreground'>Loading…</p>}

          {/* Images */}
          {isAbout && (
            <div className='grid gap-4 md:grid-cols-2'>
              <ImageUpload
                // 🔑 Key forces remount when the URL changes so preview updates
                key={form.mobileImage || "about-mobile-default"}
                label='Mobile / Tablet Image'
                value={form.mobileImage || "/assets/aboutBanner.png"}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, mobileImage: value }))
                }
                placeholder='/assets/aboutBanner.png'
              />
              <ImageUpload
                key={form.desktopImage || "about-desktop-default"}
                label='Desktop Image'
                value={form.desktopImage || "/assets/aboutBannerD.png"}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, desktopImage: value }))
                }
                placeholder='/assets/aboutBannerD.png'
              />
            </div>
          )}

          {isGallery && (
            <div className='space-y-4'>
              <ImageUpload
                key={form.heroImage || "gallery-hero-default"}
                label='Hero Image'
                value={form.heroImage || "/assets/mediaB.jpg"}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, heroImage: value }))
                }
                placeholder='/assets/mediaB.jpg'
              />
              <div className='space-y-2'>
                <Label htmlFor='alt'>Hero Alt Text</Label>
                <Input
                  id='alt'
                  name='alt'
                  value={form.alt}
                  onChange={handleInputChange}
                  placeholder='Media Gallery hero'
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Text content */}
          <div className='space-y-4'>
            {isAbout && (
              <div className='space-y-2'>
                <Label htmlFor='kicker'>Kicker / Intro Line</Label>
                <Textarea
                  id='kicker'
                  name='kicker'
                  rows={2}
                  value={form.kicker}
                  onChange={handleInputChange}
                  placeholder='From the classrooms of IBA to the bright lights of the stage and screen.'
                />
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='title'>Title</Label>
              <Input
                id='title'
                name='title'
                value={form.title}
                onChange={handleInputChange}
                placeholder={isAbout ? "RAFSAN SABAB" : "Media Gallery"}
              />
            </div>

            {isGallery && (
              <div className='space-y-2'>
                <Label htmlFor='subtitle'>Subtitle</Label>
                <Textarea
                  id='subtitle'
                  name='subtitle'
                  rows={2}
                  value={form.subtitle}
                  onChange={handleInputChange}
                  placeholder='Some of the remarkable events that I have had the privilege to host.'
                />
              </div>
            )}

            {isAbout && (
              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='ctaLabel'>CTA Label</Label>
                  <Input
                    id='ctaLabel'
                    name='ctaLabel'
                    value={form.ctaLabel}
                    onChange={handleInputChange}
                    placeholder='Host | Content Creator | Storyteller'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='ctaHref'>CTA Link</Label>
                  <Input
                    id='ctaHref'
                    name='ctaHref'
                    value={form.ctaHref}
                    onChange={handleInputChange}
                    placeholder='/about'
                  />
                </div>
              </div>
            )}
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              type='button'
              onClick={handleSave}
              disabled={saving}
              className='gap-2'
            >
              <Save className='h-4 w-4' />
              {saving ? "Saving…" : "Save Banner"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Homepage Hero Section</CardTitle>
          <CardDescription>
            Controls the homepage hero content using the same layout style as the banner editor.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          {loadingPageSections && (
            <p className='text-sm text-muted-foreground'>Loadingâ€¦</p>
          )}

          <ImageUpload
            key={heroSection.image || "homepage-hero-default"}
            label='Hero Image'
            value={heroSection.image}
            onChange={(value) =>
              setHeroSection((prev) => ({ ...prev, image: value || "" }))
            }
            placeholder='Upload or paste hero image URL'
          />

          <Separator />

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='homepage-hero-title'>Hero Title</Label>
              <Input
                id='homepage-hero-title'
                value={heroSection.title}
                onChange={(e) =>
                  setHeroSection((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder='Enter hero title'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='homepage-hero-subtitle'>Hero Subtitle</Label>
              <Input
                id='homepage-hero-subtitle'
                value={heroSection.subtitle}
                onChange={(e) =>
                  setHeroSection((prev) => ({
                    ...prev,
                    subtitle: e.target.value,
                  }))
                }
                placeholder='Enter hero subtitle'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='homepage-hero-description'>Hero Description</Label>
              <Textarea
                id='homepage-hero-description'
                rows={4}
                value={heroSection.description}
                onChange={(e) =>
                  setHeroSection((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder='Enter hero description'
              />
            </div>
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              type='button'
              onClick={handleSaveHeroSection}
              disabled={savingHeroSection}
              className='gap-2'
            >
              <Save className='h-4 w-4' />
              {savingHeroSection ? "Savingâ€¦" : "Save Hero Section"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Story Teaser Section</CardTitle>
          <CardDescription>
            Controls the homepage story teaser section using the same layout style as the banner editor.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          {loadingPageSections && (
            <p className='text-sm text-muted-foreground'>Loadingâ€¦</p>
          )}

          <ImageUpload
            key={storyTeaser.image || "story-teaser-default"}
            label='Story Teaser Image'
            value={storyTeaser.image}
            onChange={(value) =>
              setStoryTeaser((prev) => ({ ...prev, image: value || "" }))
            }
            placeholder='Upload or paste story teaser image URL'
          />

          <Separator />

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='story-teaser-title'>Story Teaser Title</Label>
              <Input
                id='story-teaser-title'
                value={storyTeaser.title}
                onChange={(e) =>
                  setStoryTeaser((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder='Enter story teaser title'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='story-teaser-description'>
                Story Teaser Description
              </Label>
              <Textarea
                id='story-teaser-description'
                rows={4}
                value={storyTeaser.description}
                onChange={(e) =>
                  setStoryTeaser((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder='Enter story teaser description'
              />
            </div>
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              type='button'
              onClick={handleSaveStoryTeaser}
              disabled={savingStoryTeaser}
              className='gap-2'
            >
              <Save className='h-4 w-4' />
              {savingStoryTeaser ? "Savingâ€¦" : "Save Story Teaser"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
