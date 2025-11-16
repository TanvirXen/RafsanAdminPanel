"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
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

/* ====================== TYPES ====================== */

type IconName = "Users" | "Calendar" | "Award" | "TrendingUp" | "Globe";

interface QuickFact {
  id: string;
  title: string;
  icon: IconName;
  description: string;
}

type HelpKey =
  | "sessions_workshops"
  | "corporate_shows"
  | "hosting_event"
  | "brand_collab";

type HelpCard = {
  id: string;
  key: HelpKey;
  title: string;
  description: string;
};

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
  helpSection?: { cards?: HelpCard[] };
};

/* ====== FIXED ORDER BY KEY ====== */
const HELP_ORDER: HelpKey[] = [
  "hosting_event",
  "sessions_workshops",
  "brand_collab",
  "corporate_shows",
];

const HELP_TITLE_FALLBACK: Record<HelpKey, string> = {
  hosting_event: "Hosting an Event",
  sessions_workshops: "Sessions & Workshops",
  brand_collab: "Brand Collaboration",
  corporate_shows: "Corporate Shows",
};
const HELP_DESC_FALLBACK: Record<HelpKey, string> = {
  hosting_event:
    "From corporate gatherings to cultural festivals, I focus on creating a truly engaging and lively atmosphere. My sincere humor and audience connection ensure a seamless, inclusive, and memorable event",
  sessions_workshops:
    "I conduct interactive sessions and workshops for universities, organizations, professionals, and even aspiring hosts. In these energetic sessions, I share my journey, the essential insights, and the practical skills I've learned. Participants walk away ready to apply powerful communication and storytelling techniques for real-world success.",
  brand_collab:
    "I help brands tell stories that truly connect. With content and creative campaigns, I make your brand unforgettable.",
  corporate_shows:
    "Turn your workplace into a stage of laughter and energy ! Fun,interactive corporate sows that boost smiles ,spirit and teamwork.",
};

