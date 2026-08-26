import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Radar,
  RefreshCw,
  Plus,
  X,
  MapPin,
  Building2,
  ExternalLink,
  Linkedin,
  Briefcase,
  Sparkles,
  Radio,
  Tags,
} from "lucide-react";
import { getJobs } from "../lib/jobs.functions";
import { getLinkedInProfile } from "../lib/linkedin.functions";
import { formatRelativeTime, linkedInJobSearchUrl } from "../lib/format";
import { cn } from "../lib/utils";
import type { Job } from "../lib/jobs.types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Job Radar — Technical Writing & Content Job Monitor" },
      {
        name: "description",
        content:
          "Elena's personal dashboard monitoring new technical writing, content, documentation, and requirements engineering jobs, powered by her LinkedIn profile.",
      },
      { property: "og:title", content: "Job Radar — Technical Writing & Content Job Monitor" },
      {
        property: "og:description",
        content:
          "Live monitor for new technical writing, content, documentation, and requirements engineering roles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const DEFAULT_KEYWORDS = [
  "Technical Writer",
  "Content Writer",
  "Content Specialist",
  "Documentation",
  "Requirements Engineer",
  "Content Strategist",
];

const STORAGE_KEY = "job-radar.keywords";

function useKeywords(): [string[], (next: string[]) => void, boolean] {
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((k) => typeof k === "string") && parsed.length > 0) {
          setKeywords(parsed.slice(0, 12));
        }
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  const update = (next: string[]) => {
    setKeywords(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  };

  return [keywords, update, hydrated];
}

function Dashboard() {
  const [keywords, setKeywords, hydrated] = useKeywords();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [draft, setDraft] = useState("");

  const profileQuery = useQuery({
    queryKey: ["linkedin-profile"],
    queryFn: () => getLinkedInProfile(),
    staleTime: 10 * 60_000,
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs", keywords],
    queryFn: () => getJobs({ data: { keywords } }),
    enabled: hydrated && keywords.length > 0,
    refetchInterval: 5 * 60_000,
    placeholderData: (previous) => previous,
  });

  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);

  const filteredJobs = useMemo(
    () =>
      activeFilter === "all"
        ? jobs
        : jobs.filter((job) => job.matchedKeywords.includes(activeFilter)),
    [jobs, activeFilter],
  );

  const newCount = useMemo(() => jobs.filter((job) => job.isNew).length, [jobs]);
  const companyCount = useMemo(
    () => new Set(jobs.map((job) => job.company.toLowerCase())).size,
    [jobs],
  );
  const sourceCount = useMemo(() => new Set(jobs.map((job) => job.source)).size, [jobs]);

  const addKeyword = () => {
    const value = draft.trim();
    if (!value || keywords.some((k) => k.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    setKeywords([...keywords, value]);
    setDraft("");
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
    if (activeFilter === keyword) setActiveFilter("all");
  };

  const profile = profileQuery.data ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Radar className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-tight">Job Radar</p>
              <p className="text-xs text-muted-foreground">Technical writing & content watch</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              <div className="flex items-center gap-2.5 rounded-full border bg-card py-1 pl-1 pr-3">
                {profile.picture ? (
                  <img
                    src={profile.picture}
                    alt={`${profile.name}'s LinkedIn profile photo`}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                    {profile.givenName.charAt(0)}
                  </span>
                )}
                <div className="leading-tight">
                  <p className="text-xs font-semibold">{profile.name}</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    LinkedIn connected
                  </p>
                </div>
              </div>
            ) : (
              <span className="hidden text-xs text-muted-foreground sm:block">
                LinkedIn not connected
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {/* Hero */}
        <section className="flex flex-wrap items-end justify-between gap-4 py-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {profile ? `Good to see you, ${profile.givenName}.` : "Your job radar"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Scanning live job boards for contract & freelance roles in CH, FR, IT, FI, SE, DK and
              the UK — plus permanent roles in Switzerland. Fresh postings from the last 48 hours
              are flagged as new.
            </p>
          </div>
          <button
            type="button"
            onClick={() => jobsQuery.refetch()}
            disabled={jobsQuery.isFetching}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", jobsQuery.isFetching && "animate-spin")} />
            {jobsQuery.isFetching ? "Scanning…" : "Scan now"}
          </button>
        </section>

        {/* Watchlist */}
        <section aria-label="Keyword watchlist" className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold">Watchlist</h2>
            <span className="text-xs text-muted-foreground">
              {keywords.length} keyword{keywords.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="group inline-flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pl-3 pr-2 text-xs font-medium text-secondary-foreground"
              >
                {keyword}
                <a
                  href={linkedInJobSearchUrl(keyword)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Search ${keyword} on LinkedIn Jobs`}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  aria-label={`Remove ${keyword}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <form
              className="flex items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                addKeyword();
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add keyword…"
                className="h-8 w-36 rounded-full border border-input bg-background px-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                aria-label="Add keyword"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Stats" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Briefcase} label="Open matches" value={jobs.length} />
          <StatCard icon={Sparkles} label="New in 48h" value={newCount} highlight />
          <StatCard icon={Building2} label="Companies" value={companyCount} />
          <StatCard icon={Radio} label="Sources" value={sourceCount} />
        </section>

        {/* Filter tabs */}
        <section className="mt-8 flex flex-wrap items-center gap-2" aria-label="Filter by keyword">
          {["all", ...keywords].map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => setActiveFilter(keyword)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === keyword
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {keyword === "all" ? `All (${jobs.length})` : keyword}
            </button>
          ))}
        </section>

        {/* Feed */}
        <section className="mt-4" aria-label="Job listings">
          {jobsQuery.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-2xl border bg-card" />
              ))}
            </div>
          ) : jobsQuery.isError ? (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <p className="font-display text-sm font-semibold">The scan hit a snag</p>
              <p className="mt-1 text-xs text-muted-foreground">
                One or more job sources are unreachable. Try scanning again in a moment.
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <p className="font-display text-sm font-semibold">No matches right now</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try broadening a keyword, or scan again later — new postings land throughout the day.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
          {jobsQuery.dataUpdatedAt > 0 && (
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Last scanned {formatRelativeTime(new Date(jobsQuery.dataUpdatedAt).toISOString())} ·
              auto-refreshes every 5 minutes
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        highlight ? "border-signal/60 bg-signal/20" : "bg-card",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
            {job.source}
          </span>
          {(job.employmentType !== "unspecified" || job.region) && (
            <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {job.employmentType === "contract"
                ? "Contract"
                : job.employmentType === "permanent"
                  ? "Permanent"
                  : ""}
              {job.employmentType !== "unspecified" && job.region ? " · " : ""}
              {job.region ?? ""}
            </span>
          )}
          {job.isNew && (
            <span className="rounded-full bg-signal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal-foreground">
              New
            </span>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatRelativeTime(job.publishedAt)}
        </span>
      </div>

      <h3 className="mt-2.5 font-display text-sm font-semibold leading-snug">
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-primary"
        >
          {job.title}
        </a>
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          {job.company}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.matchedKeywords.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
          >
            {keyword}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t pt-3">
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View posting
        </a>
        <a
          href={linkedInJobSearchUrl(job.title)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Find ${job.title} on LinkedIn Jobs`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
        >
          <Linkedin className="h-3.5 w-3.5" />
          LinkedIn
        </a>
      </div>
    </article>
  );
}
