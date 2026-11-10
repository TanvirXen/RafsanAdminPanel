"use client";

import { useEffect, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Upload, Smartphone } from "lucide-react";
import { toast } from "react-toastify";

type Release = {
  id: string;
  version: string;
  url: string;
  size: number | null;
  notes: string | null;
  uploadedAt: string;
};

function formatSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AppReleasePage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<{ releases: Release[] }>(apiList.appRelease.list);
      setReleases(data.releases || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load releases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose an APK file");
    if (!version.trim()) return toast.error("Enter a version");

    const form = new FormData();
    form.append("apk", file);
    form.append("version", version.trim());
    if (notes.trim()) form.append("notes", notes.trim());

    setUploading(true);
    try {
      await apiFetch(apiList.appRelease.upload, { method: "POST", body: form });
      toast.success("APK uploaded. It is now the latest version.");
      setVersion("");
      setNotes("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this release? This cannot be undone.")) return;
    try {
      await apiFetch(apiList.appRelease.delete(id), { method: "DELETE" });
      toast.success("Release deleted");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  }

  const latest = releases[0] || null;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="App Release"
        description="Upload the latest Android APK. The newest upload becomes the 'Download APK' link in the sidebar."
      />

      {/* Current latest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Current latest version
          </CardTitle>
          <CardDescription>What users get from the sidebar download link.</CardDescription>
        </CardHeader>
        <CardContent>
          {latest ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="text-sm">v{latest.version}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatSize(latest.size)} · uploaded {formatDate(latest.uploadedAt)}
              </span>
              <a href={latest.url} download>
                <Button size="sm" variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No APK uploaded yet. Upload one below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload new APK
          </CardTitle>
          <CardDescription>Max 200MB. Only .apk files.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  placeholder="e.g. 1.2.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  maxLength={40}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apk">APK file *</Label>
                <Input
                  id="apk"
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Release notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="What changed in this build?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={uploading}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading…" : "Upload APK"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>All uploaded builds, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : releases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No releases yet.</p>
          ) : (
            <div className="space-y-3">
              {releases.map((r, i) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={i === 0 ? "default" : "secondary"}>
                      v{r.version}
                    </Badge>
                    {i === 0 && <span className="text-xs text-green-600">latest</span>}
                    <span className="text-sm text-muted-foreground">
                      {formatSize(r.size)} · {formatDate(r.uploadedAt)}
                    </span>
                    {r.notes && (
                      <span className="text-sm text-muted-foreground">— {r.notes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={r.url} download>
                      <Button size="sm" variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