export default function SettingsPage() {
  /* ---------- loading/saving flags ---------- */
  const [loading, setLoading] = useState(true);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingFacts, setSavingFacts] = useState(false);
  const [savingHelp, setSavingHelp] = useState(false);

  /* ---------- state ---------- */
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
  const [helpCards, setHelpCards] = useState<HelpCard[]>([]);

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

  /* ====================== LOAD SETTINGS ====================== */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const j = await apiFetch<{ setting?: SettingsDto; data?: SettingsDto }>(
          apiList.settings.get
        );
        const s: SettingsDto = j.setting || j.data || {};

        if (!alive) return;

        if (s.socialLinks)
          setSocialLinks((prev) => ({ ...prev, ...s.socialLinks }));
        if (s.heroSection)
          setHeroSection((prev) => ({ ...prev, ...s.heroSection }));
        if (s.aboutSection)
          setAboutSection((prev) => ({ ...prev, ...s.aboutSection }));
        if (s.quickFacts) setQuickFacts(s.quickFacts);

        // Normalize help cards strictly by key order (no serials)
        const byKey = new Map<HelpKey, HelpCard>();
        (s.helpSection?.cards || []).forEach((c) => {
          if (c?.key) byKey.set(c.key as HelpKey, c as HelpCard);
        });

        const ensureId = () =>
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const normalized: HelpCard[] = HELP_ORDER.map((k) => {
          const fromDb = byKey.get(k);
          return {
            id: fromDb?.id || ensureId(),
            key: k,
            title: fromDb?.title || HELP_TITLE_FALLBACK[k],
            description: fromDb?.description || HELP_DESC_FALLBACK[k],
          };
        });

        setHelpCards(normalized);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ====================== HELPERS ====================== */
  const putSettings = async (payload: SettingsDto) => {
    const j = await apiFetch<{ setting?: SettingsDto }>(
      apiList.settings.update,
      { method: "PUT", body: JSON.stringify(payload) }
    );
    const s: SettingsDto = j.setting || {};

    if (s.socialLinks)
      setSocialLinks((prev) => ({ ...prev, ...s.socialLinks }));
    if (s.heroSection)
      setHeroSection((prev) => ({ ...prev, ...s.heroSection }));
    if (s.aboutSection)
      setAboutSection((prev) => ({ ...prev, ...s.aboutSection }));
    if (s.quickFacts) setQuickFacts(s.quickFacts);

    // Normalize help cards from server (still by key order)
    const byKey = new Map<HelpKey, HelpCard>();
    (s.helpSection?.cards || []).forEach((c) => {
      if (c?.key) byKey.set(c.key as HelpKey, c as HelpCard);
    });

    const normalized: HelpCard[] = HELP_ORDER.map((k) => ({
      id:
        byKey.get(k)?.id ||
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      key: k,
      title: byKey.get(k)?.title || HELP_TITLE_FALLBACK[k],
      description: byKey.get(k)?.description || HELP_DESC_FALLBACK[k],
    }));
    setHelpCards(normalized);
  };

  /* ---------- social ---------- */
  const handleSocialLinkChange = (
    platform: keyof NonNullable<SettingsDto["socialLinks"]>,
    value: string
  ) => setSocialLinks((prev) => ({ ...prev, [platform]: value }));

  const handleSaveSocialLinks = async () => {
    try {
      setSavingSocial(true);
      await putSettings({ socialLinks });
      toast.success("Social links saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingSocial(false);
    }
  };

  /* ---------- hero ---------- */
  const handleHeroChange = (
    field: keyof NonNullable<SettingsDto["heroSection"]>,
    value: string
  ) => setHeroSection((prev) => ({ ...prev, [field]: value }));

  const handleSaveHeroSection = async () => {
    try {
      setSavingHero(true);
      await putSettings({ heroSection });
      toast.success("Hero section saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingHero(false);
    }
  };

  /* ---------- about ---------- */
  const handleAboutChange = (
    field: keyof NonNullable<SettingsDto["aboutSection"]>,
    value: string
  ) => setAboutSection((prev) => ({ ...prev, [field]: value }));

  const handleSaveAboutSection = async () => {
    try {
      setSavingAbout(true);
      await putSettings({ aboutSection });
      toast.success("About section saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
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
  ) =>
    setQuickFacts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );

  const handleDeleteQuickFact = (id: string) =>
    setQuickFacts((prev) => prev.filter((f) => f.id !== id));

  const handleSaveQuickFacts = async () => {
    try {
      setSavingFacts(true);
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
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingFacts(false);
    }
  };

  /* ---------- help section (no serials) ---------- */
  const handleHelpChange = (
    id: string,
    key: HelpKey,
    field: keyof HelpCard,
    value: string
  ) => {
    if (field === "key") return; // keys fixed

    setHelpCards((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      // If card not in state yet (e.g. fallback), create it
      if (idx === -1) {
        const base: HelpCard = {
          id,
          key,
          title: field === "title" ? value : HELP_TITLE_FALLBACK[key],
          description:
            field === "description" ? value : HELP_DESC_FALLBACK[key],
        };
        return [...prev, base];
      }

      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSaveHelpSection = async () => {
    try {
      setSavingHelp(true);

      const payloadCards: HelpCard[] = HELP_ORDER.map((k) => {
        const found = helpCards.find((c) => c.key === k);
        const id =
          found?.id ||
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        return {
          id,
          key: k,
          title: found?.title || HELP_TITLE_FALLBACK[k],
          description: found?.description || HELP_DESC_FALLBACK[k],
        };
      });

      await putSettings({ helpSection: { cards: payloadCards } });
      toast.success("Help section saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingHelp(false);
    }
  };

  /* ====================== RENDER ====================== */

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

  // Derived view for help cards: always 4 in fixed order, with safe fallbacks
  const viewHelpCards: HelpCard[] = HELP_ORDER.map((k) => {
    const fromState = helpCards.find((c) => c.key === k);
    return {
      id: fromState?.id || `help-${k}`,
      key: k,
      title: fromState?.title || HELP_TITLE_FALLBACK[k],
      description: fromState?.description || HELP_DESC_FALLBACK[k],
    };
  });

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
          <CardTitle>Story Teaser Section</CardTitle>
          <CardDescription>
            Controls the story teaser on the homepage
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
              <Label htmlFor='about-title'>Story Teaser Title</Label>
              <Input
                id='about-title'
                placeholder='Enter story teaser title (e.g., Host | Content Creator | Storyteller)'
                value={aboutSection.title || ""}
                onChange={(e) => handleAboutChange("title", e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='about-description'>Story Teaser Description</Label>
              <Textarea
                id='about-description'
                placeholder='Enter story teaser description'
                rows={4}
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
              {savingAbout ? "Saving…" : "Save Story Section"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Help Section (NO SERIAL) */}
      <Card>
        <CardHeader>
          <CardTitle>Help Section (Cards)</CardTitle>
          <CardDescription>
            Fixed order by key: 1 <b>Hosting an Event</b>, 2{" "}
            <b>Sessions &amp; Workshops</b>, 3 <b>Brand Collaboration</b>, 4{" "}
            <b>Corporate Shows</b>.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-4'>
            {viewHelpCards.map((c) => (
              <Card key={c.id} className='border-2'>
                <CardContent className='pt-6 space-y-4'>
                  <div className='grid gap-4 md:grid-cols-4'>
                    {/* <div className='space-y-2'>
                      <Label>Key</Label>
                      <Input value={c.key} readOnly />
                    </div> */}

                    <div className='space-y-2 md:col-span-3'>
                      <Label>Title</Label>
                      <Input
                        value={c.title}
                        onChange={(e) =>
                          handleHelpChange(c.id, c.key, "title", e.target.value)
                        }
                      />
                    </div>

                    <div className='space-y-2 md:col-span-4'>
                      <Label>Description</Label>
                      <Textarea
                        rows={4}
                        value={c.description}
                        onChange={(e) =>
                          handleHelpChange(
                            c.id,
                            c.key,
                            "description",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='flex justify-end pt-2'>
            <Button
              onClick={handleSaveHelpSection}
              className='gap-2'
              disabled={savingHelp}
            >
              <Save className='h-4 w-4' />
              {savingHelp ? "Saving…" : "Save Help Section"}
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
