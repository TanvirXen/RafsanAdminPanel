"use client";

import React, { useEffect, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Users, Mail, Clock, Save } from "lucide-react";
import { toast } from "react-toastify";

type NewsletterSettingsDto = {
  title: string;
  shortBlurb: string;
  longText: string;
  buttonLabel: string;
};

type SubscriberDto = {
  _id: string;
  email: string;
  source?: string;
  createdAt: string;
};

const defaultSettings: NewsletterSettingsDto = {
  title: "Subscribe to\nMy Newsletter!",
  shortBlurb: "Stay updated on my latest shows and events.",
  longText:
    "I use this newsletter to share the most actionable tips from my journey, and the stories behind the shows. Get all the things that truly matter—communication strategies, real-world insights, and moments of sincere humor—delivered straight to your inbox.",
  buttonLabel: "Subscribe",
};

export default function NewsletterAdminPage() {
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] =
    useState<NewsletterSettingsDto>(defaultSettings);

  const [loadingSubs, setLoadingSubs] = useState(true);
  const [subscribers, setSubscribers] = useState<SubscriberDto[]>([]);
  const [totalSubs, setTotalSubs] = useState<number | null>(null);

  // ----- Load settings & subscribers on mount -----
  useEffect(() => {
    let alive = true;

    const loadSettings = async () => {
      try {
        const data = await apiFetch<{ setting?: NewsletterSettingsDto; data?: NewsletterSettingsDto }>(
          apiList.newsletter.settingsGet
        );
        const s: NewsletterSettingsDto = data.setting || data.data || (defaultSettings as any);
        if (!alive) return;
        setSettings({
          ...defaultSettings,
          ...s,
        });
      } catch (err: any) {
        console.error("Failed to load newsletter settings", err);
        toast.error(err?.message || "Failed to load newsletter settings");
      } finally {
        if (alive) setLoadingSettings(false);
      }
    };

    const loadSubscribers = async () => {
      try {
        const data = await apiFetch<{
          subscribers: SubscriberDto[];
          total?: number;
        }>(`${apiList.newsletter.listSubscribers}?limit=100`);
        if (!alive) return;
        setSubscribers(data.subscribers || []);
        setTotalSubs(typeof data.total === "number" ? data.total : null);
      } catch (err: any) {
        console.error("Failed to load newsletter subscribers", err);
        toast.error(err?.message || "Failed to load subscribers");
      } finally {
        if (alive) setLoadingSubs(false);
      }
    };

    loadSettings();
    loadSubscribers();

    return () => {
      alive = false;
    };
  }, []);

  // ----- Handlers -----
  const handleChange =
    (field: keyof NewsletterSettingsDto) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSettings((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await apiFetch(apiList.newsletter.settingsUpdate, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      toast.success("Newsletter content saved");
    } catch (err: any) {
      console.error("Failed to save newsletter settings", err);
      toast.error(err?.message || "Failed to save newsletter settings");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title="Newsletter"
        description="Manage the newsletter section content and view subscribers collected from the website."
      />

      {/* Newsletter Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Newsletter Content
          </CardTitle>
          <CardDescription>
            This controls the text and button label of the newsletter section on the public homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-5 w-full animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-2">
                <Label htmlFor="newsletter-title">Title</Label>
                <Textarea
                  id="newsletter-title"
                  rows={2}
                  value={settings.title}
                  onChange={handleChange("title")}
                  placeholder={"Subscribe to\nMy Newsletter!"}
                />
                <p className="text-xs text-muted-foreground">
                  Supports line breaks. Use this to match your front-end layout (e.g. “Subscribe to” + “My Newsletter!”).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newsletter-shortBlurb">Short Blurb</Label>
                <Input
                  id="newsletter-shortBlurb"
                  value={settings.shortBlurb}
                  onChange={handleChange("shortBlurb")}
                  placeholder="Stay updated on my latest shows and events."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newsletter-longText">Long Text</Label>
                <Textarea
                  id="newsletter-longText"
                  rows={5}
                  value={settings.longText}
                  onChange={handleChange("longText")}
                  placeholder="Longer description that appears on the right side of the card..."
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="newsletter-buttonLabel">Button Label</Label>
                <Input
                  id="newsletter-buttonLabel"
                  value={settings.buttonLabel}
                  onChange={handleChange("buttonLabel")}
                  placeholder="Subscribe"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={savingSettings}
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Saving…" : "Save Newsletter Content"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Subscribers
          </CardTitle>
          <CardDescription>
            Latest subscribers from the website newsletter form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubs ? (
            <div className="space-y-3">
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="h-5 w-full animate-pulse rounded bg-muted" />
              <div className="h-5 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No subscribers yet.
            </div>
          ) : (
            <>
              {typeof totalSubs === "number" && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Showing {subscribers.length} of {totalSubs} subscriber
                  {totalSubs === 1 ? "" : "s"} (most recent first).
                </p>
              )}
              <div className="max-h-[420px] overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Source
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Subscribed At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s._id} className="border-t">
                        <td className="px-3 py-2">{s.email}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {s.source || "website"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
