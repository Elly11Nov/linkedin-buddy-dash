import type { Job } from "./jobs.types";

const REMOTEOK_URL = "https://remoteok.com/api";
const JOBICY_URL = "https://jobicy.com/api/v2/remote-jobs?count=100";
const HIMALAYAS_URL = "https://himalayas.app/jobs/api?limit=100";
const ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api";
const NEW_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// Extra search terms for well-known watchlist keywords so phrasing variants
// ("Technical Writer" vs "Technical Writing") still match.
const ALIASES: Record<string, string[]> = {
  "technical writer": ["technical writing", "tech writer", "technical author", "documentation writer"],
  "content writer": ["copywriter", "content writing", "seo writer"],
  "content specialist": ["content manager", "content lead"],
  "content strategist": ["content strategy"],
  documentation: ["technical documentation", "document specialist", "knowledge base"],
  "requirements engineer": ["requirements engineering", "requirements analyst", "business analyst"],
};

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function termsFor(keyword: string): string[] {
  return [norm(keyword), ...(ALIASES[norm(keyword)] ?? [])];
}

function matchedKeywords(
  title: string,
  extra: string,
  keywords: string[],
): string[] {
  const hayTitle = norm(title);
  const hayExtra = norm(extra);
  return keywords.filter((keyword) => {
    const terms = termsFor(keyword);
    return (
      terms.some((term) => hayTitle.includes(term)) ||
      hayExtra.includes(norm(keyword))
    );
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

interface RemoteOkEntry {
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  tags?: string[];
  date?: string;
}

async function fetchRemoteOk(keywords: string[]): Promise<Job[]> {
  const data = (await fetchJson(REMOTEOK_URL)) as RemoteOkEntry[];
  return data
    .filter((entry) => entry.position && entry.url)
    .map((entry): Job | null => {
      const matches = matchedKeywords(
        entry.position!,
        (entry.tags ?? []).join(" "),
        keywords,
      );
      if (matches.length === 0) return null;
      const publishedAt = entry.date ?? new Date().toISOString();
      return {
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
      };
    })
    .filter((job): job is Job => job !== null);
}

interface JobicyEntry {
  id?: number;
  jobTitle?: string;
  companyName?: string;
  jobGeo?: string;
  url?: string;
  jobIndustry?: string[];
  jobType?: string[];
  pubDate?: string;
}

async function fetchJobicy(keywords: string[]): Promise<Job[]> {
  const data = (await fetchJson(JOBICY_URL)) as { jobs?: JobicyEntry[] };
  return (data.jobs ?? [])
    .map((entry): Job | null => {
      if (!entry.jobTitle || !entry.url) return null;
      const matches = matchedKeywords(
        entry.jobTitle,
        [...(entry.jobIndustry ?? []), ...(entry.jobType ?? [])].join(" "),
        keywords,
      );
      if (matches.length === 0) return null;
      const publishedAt = entry.pubDate ?? new Date().toISOString();
      return {
        id: `jobicy-${entry.id ?? entry.url}`,
        title: entry.jobTitle,
        company: entry.companyName ?? "Unknown company",
        location: entry.jobGeo || "Remote",
        url: entry.url,
        source: "Jobicy",
        tags: (entry.jobIndustry ?? []).slice(0, 4),
        publishedAt,
        matchedKeywords: matches,
        isNew: isFresh(publishedAt),
      };
    })
    .filter((job): job is Job => job !== null);
}

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
  const data = (await fetchJson(HIMALAYAS_URL)) as { jobs?: HimalayasEntry[] };
  return (data.jobs ?? [])
    .map((entry): Job | null => {
      if (!entry.title || !entry.guid) return null;
      const matches = matchedKeywords(
        entry.title,
        (entry.categories ?? []).join(" "),
        keywords,
      );
      if (matches.length === 0) return null;
      const publishedAt = entry.pubDate ?? new Date().toISOString();
      const restrictions = (entry.locationRestrictions ?? []).filter(
        (r) => r && r.toLowerCase() !== "anywhere in the world",
      );
      return {
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
      };
    })
    .filter((job): job is Job => job !== null);
}

interface ArbeitnowEntry {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  created_at: number; // unix seconds
}

async function fetchArbeitnow(keywords: string[]): Promise<Job[]> {
  const data = (await fetchJson(ARBEITNOW_URL)) as { data?: ArbeitnowEntry[] };
  return (data.data ?? [])
    .map((entry): Job | null => {
      const matches = matchedKeywords(
        entry.title,
        [...(entry.tags ?? []), ...(entry.job_types ?? [])].join(" "),
        keywords,
      );
      if (matches.length === 0) return null;
      const publishedAt = new Date(entry.created_at * 1000).toISOString();
      return {
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
      };
    })
    .filter((job): job is Job => job !== null);
}

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
