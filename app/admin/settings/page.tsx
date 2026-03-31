"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
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
import { toast } from "react-toastify";

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
  aboutSection?: {
    title?: string;
    description?: string;
    image?: string;
  };
  quickFacts?: QuickFact[];
  helpSection?: { cards?: HelpCard[] };
};

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

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingFacts, setSavingFacts] = useState(false);
  const [savingHelp, setSavingHelp] = useState(false);

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

  const [quickFacts, setQuickFacts] = useState<QuickFact[]>([]);
  const [helpCards, setHelpCards] = useState<HelpCard[]>([]);

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

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const response = await apiFetch<{
          setting?: SettingsDto;
          data?: SettingsDto;
        }>(apiList.settings.get);
        const settings = response.setting || response.data || {};

        if (!alive) return;

        if (settings.socialLinks) {
          setSocialLinks((prev) => ({ ...prev, ...settings.socialLinks }));
        }

        if (settings.quickFacts) {
          setQuickFacts(settings.quickFacts);
        }

        const byKey = new Map<HelpKey, HelpCard>();
        (settings.helpSection?.cards || []).forEach((card) => {
          if (card?.key) {
            byKey.set(card.key as HelpKey, card as HelpCard);
          }
        });

        const normalized: HelpCard[] = HELP_ORDER.map((key) => {
          const fromDb = byKey.get(key);
          return {
            id: fromDb?.id || createId(),
            key,
            title: fromDb?.title || HELP_TITLE_FALLBACK[key],
            description: fromDb?.description || HELP_DESC_FALLBACK[key],
          };
        });

        setHelpCards(normalized);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load settings");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const putSettings = async (payload: SettingsDto) => {
    const response = await apiFetch<{ setting?: SettingsDto }>(
      apiList.settings.update,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    );
    const settings = response.setting || {};

    if (settings.socialLinks) {
      setSocialLinks((prev) => ({ ...prev, ...settings.socialLinks }));
    }

    if (settings.quickFacts) {
      setQuickFacts(settings.quickFacts);
    }

    const byKey = new Map<HelpKey, HelpCard>();
    (settings.helpSection?.cards || []).forEach((card) => {
      if (card?.key) {
        byKey.set(card.key as HelpKey, card as HelpCard);
      }
    });

    if (byKey.size) {
      const normalized: HelpCard[] = HELP_ORDER.map((key) => ({
        id: byKey.get(key)?.id || createId(),
        key,
        title: byKey.get(key)?.title || HELP_TITLE_FALLBACK[key],
        description:
          byKey.get(key)?.description || HELP_DESC_FALLBACK[key],
      }));
      setHelpCards(normalized);
    }

    broadcastAdminSync("settings");
  };

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
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    } finally {
      setSavingSocial(false);
    }
  };

  const handleAddQuickFact = () => {
    setQuickFacts((prev) => [
      ...prev,
      {
        id: createId(),
        title: "",
        icon: "Users",
        description: "",
      },
    ]);
  };

  const handleQuickFactChange = (
    id: string,
    field: keyof QuickFact,
    value: string
  ) => {
    setQuickFacts((prev) =>
      prev.map((fact) => (fact.id === id ? { ...fact, [field]: value } : fact))
    );
  };

  const handleDeleteQuickFact = (id: string) => {
    setQuickFacts((prev) => prev.filter((fact) => fact.id !== id));
  };

  const handleSaveQuickFacts = async () => {
    try {
      setSavingFacts(true);

      for (const fact of quickFacts) {
        if (!fact.id || !fact.title || !fact.icon || !fact.description) {
          toast.error("Each quick fact needs id, title, icon, and description");
          setSavingFacts(false);
          return;
        }
      }

      await putSettings({ quickFacts });
      toast.success("Quick facts saved");
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    } finally {
      setSavingFacts(false);
    }
  };

  const handleHelpChange = (
    id: string,
    key: HelpKey,
    field: keyof HelpCard,
    value: string
  ) => {
    if (field === "key") return;

    setHelpCards((prev) => {
      const index = prev.findIndex((card) => card.id === id);

      if (index === -1) {
        return [
          ...prev,
          {
            id,
            key,
            title: field === "title" ? value : HELP_TITLE_FALLBACK[key],
            description:
              field === "description" ? value : HELP_DESC_FALLBACK[key],
          },
        ];
      }

      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveHelpSection = async () => {
    try {
      setSavingHelp(true);

      const payloadCards: HelpCard[] = HELP_ORDER.map((key) => {
        const found = helpCards.find((card) => card.key === key);
        return {
          id: found?.id || createId(),
          key,
          title: found?.title || HELP_TITLE_FALLBACK[key],
          description: found?.description || HELP_DESC_FALLBACK[key],
        };
      });

      await putSettings({ helpSection: { cards: payloadCards } });
      toast.success("Help section saved");
    } catch (error: any) {
      toast.error(error?.message || "Save failed");
    } finally {
      setSavingHelp(false);
    }
  };

  if (loading) {
    return (
      <div className='p-6'>
        <PageHeader
          title='Settings'
          description='Manage your website settings, social links, and supporting homepage content'
        />
        <div className='mt-6 text-sm text-muted-foreground'>
          Loading settings...
        </div>
      </div>
    );
  }

  const viewHelpCards: HelpCard[] = HELP_ORDER.map((key) => {
    const fromState = helpCards.find((card) => card.key === key);
    return {
      id: fromState?.id || `help-${key}`,
      key,
      title: fromState?.title || HELP_TITLE_FALLBACK[key],
      description: fromState?.description || HELP_DESC_FALLBACK[key],
    };
  });

  return (
    <div className='flex flex-col gap-6 p-6'>
      <PageHeader
        title='Settings'
        description='Manage your social links, quick facts, and help section content'
      />

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
              {savingSocial ? "Saving..." : "Save Social Links"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

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
            {viewHelpCards.map((card) => (
              <Card key={card.id} className='border-2'>
                <CardContent className='space-y-4 pt-6'>
                  <div className='grid gap-4 md:grid-cols-4'>
                    <div className='space-y-2 md:col-span-3'>
                      <Label>Title</Label>
                      <Input
                        value={card.title}
                        onChange={(e) =>
                          handleHelpChange(
                            card.id,
                            card.key,
                            "title",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className='space-y-2 md:col-span-4'>
                      <Label>Description</Label>
                      <Textarea
                        rows={4}
                        value={card.description}
                        onChange={(e) =>
                          handleHelpChange(
                            card.id,
                            card.key,
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
              {savingHelp ? "Saving..." : "Save Help Section"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

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

                  <div className='mt-3 flex items-center gap-2 text-muted-foreground'>
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
              {savingFacts ? "Saving..." : "Save Quick Facts"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
