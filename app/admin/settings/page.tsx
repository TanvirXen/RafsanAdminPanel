"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import apiList from "@/apiList";

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
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
  Save,
  Plus,
  Trash2,
  Users,
  Calendar,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/image-upload";
import { toast } from "react-toastify";

type IconName = "Users" | "Calendar" | "Award" | "TrendingUp" | "Globe";

interface QuickFact {
  id: string;
  title: string;
  icon: IconName;
  description: string;
}

type SettingsDto = {
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    website?: string;
  };
  heroSection?: {
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
  };
  aboutSection?: { title?: string; description?: string; image?: string };
  quickFacts?: QuickFact[];
};

export default function SettingsPage() {
  /* ---------- loading/saving flags ---------- */
  const [loading, setLoading] = useState(true);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingFacts, setSavingFacts] = useState(false);

  /* ---------- states ---------- */
  const [socialLinks, setSocialLinks] = useState<
    NonNullable<SettingsDto["socialLinks"]>
  >({
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    website: "",
  });

  const [heroSection, setHeroSection] = useState<
    NonNullable<SettingsDto["heroSection"]>
  >({
    title: "",
    subtitle: "",
    description: "",
    image: "",
  });

  const [aboutSection, setAboutSection] = useState<
    NonNullable<SettingsDto["aboutSection"]>
  >({
    title: "",
    description: "",
    image: "",
  });

  const [quickFacts, setQuickFacts] = useState<QuickFact[]>([]);

  /* ---------- icons ---------- */
  const iconMap: Record<IconName, React.ReactNode> = useMemo(
    () => ({
      Users: <Users className='h-8 w-8' />,
      Calendar: <Calendar className='h-8 w-8' />,
      Award: <Award className='h-8 w-8' />,
      TrendingUp: <TrendingUp className='h-8 w-8' />,
      Globe: <Globe className='h-8 w-8' />,
    }),
    []
  );

  /* ---------- load settings ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiList.settings.get, {
          credentials: "include",
        });
        const j = await res.json();
        const s: SettingsDto = j.setting || j.data || {};
        if (s.socialLinks)
          setSocialLinks((prev) => ({ ...prev, ...s.socialLinks }));
        if (s.heroSection)
          setHeroSection((prev) => ({ ...prev, ...s.heroSection }));
        if (s.aboutSection)
          setAboutSection((prev) => ({ ...prev, ...s.aboutSection }));
        if (s.quickFacts) setQuickFacts(s.quickFacts);
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- helpers ---------- */
  const putSettings = async (payload: SettingsDto) => {
    const res = await fetch(apiList.settings.update, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.message || "Failed to save settings");
    // normalize back from server response
    const s: SettingsDto = j.setting || {};
    if (s.socialLinks)
      setSocialLinks((prev) => ({ ...prev, ...s.socialLinks }));
    if (s.heroSection)
      setHeroSection((prev) => ({ ...prev, ...s.heroSection }));
    if (s.aboutSection)
      setAboutSection((prev) => ({ ...prev, ...s.aboutSection }));
    if (s.quickFacts) setQuickFacts(s.quickFacts);
  };

  /* ---------- social ---------- */
  const handleSocialLinkChange = (
    platform: keyof NonNullable<SettingsDto["socialLinks"]>,
    value: string
  ) => {
    setSocialLinks((prev) => ({ ...prev, [platform]: value }));
  };
  const handleSaveSocialLinks = async () => {
    try {
      setSavingSocial(true);
      await putSettings({ socialLinks });
      toast.success("Social links saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingSocial(false);
    }
  };

  /* ---------- hero ---------- */
  const handleHeroChange = (
    field: keyof NonNullable<SettingsDto["heroSection"]>,
    value: string
  ) => {
    setHeroSection((prev) => ({ ...prev, [field]: value }));
  };
  const handleSaveHeroSection = async () => {
    try {
      setSavingHero(true);
      await putSettings({ heroSection });
      toast.success("Hero section saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingHero(false);
    }
  };

  /* ---------- about ---------- */
  const handleAboutChange = (
    field: keyof NonNullable<SettingsDto["aboutSection"]>,
    value: string
  ) => {
    setAboutSection((prev) => ({ ...prev, [field]: value }));
  };
  const handleSaveAboutSection = async () => {
    try {
      setSavingAbout(true);
      await putSettings({ aboutSection });
      toast.success("About section saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingAbout(false);
    }
  };

  /* ---------- quick facts ---------- */
  const handleAddQuickFact = () => {
    const newFact: QuickFact = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      title: "",
      icon: "Users",
      description: "",
    };
    setQuickFacts((prev) => [...prev, newFact]);
  };
  const handleQuickFactChange = (
    id: string,
    field: keyof QuickFact,
    value: string
  ) => {
    setQuickFacts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };
  const handleDeleteQuickFact = (id: string) =>
    setQuickFacts((prev) => prev.filter((f) => f.id !== id));
  const handleSaveQuickFacts = async () => {
    try {
      setSavingFacts(true);
      // minimal validation before sending (backend also validates)
      for (const f of quickFacts) {
        if (!f.id || !f.title || !f.icon || !f.description) {
          toast.error("Each quick fact needs id, title, icon, and description");
          setSavingFacts(false);
          return;
        }
      }
      await putSettings({ quickFacts });
      toast.success("Quick facts saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingFacts(false);
    }
  };

  if (loading) {
    return (
      <div className='p-6'>
        <PageHeader
          title='Settings'
          description='Manage your website settings, social links, and content sections'
        />
        <div className='mt-6 text-sm text-muted-foreground'>
          Loading settings…
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 p-6'>
      <PageHeader
        title='Settings'
        description='Manage your website settings, social links, and content sections'
      />

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Globe className='h-5 w-5' />
            Social Media Links
          </CardTitle>
          <CardDescription>
            Update your social media profiles and website URL
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='facebook' className='flex items-center gap-2'>
                <Facebook className='h-4 w-4 text-blue-600' />
                Facebook
              </Label>
              <Input
                id='facebook'
                type='url'
                placeholder='https://facebook.com/yourpage'
                value={socialLinks.facebook || ""}
                onChange={(e) =>
                  handleSocialLinkChange("facebook", e.target.value)
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='twitter' className='flex items-center gap-2'>
                <Twitter className='h-4 w-4 text-sky-500' />
                Twitter / X
              </Label>
              <Input
                id='twitter'
                type='url'
                placeholder='https://twitter.com/yourhandle'
                value={socialLinks.twitter || ""}
                onChange={(e) =>
                  handleSocialLinkChange("twitter", e.target.value)
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='instagram' className='flex items-center gap-2'>
                <Instagram className='h-4 w-4 text-pink-600' />
                Instagram
              </Label>
              <Input
                id='instagram'
                type='url'
                placeholder='https://instagram.com/yourprofile'
                value={socialLinks.instagram || ""}
                onChange={(e) =>
                  handleSocialLinkChange("instagram", e.target.value)
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='linkedin' className='flex items-center gap-2'>
                <Linkedin className='h-4 w-4 text-blue-700' />
                LinkedIn
              </Label>
              <Input
                id='linkedin'
                type='url'
                placeholder='https://linkedin.com/company/yourcompany'
                value={socialLinks.linkedin || ""}
                onChange={(e) =>
                  handleSocialLinkChange("linkedin", e.target.value)
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='youtube' className='flex items-center gap-2'>
                <Youtube className='h-4 w-4 text-red-600' />
                YouTube
              </Label>
              <Input
                id='youtube'
                type='url'
                placeholder='https://youtube.com/@yourchannel'
                value={socialLinks.youtube || ""}
                onChange={(e) =>
                  handleSocialLinkChange("youtube", e.target.value)
                }
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='website' className='flex items-center gap-2'>
                <Globe className='h-4 w-4 text-gray-600' />
                Website
              </Label>
              <Input
                id='website'
                type='url'
                placeholder='https://yourwebsite.com'
                value={socialLinks.website || ""}
                onChange={(e) =>
                  handleSocialLinkChange("website", e.target.value)
                }
              />
            </div>
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              onClick={handleSaveSocialLinks}
              className='gap-2'
              disabled={savingSocial}
            >
              <Save className='h-4 w-4' />
              {savingSocial ? "Saving…" : "Save Social Links"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>
            Customize the hero section on your homepage
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <ImageUpload
            label='Hero Image'
            value={heroSection.image || ""}
            onChange={(value) =>
              setHeroSection((p) => ({ ...p, image: value }))
            }
            placeholder='Upload or paste hero image URL'
          />

          <Separator />

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='hero-title'>Hero Title</Label>
              <Input
                id='hero-title'
                placeholder='Enter hero title'
                value={heroSection.title || ""}
                onChange={(e) => handleHeroChange("title", e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='hero-subtitle'>Hero Subtitle</Label>
              <Input
                id='hero-subtitle'
                placeholder='Enter hero subtitle'
                value={heroSection.subtitle || ""}
                onChange={(e) => handleHeroChange("subtitle", e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='hero-description'>Hero Description</Label>
              <Textarea
                id='hero-description'
                placeholder='Enter hero description'
                rows={4}
                value={heroSection.description || ""}
                onChange={(e) =>
                  handleHeroChange("description", e.target.value)
                }
              />
            </div>
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              onClick={handleSaveHeroSection}
              className='gap-2'
              disabled={savingHero}
            >
              <Save className='h-4 w-4' />
              {savingHero ? "Saving…" : "Save Hero Section"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About Section</CardTitle>
          <CardDescription>
            Customize the about section on your website
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <ImageUpload
            label='About Image'
            value={aboutSection.image || ""}
            onChange={(value) =>
              setAboutSection((p) => ({ ...p, image: value }))
            }
            placeholder='Upload or paste about image URL'
          />

          <Separator />

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='about-title'>About Title</Label>
              <Input
                id='about-title'
                placeholder='Enter about title'
                value={aboutSection.title || ""}
                onChange={(e) => handleAboutChange("title", e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='about-description'>About Description</Label>
              <Textarea
                id='about-description'
                placeholder='Enter about description'
                rows={6}
                value={aboutSection.description || ""}
                onChange={(e) =>
                  handleAboutChange("description", e.target.value)
                }
              />
            </div>
          </div>

          <div className='flex justify-end pt-4'>
            <Button
              onClick={handleSaveAboutSection}
              className='gap-2'
              disabled={savingAbout}
            >
              <Save className='h-4 w-4' />
              {savingAbout ? "Saving…" : "Save About Section"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Quick Facts */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Facts</CardTitle>
          <CardDescription>
            Add statistics and key facts about your platform
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-4'>
            {quickFacts.map((fact) => (
              <Card key={fact.id} className='border-2'>
                <CardContent className='pt-6'>
                  <div className='grid gap-4 md:grid-cols-4'>
                    <div className='space-y-2'>
                      <Label htmlFor={`fact-title-${fact.id}`}>
                        Title/Number
                      </Label>
                      <Input
                        id={`fact-title-${fact.id}`}
                        placeholder='e.g., 10,000+'
                        value={fact.title}
                        onChange={(e) =>
                          handleQuickFactChange(
                            fact.id,
                            "title",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor={`fact-icon-${fact.id}`}>Icon</Label>
                      <Select
                        value={fact.icon}
                        onValueChange={(value: IconName) =>
                          handleQuickFactChange(fact.id, "icon", value)
                        }
                      >
                        <SelectTrigger id={`fact-icon-${fact.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Users'>
                            <div className='flex items-center gap-2'>
                              <Users className='h-4 w-4' /> Users
                            </div>
                          </SelectItem>
                          <SelectItem value='Calendar'>
                            <div className='flex items-center gap-2'>
                              <Calendar className='h-4 w-4' /> Calendar
                            </div>
                          </SelectItem>
                          <SelectItem value='Award'>
                            <div className='flex items-center gap-2'>
                              <Award className='h-4 w-4' /> Award
                            </div>
                          </SelectItem>
                          <SelectItem value='TrendingUp'>
                            <div className='flex items-center gap-2'>
                              <TrendingUp className='h-4 w-4' /> Trending Up
                            </div>
                          </SelectItem>
                          <SelectItem value='Globe'>
                            <div className='flex items-center gap-2'>
                              <Globe className='h-4 w-4' /> Globe
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-2 md:col-span-2'>
                      <Label htmlFor={`fact-description-${fact.id}`}>
                        Description
                      </Label>
                      <div className='flex gap-2'>
                        <Input
                          id={`fact-description-${fact.id}`}
                          placeholder='e.g., Active Users'
                          value={fact.description}
                          onChange={(e) =>
                            handleQuickFactChange(
                              fact.id,
                              "description",
                              e.target.value
                            )
                          }
                          className='flex-1'
                        />
                        <Button
                          type='button'
                          variant='destructive'
                          size='icon'
                          onClick={() => handleDeleteQuickFact(fact.id)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* tiny live icon preview */}
                  <div className='mt-3 text-muted-foreground flex items-center gap-2'>
                    <span className='text-xs'>Preview:</span>
                    {iconMap[fact.icon]}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            type='button'
            variant='outline'
            onClick={handleAddQuickFact}
            className='w-full gap-2 bg-transparent'
          >
            <Plus className='h-4 w-4' />
            Add Quick Fact
          </Button>

          <div className='flex justify-end pt-4'>
            <Button
              onClick={handleSaveQuickFacts}
              className='gap-2'
              disabled={savingFacts}
            >
              <Save className='h-4 w-4' />
              {savingFacts ? "Saving…" : "Save Quick Facts"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
