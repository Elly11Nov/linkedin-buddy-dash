export interface FieldSlice {
  field: string;
  count: number;
  percentage: number;
}

export interface Contact {
  name: string;
  position: string;
  company: string;
  field: string;
  url?: string;
  connectedOn?: string;
}

export interface NetworkSummary {
  total: number;
  classified: number;
  slices: FieldSlice[];
  importedAt: string;
  contacts?: Contact[];
}

export interface RankedContact extends Contact {
  score: number;
  reason: string;
  askSuggestion: string;
}


const FIELDS: { field: string; patterns: string[] }[] = [
  {
    field: "Technical Writing & Documentation",
    patterns: [
      "technical writer",
      "technical writing",
      "technical author",
      "documentation",
      "docs",
      "technical communicat",
      "information developer",
      "redacteur technique",
      "technischer redakteur",
    ],
  },
  {
    field: "Content & Copywriting",
    patterns: [
      "content",
      "copywriter",
      "copywriting",
      "editor",
      "editorial",
      "journalist",
      "redaktion",
      "storytelling",
      "communications",
      "communication",
      "pr manager",
    ],
  },
  {
    field: "Marketing & Growth",
    patterns: ["marketing", "seo", "growth", "brand", "social media", "campaign", "demand gen"],
  },
  {
    field: "Requirements & Business Analysis",
    patterns: [
      "requirements engineer",
      "requirements",
      "business analyst",
      "business analysis",
      "systems analyst",
      "process analyst",
    ],
  },
  {
    field: "Product & Project Management",
    patterns: [
      "product manager",
      "product owner",
      "project manager",
      "programme manager",
      "program manager",
      "scrum master",
      "agile coach",
      "delivery manager",
      "pmo",
    ],
  },
  {
    field: "Engineering & IT",
    patterns: [
      "engineer",
      "developer",
      "software",
      "devops",
      "architect",
      "sysadmin",
      "qa ",
      "tester",
      "security",
      "it specialist",
      "cloud",
    ],
  },
  {
    field: "Design & UX",
    patterns: ["designer", "design", "ux", "ui ", "user experience", "creative director"],
  },
  {
    field: "Data & AI",
    patterns: ["data scientist", "data analyst", "data engineer", "machine learning", "ai ", "analytics"],
  },
  {
    field: "HR & Recruiting",
    patterns: ["recruit", "talent", "human resources", "hr ", "people partner", "sourcer"],
  },
  {
    field: "Sales & Customer",
    patterns: [
      "sales",
      "account manager",
      "account executive",
      "business development",
      "customer success",
      "customer support",
    ],
  },
  {
    field: "Consulting & Localization",
    patterns: ["consultant", "consulting", "translator", "translation", "localization", "localisation", "linguist"],
  },
  {
    field: "Leadership & Founders",
    patterns: ["ceo", "cto", "coo", "cfo", "founder", "owner", "managing director", "partner", "head of", "vp "],
  },
];

/** Parse a CSV text body into rows, handling quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

export function classifyPosition(position: string): string | null {
  const value = ` ${position.toLowerCase()} `;
  if (value.trim().length === 0) return null;
  for (const bucket of FIELDS) {
    if (bucket.patterns.some((pattern) => value.includes(pattern))) return bucket.field;
  }
  return "Other";
}

/** Build a field breakdown from a LinkedIn "Connections.csv" export. */
export function summarizeConnectionsCsv(csvText: string): NetworkSummary {
  const rows = parseCsv(csvText);
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => cell.trim().toLowerCase() === "first name"),
  );
  const header = (rows[headerIndex >= 0 ? headerIndex : 0] ?? []).map((cell) =>
    cell.trim().toLowerCase(),
  );

  const positionIndex = header.findIndex((cell) => cell === "position" || cell === "title");
  const dataRows = rows.slice((headerIndex >= 0 ? headerIndex : 0) + 1);

  const counts = new Map<string, number>();
  let classified = 0;

  for (const row of dataRows) {
    const position = positionIndex >= 0 ? (row[positionIndex] ?? "") : "";
    const field = classifyPosition(position) ?? "Unknown";
    if (field !== "Unknown") classified += 1;
    counts.set(field, (counts.get(field) ?? 0) + 1);
  }

  const total = dataRows.length;
  const slices = [...counts.entries()]
    .map(([field, count]) => ({
      field,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { total, classified, slices, importedAt: new Date().toISOString() };
}
