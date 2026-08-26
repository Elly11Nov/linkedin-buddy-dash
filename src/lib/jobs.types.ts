export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: "Remotive" | "Arbeitnow";
  tags: string[];
  publishedAt: string; // ISO date
  matchedKeywords: string[];
  isNew: boolean; // published within the last 48 hours
}
