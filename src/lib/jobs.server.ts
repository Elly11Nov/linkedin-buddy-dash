import type { Job } from "./jobs.types";

const NEW_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// Extra search terms for well-known watchlist keywords so phrasing variants
// ("Technical Writer" vs "Technical Writing") still match.
const ALIASES: Record<string, string[]> = {
  "technical writer": [
    "technical writing",
    "tech writer",
    "technical author",
    "documentation writer",
    "technical copywriter",
  ],
  "content writer": ["copywriter", "content writing", "seo writer", "content creator"],
  "content specialist": ["content manager", "content lead", "content producer"],
  "content strategist": ["content strategy", "content marketing"],
  documentation: ["technical documentation", "document specialist", "knowledge base"],
  "requirements engineer": [
    "requirements engineering",
    "requirements analyst",
    "business analyst",
  ],
};

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function matchedKeywords(title: string, extra: string, keywords: string[]): string[] {
  const hayTitle = norm(title);
  const hayExtra = norm(extra);
  return keywords.filter((keyword) => {
    const k = norm(keyword);
    const terms = [k, ...(ALIASES[k] ?? [])];
    if (terms.some((term) => hayTitle.includes(term))) return true;
    // All words of a multi-word keyword present in the title, any order.
    const words = k.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 1 && words.every((word) => hayTitle.includes(word))) return true;
    return hayExtra.includes(k);
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "job-radar/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Job source request failed [${response.status}] for ${url}`);
  }
  return response.json();
}

function isFresh(publishedAt: string): boolean {
  const time = new Date(publishedAt).getTime();
  return Number.isFinite(time) && Date.now() - time < NEW_THRESHOLD_MS;
}

// ---------- RemoteOK ----------

interface RemoteOkEntry {
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  tags?: string[];
  date?: string;
}

async function fetchRemoteOk(keywords: string[]): Promise<Job[]> {
  const urls = [
    "https://remoteok.com/api",
    "https://remoteok.com/api?tag=copywriting",
    "https://remoteok.com/api?tag=writing",
    "https://remoteok.com/api?tag=content",
  ];
  const payloads = await Promise.all(urls.map((url) => fetchJson(url)));

  const entries = new Map<string, RemoteOkEntry>();
  for (const payload of payloads) {
    for (const entry of (payload as RemoteOkEntry[]) ?? []) {
      if (entry.position && entry.url && !entries.has(entry.url)) {
        entries.set(entry.url, entry);
      }
    }
  }

  const jobs: Job[] = [];
  for (const entry of entries.values()) {
    const matches = matchedKeywords(entry.position!, (entry.tags ?? []).join(" "), keywords);
    if (matches.length === 0) continue;
    const publishedAt = entry.date ?? new Date().toISOString();
    jobs.push({
      id: `remoteok-${entry.url}`,
      title: entry.position!,
      company: entry.company ?? "Unknown company",
      location: entry.location?.trim() || "Remote",
      url: entry.url!,
      source: "RemoteOK",
      tags: (entry.tags ?? []).slice(0, 4),
      publishedAt,
      matchedKeywords: matches,
      isNew: isFresh(publishedAt),
    });
  }
  return jobs;
}

// ---------- Jobicy ----------

interface JobicyEntry {
  id?: number;
  jobTitle?: string;
  companyName?: string;
  jobGeo?: string;
  url?: string;
  jobIndustry?: string[];
  jobType?: string[] | string;
  pubDate?: string;
}

async function fetchJobicy(keywords: string[]): Promise<Job[]> {
  const urls = [
    "https://jobicy.com/api/v2/remote-jobs?count=100",
    "https://jobicy.com/api/v2/remote-jobs?count=50&tag=copywriting",
    "https://jobicy.com/api/v2/remote-jobs?count=50&tag=seo",
    "https://jobicy.com/api/v2/remote-jobs?count=50&tag=writing",
    "https://jobicy.com/api/v2/remote-jobs?count=50&tag=marketing",
  ];
  const payloads = await Promise.all(urls.map((url) => fetchJson(url)));

  const entries = new Map<string, JobicyEntry>();
  for (const payload of payloads) {
    for (const entry of (payload as { jobs?: JobicyEntry[] }).jobs ?? []) {
      const key = String(entry.id ?? entry.url);
      if (entry.jobTitle && entry.url && !entries.has(key)) {
        entries.set(key, entry);
      }
    }
  }

  const jobs: Job[] = [];
  for (const entry of entries.values()) {
    const jobTypes = Array.isArray(entry.jobType)
      ? entry.jobType
      : entry.jobType
        ? [entry.jobType]
        : [];
    const matches = matchedKeywords(
      entry.jobTitle!,
      [...(entry.jobIndustry ?? []), ...jobTypes].join(" "),
      keywords,
    );
    if (matches.length === 0) continue;
    const publishedAt = entry.pubDate ?? new Date().toISOString();
    jobs.push({
      id: `jobicy-${entry.id ?? entry.url}`,
      title: entry.jobTitle!,
      company: entry.companyName ?? "Unknown company",
      location: entry.jobGeo || "Remote",
      url: entry.url!,
      source: "Jobicy",
      tags: (entry.jobIndustry ?? []).slice(0, 4),
      publishedAt,
      matchedKeywords: matches,
      isNew: isFresh(publishedAt),
    });
  }
  return jobs;
}

