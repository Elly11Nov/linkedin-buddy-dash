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
  const companyIndex = header.findIndex((cell) => cell === "company" || cell === "organization");
  const firstNameIndex = header.findIndex((cell) => cell === "first name");
  const lastNameIndex = header.findIndex((cell) => cell === "last name");
  const urlIndex = header.findIndex((cell) => cell === "url" || cell === "profile url");
  const connectedIndex = header.findIndex((cell) => cell === "connected on");
  const dataRows = rows.slice((headerIndex >= 0 ? headerIndex : 0) + 1);

  const counts = new Map<string, number>();
  const contacts: Contact[] = [];
  let classified = 0;

  for (const row of dataRows) {
    const position = positionIndex >= 0 ? (row[positionIndex] ?? "") : "";
    const field = classifyPosition(position) ?? "Unknown";
    if (field !== "Unknown") classified += 1;
    counts.set(field, (counts.get(field) ?? 0) + 1);

    const name = [
      firstNameIndex >= 0 ? (row[firstNameIndex] ?? "") : "",
      lastNameIndex >= 0 ? (row[lastNameIndex] ?? "") : "",
    ]
      .join(" ")
      .trim();
    const company = companyIndex >= 0 ? (row[companyIndex] ?? "").trim() : "";
    if (name || company) {
      const url = urlIndex >= 0 ? (row[urlIndex] ?? "").trim() : "";
      const connectedOn = connectedIndex >= 0 ? (row[connectedIndex] ?? "").trim() : "";
      const contact: Contact = {
        name: name || "(no name in export)",
        position: position.trim(),
        company,
        field,
      };
      if (url) contact.url = url;
      if (connectedOn) contact.connectedOn = connectedOn;
      contacts.push(contact);
    }

  }

  const total = dataRows.length;
  const slices = [...counts.entries()]
    .map(([field, count]) => ({
      field,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { total, classified, slices, importedAt: new Date().toISOString(), contacts };
}

const RECRUITER_PATTERNS = ["recruit", "talent acquisition", "talent partner", "sourcer", "hiring"];
const HR_PATTERNS = ["human resources", "hr ", "people partner", "people & culture"];
const LEADER_PATTERNS = ["head of", "director", "vp ", "vice president", "chief", "lead ", "manager"];
const TARGET_FIELDS = ["Technical Writing & Documentation", "Content & Copywriting", "Requirements & Business Analysis"];

const AGENCY_PATTERNS = [
  "consulting", "recruitment", "staffing", "search", "talent", "people", "workforce",
  "solutions", "group", "partners", "associates", "resources", "hays", "adecco",
  "randstad", "manpower", "robert walters", "michael page", "page personnel",
  "robert half", "kelly services", "modis", "akko", "experis", "coople",
];
const CONTRACT_SIGNALS = ["contract", "freelance", "interim", "temporary", "temp ", "contracting"];
const FIELD_SIGNALS = [
  "content", "communication", "editorial", "copy", "marketing", "digital",
  "technical", "documentation", "life science", "pharma", "engineering", "it ", "tech",
];

export interface RankedRecruiter extends Contact {
  score: number;
  kind: "agency" | "in-house";
  reason: string;
  askSuggestion: string;
}

/** Find recruiters / talent contacts in the network and rank by likely usefulness. */
export function rankRecruiters(contacts: Contact[]): RankedRecruiter[] {
  const recruiters = contacts.filter((contact) => {
    const position = ` ${contact.position.toLowerCase()} `;
    return RECRUITER_PATTERNS.some((p) => position.includes(p)) || HR_PATTERNS.some((p) => position.includes(p));
  });

  return recruiters
    .map((contact) => {
      const text = ` ${contact.position.toLowerCase()} ${contact.company.toLowerCase()} `;
      const companyText = ` ${contact.company.toLowerCase()} `;
      const isAgency = AGENCY_PATTERNS.some((p) => companyText.includes(p));
      const contractFriendly = CONTRACT_SIGNALS.some((p) => text.includes(p));
      const fieldAligned = FIELD_SIGNALS.some((p) => text.includes(p));
      const senior = LEADER_PATTERNS.some((p) => ` ${contact.position.toLowerCase()} `.includes(p));

      let score = 40;
      if (isAgency) score += 25; // agencies place contractors — matches the contract goal
      if (contractFriendly) score += 20;
      if (fieldAligned) score += 20;
      if (senior) score += 10;

      const kind = isAgency ? "agency" : "in-house";
      let reason: string;
      let askSuggestion: string;
      if (isAgency && contractFriendly) {
        reason = "Contract-focused agency recruiter — the fastest route to freelance/contract briefs.";
        askSuggestion = "Send your CV and day rate; ask to be registered for technical writing / content contract briefs in CH/EU.";
      } else if (isAgency) {
        reason = "Agency recruiter — agencies hold most contract and freelance mandates.";
        askSuggestion = "Ask which clients hire technical writers or content specialists on contract, and whether Swiss permanent roles are in scope.";
      } else if (contractFriendly) {
        reason = "Works on contract/temporary hiring — knows interim openings.";
        askSuggestion = "Ask about interim or contract content/documentation needs at their company.";
      } else if (fieldAligned) {
        reason = "Recruits in a field adjacent to yours — relevant role pipeline.";
        askSuggestion = "Ask whether they handle content, communications or documentation roles, or can refer you to a colleague who does.";
      } else if (senior) {
        reason = "Senior in talent/HR — good for process insight and referrals to the right recruiter.";
        askSuggestion = "Ask who the right recruiter is for documentation/content roles and how their referral scheme works.";
      } else {
        reason = "In-house recruiter — direct line to their company's openings.";
        askSuggestion = "Ask about technical writing, content or requirements roles at their company and the best way to apply.";
      }

      return { ...contact, score, kind, reason, askSuggestion };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Find and rank connections at a company for a warm-intro / referral ask. */
export function rankCompanyContacts(contacts: Contact[], companyQuery: string): RankedContact[] {
  const query = companyQuery.trim().toLowerCase();
  if (!query) return [];

  const matches = contacts.filter(
    (contact) =>
      contact.company.toLowerCase().includes(query) ||
      contact.position.toLowerCase().includes(query),
  );

  return matches
    .map((contact) => {
      const position = ` ${contact.position.toLowerCase()} `;
      let score = 10;
      let reason = "Works at the company — good for an informal insider view.";
      let askSuggestion = `Ask what it's like inside ${contact.company || companyQuery} and who owns documentation/content work.`;

      if (RECRUITER_PATTERNS.some((p) => position.includes(p))) {
        score = 100;
        reason = "Recruiter / talent — can route your CV directly to hiring managers.";
        askSuggestion = "Ask about open technical writing & content roles and whether contract engagements go via a preferred supplier.";
      } else if (HR_PATTERNS.some((p) => position.includes(p))) {
        score = 85;
        reason = "HR / people team — knows the hiring process and internal referral scheme.";
        askSuggestion = "Ask how contractors are onboarded and who to send a speculative CV to.";
      } else if (TARGET_FIELDS.includes(contact.field)) {
        score = 80;
        reason = "Same field as you — closest peer, best referral quality.";
        askSuggestion = "Ask how their documentation/content team is structured and whether they take freelancers.";
        if (LEADER_PATTERNS.some((p) => position.includes(p))) {
          score = 95;
          reason = "Senior in your own field — likely the hiring manager or close to one.";
          askSuggestion = "Ask directly whether they have upcoming contract needs for docs/content.";
        }
      } else if (LEADER_PATTERNS.some((p) => position.includes(p))) {
        score = 60;
        reason = "Senior stakeholder — can point you to the right team lead.";
        askSuggestion = "Ask for an introduction to whoever runs documentation, regulatory writing or content.";
      } else if (contact.field === "Product & Project Management" || contact.field === "Engineering & IT") {
        score = 45;
        reason = "Project / engineering side — these teams usually commission technical writers.";
        askSuggestion = "Ask whether their projects budget for external documentation support.";
      }

      return { ...contact, score, reason, askSuggestion };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

