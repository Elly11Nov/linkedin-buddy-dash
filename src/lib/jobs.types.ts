export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: "RemoteOK" | "Jobicy" | "Himalayas" | "Arbeitnow";
  tags: string[];
  publishedAt: string; // ISO date
  matchedKeywords: string[];
  isNew: boolean; // published within the last 48 hours
}