// ---------- Himalayas ----------

interface HimalayasEntry {
  guid?: string;
  title?: string;
  companyName?: string;
  applicationLink?: string;
  categories?: string[];
  locationRestrictions?: string[];
  pubDate?: string;
}

async function fetchHimalayas(keywords: string[]): Promise<Job[]> {
  // Cursor-paginate a few pages of the newest jobs (limit is capped at 20).
  const entries: HimalayasEntry[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 4; page++) {
    const url = cursor
      ? `https://himalayas.app/jobs/api?limit=20&cursor=${encodeURIComponent(cursor)}`
      : "https://himalayas.app/jobs/api?limit=20";
    const payload = (await fetchJson(url)) as {
      jobs?: HimalayasEntry[];
      nextCursor?: string | null;
    };
    entries.push(...(payload.jobs ?? []));
    cursor = payload.nextCursor ?? null;
    if (!cursor) break;
  }

  const jobs: Job[] = [];
  for (const entry of entries) {
    if (!entry.title || !entry.guid) continue;
    const matches = matchedKeywords(entry.title, (entry.categories ?? []).join(" "), keywords);
    if (matches.length === 0) continue;
    const publishedAt = entry.pubDate ?? new Date().toISOString();
    const restrictions = (entry.locationRestrictions ?? []).filter(
      (r) => r && r.toLowerCase() !== "anywhere in the world",
    );
    jobs.push({
      id: `himalayas-${entry.guid}`,
      title: entry.title,
      company: entry.companyName ?? "Unknown company",
      location: restrictions.length > 0 ? restrictions.slice(0, 2).join(" / ") : "Remote",
      url: entry.applicationLink ?? entry.guid,
      source: "Himalayas",
      tags: (entry.categories ?? []).slice(0, 4),
      publishedAt,
      matchedKeywords: matches,
      isNew: isFresh(publishedAt),
    });
  }
  return jobs;
}

// ---------- Arbeitnow ----------

interface ArbeitnowEntry {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  url: string;
  tags?: string[];
  job_types?: string[] | string;
  created_at: number; // unix seconds
}

async function fetchArbeitnow(keywords: string[]): Promise<Job[]> {
  const data = (await fetchJson("https://www.arbeitnow.com/api/job-board-api")) as {
    data?: ArbeitnowEntry[];
  };
  const jobs: Job[] = [];
  for (const entry of data.data ?? []) {
    const jobTypes = Array.isArray(entry.job_types)
      ? entry.job_types
      : entry.job_types
        ? [entry.job_types]
        : [];
    const matches = matchedKeywords(
      entry.title,
      [...(entry.tags ?? []), ...jobTypes].join(" "),
      keywords,
    );
    if (matches.length === 0) continue;
    const publishedAt = new Date(entry.created_at * 1000).toISOString();
    jobs.push({
      id: `arbeitnow-${entry.slug}`,
      title: entry.title,
      company: entry.company_name,
      location: entry.remote ? `${entry.location} (Remote)` : entry.location,
      url: entry.url,
      source: "Arbeitnow",
      tags: (entry.tags ?? []).slice(0, 4),
      publishedAt,
      matchedKeywords: matches,
      isNew: isFresh(publishedAt),
    });
  }
  return jobs;
}

// ---------- Aggregate ----------

export async function aggregateJobs(keywords: string[]): Promise<Job[]> {
  const settled = await Promise.allSettled([
    fetchRemoteOk(keywords),
    fetchJobicy(keywords),
    fetchHimalayas(keywords),
    fetchArbeitnow(keywords),
  ]);

  const jobs: Job[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    } else {
      console.error("Job source failed:", result.reason);
    }
  }

  // Dedupe by normalized title + company.
  const seen = new Set<string>();
  const unique = jobs.filter((job) => {
    const key = `${norm(job.title)}|${norm(job.company)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return unique.slice(0, 120);
}
