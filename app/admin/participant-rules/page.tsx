"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Loader2, RotateCcw, Save, Send, FlaskConical, Square } from "lucide-react";
import { toast } from "react-toastify";

type EventOption = { _id: string; title: string; createdAt?: string };

type DateGroup = { eventDate: string | null; approved: number; sent: number };

type Job = {
  status: "running" | "done" | "cancelled";
  total: number;
  sent: number;
  failed: number;
  failures: { to: string; error: string }[];
  startedAt: string;
  finishedAt: string | null;
  startedBy?: string | null;
};

type RulesResponse = {
  event: { _id: string; title: string; venue?: string };
  rules: string[];
  usingDefaults: boolean;
  note: string;
  dates: DateGroup[];
  totals: { approved: number; sent: number };
  job: Job | null;
};

const ALL_DATES = "__all__";

function fmtDhaka(value: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

const toLines = (rules: string[]) => rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
const fromLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(\d+\s*[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean);

export default function ParticipantRulesPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [data, setData] = useState<RulesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [rulesText, setRulesText] = useState("");
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dateKey, setDateKey] = useState(ALL_DATES);
  const [onlyUnsent, setOnlyUnsent] = useState(true);

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user?.email && !testTo) setTestTo(user.email);
  }, [user, testTo]);

  // Events list, newest first
  useEffect(() => {
    if (authLoading) return;
    apiFetch<{ events?: EventOption[] }>(withQuery(apiList.events.list, { page: 1, limit: 100 }))
      .then((r) => {
        const list = [...(r.events || [])].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setEvents(list);
      })
      .catch((e) => toast.error(e?.message || "Failed to load events"));
  }, [authLoading]);

  const load = useCallback(
    async (id: string, { keepEdits = false } = {}) => {
      if (!id) return;
      try {
        if (!keepEdits) setLoading(true);
        const r = await apiFetch<RulesResponse>(apiList.participantRules.get(id));
        setData(r);
        if (!keepEdits) {
          setRulesText(toLines(r.rules));
          setNote(r.note || "");
          setDirty(false);
        }
        return r;
      } catch (e: any) {
        toast.error(e?.message || "Failed to load event rules");
      } finally {
        if (!keepEdits) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setData(null);
    setPreviewHtml("");
    setDateKey(ALL_DATES);
    if (eventId) void load(eventId);
  }, [eventId, load]);

  // Poll while a send job is running
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (eventId && data?.job?.status === "running") {
      pollRef.current = setInterval(() => void load(eventId, { keepEdits: true }), 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [eventId, data?.job?.status, load]);

  const selectedDate = dateKey === ALL_DATES ? undefined : dateKey;
  const rulesList = useMemo(() => fromLines(rulesText), [rulesText]);

  const recipients = useMemo(() => {
    if (!data) return 0;
    const groups = selectedDate
      ? data.dates.filter((d) => String(d.eventDate) === selectedDate)
      : data.dates;
    return groups.reduce((n, g) => n + (onlyUnsent ? g.approved - g.sent : g.approved), 0);
  }, [data, selectedDate, onlyUnsent]);

  const contentBody = () => ({
    rules: rulesList,
    note,
    ...(subject.trim() ? { subject: subject.trim() } : {}),
    ...(selectedDate && selectedDate !== "null" ? { eventDate: selectedDate } : {}),
  });

  const refreshPreview = async () => {
    if (!eventId) return;
    try {
      setPreviewing(true);
      const r = await apiFetch<{ subject: string; html: string }>(apiList.participantRules.preview(eventId), {
        method: "POST",
        body: JSON.stringify(contentBody()),
      });
      setPreviewHtml(r.html);
      setPreviewSubject(r.subject);
    } catch (e: any) {
      toast.error(e?.message || "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  // Auto-refresh preview (debounced) when content changes
  useEffect(() => {
    if (!eventId || !data) return;
    const t = setTimeout(() => void refreshPreview(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, data?.event?._id, rulesText, note, subject, dateKey]);

  const save = async () => {
    if (!eventId) return;
    if (rulesList.length === 0) return toast.error("Add at least one rule.");
    try {
      setSaving(true);
      await apiFetch(apiList.participantRules.save(eventId), {
        method: "PUT",
        body: JSON.stringify({ rules: rulesList, note }),
      });
      setDirty(false);
      toast.success("Rules saved for this event");
      void load(eventId, { keepEdits: true });
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    try {
      const r = await apiFetch<{ rules: string[] }>(apiList.participantRules.defaults);
      setRulesText(toLines(r.rules));
      setDirty(true);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load defaults");
    }
  };

  const sendTest = async () => {
    if (!eventId || !testTo.trim()) return;
    try {
      setTesting(true);
      await apiFetch(apiList.participantRules.test(eventId), {
        method: "POST",
        body: JSON.stringify({ ...contentBody(), to: testTo.trim() }),
      });
      toast.success(`Test email sent to ${testTo.trim()}`);
    } catch (e: any) {
      toast.error(e?.message || "Test email failed");
    } finally {
      setTesting(false);
    }
  };

  const sendAll = async () => {
    if (!eventId) return;
    try {
      setSending(true);
      if (dirty) {
        await apiFetch(apiList.participantRules.save(eventId), {
          method: "PUT",
          body: JSON.stringify({ rules: rulesList, note }),
        });
        setDirty(false);
      }
      const r = await apiFetch<{ queued: number; message?: string }>(apiList.participantRules.send(eventId), {
        method: "POST",
        body: JSON.stringify({ ...contentBody(), onlyUnsent }),
      });
      if (r.queued > 0) toast.success(`Sending to ${r.queued} participant(s)…`);
      else toast.info(r.message || "No one to send to.");
      void load(eventId, { keepEdits: true });
    } catch (e: any) {
      toast.error(e?.message || "Send failed");
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  const cancelJob = async () => {
    try {
      await apiFetch(apiList.participantRules.cancel(eventId), { method: "POST" });
      toast.info("Stopping after the current email…");
    } catch (e: any) {
      toast.error(e?.message || "Cancel failed");
    }
  };

  const job = data?.job;
  const running = job?.status === "running";
  const jobPct = job && job.total ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Rules"
        description="Email the Terms & Conditions to approved participants of an event. Edit the rules, preview the email, send yourself a test, then send to everyone."
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Choose event</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((ev) => (
                  <SelectItem key={ev._id} value={ev._id}>
                    {ev.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data && data.dates.length > 1 && (
            <div className="space-y-2">
              <Label>Show date</Label>
              <Select value={dateKey} onValueChange={setDateKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DATES}>All dates ({data.totals.approved} approved)</SelectItem>
                  {data.dates.filter((d) => d.eventDate).map((d) => (
                    <SelectItem key={String(d.eventDate)} value={String(d.eventDate)}>
                      {fmtDhaka(d.eventDate)} ({d.approved} approved)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {data && (
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Badge variant="secondary">{data.totals.approved} approved</Badge>
              <Badge variant="secondary">{data.totals.sent} already received rules</Badge>
              <Badge variant="outline">{data.totals.approved - data.totals.sent} not yet sent</Badge>
              {data.usingDefaults && <Badge variant="outline">Using default rules</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>2. Terms &amp; Conditions</CardTitle>
                  <CardDescription>One rule per line. Numbers are added automatically.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetDefaults}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Defaults
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving || !dirty}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Save
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={rulesText}
                  onChange={(e) => {
                    setRulesText(e.target.value);
                    setDirty(true);
                  }}
                  rows={18}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">{rulesList.length} rules</p>

                <div className="space-y-2">
                  <Label>Message above the rules (optional)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setDirty(true);
                    }}
                    rows={3}
                    placeholder="e.g. Gates open at 5:30 PM. Please bring your NID."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email subject (optional)</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={`Important: Terms & Conditions for ${data.event.title}`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Send test</CardTitle>
                <CardDescription>Check how it looks in a real inbox first.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row">
                <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
                <Button variant="outline" onClick={sendTest} disabled={testing || !testTo.trim()}>
                  {testing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-1 h-4 w-4" />}
                  Send test
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Send to approved participants</CardTitle>
                <CardDescription>
                  Each participant gets a personalised email with their name, show date and registration ID.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={onlyUnsent} onCheckedChange={(v) => setOnlyUnsent(v === true)} />
                  Only participants who haven&apos;t received the rules yet
                </label>

                {job && (
                  <div className="space-y-2 rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {running ? "Sending…" : job.status === "cancelled" ? "Stopped" : "Last send finished"}
                      </span>
                      <span className="text-muted-foreground">
                        {job.sent} sent · {job.failed} failed · {job.total} total
                      </span>
                    </div>
                    <Progress value={jobPct} />
                    {job.failures?.length > 0 && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">Failures ({job.failures.length})</summary>
                        <ul className="mt-1 space-y-1">
                          {job.failures.map((f, i) => (
                            <li key={i}>
                              {f.to}: {f.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setConfirmOpen(true)} disabled={running || sending || recipients <= 0 || rulesList.length === 0}>
                    <Send className="mr-1 h-4 w-4" />
                    Send to {recipients} participant{recipients === 1 ? "" : "s"}
                  </Button>
                  {running && (
                    <Button variant="outline" onClick={cancelJob}>
                      <Square className="mr-1 h-4 w-4" /> Stop
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails go out about one every 2 seconds to stay within the mail server&apos;s limits
                  ({Math.ceil((recipients * 2) / 60)} min for {recipients}). You can leave this page; it keeps sending.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="xl:sticky xl:top-4 xl:self-start">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" /> Preview
                </CardTitle>
                {previewSubject && <CardDescription>Subject: {previewSubject}</CardDescription>}
              </div>
              {previewing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              {previewHtml ? (
                <iframe
                  title="Email preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[75vh] w-full rounded-md border bg-white"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading preview…</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send rules to {recipients} participants?</AlertDialogTitle>
            <AlertDialogDescription>
              This emails the Terms &amp; Conditions for <strong>{data?.event.title}</strong>
              {selectedDate ? ` (${fmtDhaka(selectedDate === "null" ? null : selectedDate)})` : ""} to{" "}
              {onlyUnsent ? "approved participants who haven't received it yet" : "all approved participants, including those who already got it"}.
              {dirty ? " Your unsaved rule changes will be saved first." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void sendAll();
              }}
              disabled={sending}
            >
              {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
