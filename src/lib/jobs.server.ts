import type { Job } from "./jobs.types";

const REMOTIVE_URL = "https://remotive.com/api/remote-jobs";
const ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api";
const NEW_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function norm(value: string): string {
  return value.toLowerCase().trim();
}

function matchedKeywords(text: string, keywords: string[]): string[] {
  const haystack = norm(text);
  return keywords.filter((keyword) => haystack.includes(norm(keyword)));
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

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  publication_date: string;
  tags?: string[];
  category?: string;
}

async function fetchRemotive(keyword: string, keywords: string[]): Promise<Job[]> {
  const data = (await fetchJson(
    `${REMOTIVE_URL}?search=${encodeURIComponent(keyword)}&limit=50`,
  )) as { jobs?: RemotiveJob[] };

  return (data.jobs ?? [])
    .map((job) => {
      const searchable = `${job.title} ${job.category ?? ""} ${(job.tags ?? []).join(" ")}`;
      const matches = matchedKeywords(searchable, keywords);
      if (matches.length === 0) return null;
      return {
        id: `remotive-${job.id}`,
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location || "Remote",
        url: job.url,
        source: "Remotive" as const,
        tags: (job.tags ?? []).slice(0, 4),
        publishedAt: job.publication_date,
        matchedKeywords: matches,
        isNew: isFresh(job.publication_date),
      };
    })
    .filter((job): job is Job => job !== null);
}

interface ArbeitnowJob {
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
  const data = (await fetchJson(ARBEITNOW_URL)) as { data?: ArbeitnowJob[] };

  return (data.data ?? [])
    .map((job) => {
      const searchable = `${job.title} ${(job.tags ?? []).join(" ")} ${(job.job_types ?? []).join(" ")}`;
      const matches = matchedKeywords(searchable, keywords);
      if (matches.length === 0) return null;
      const publishedAt = new Date(job.created_at * 1000).toISOString();
      return {
        id: `arbeitnow-${job.slug}`,
        title: job.title,
        company: job.company_name,
        location: job.remote ? `${job.location} (Remote)` : job.location,
        url: job.url,
        source: "Arbeitnow" as const,
        tags: (job.tags ?? []).slice(0, 4),
        publishedAt,
        matchedKeywords: matches,
        isNew: isFresh(publishedAt),
      };
    })
    .filter((job): job is Job => job !== null);
}

export async function aggregateJobs(keywords: string[]): Promise<Job[]> {
  const settled = await Promise.allSettled([
    ...keywords.map((keyword) => fetchRemotive(keyword, keywords)),
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

  return unique.slice(0, 80);
}
