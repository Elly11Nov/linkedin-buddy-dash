import { useMemo, useState } from "react";
import { Building2, Search, ExternalLink, Sparkles } from "lucide-react";
import { rankCompanyContacts, type Contact } from "../lib/network";

interface Props {
  contacts: Contact[] | undefined;
}

const QUICK_COMPANIES = ["Roche", "Novartis", "Nestlé", "Lonza", "Johnson & Johnson"];

export function CompanyInsiders({ contacts }: Props) {
  const [query, setQuery] = useState("Roche");

  const ranked = useMemo(() => rankCompanyContacts(contacts ?? [], query), [contacts, query]);
  const top = ranked.slice(0, 12);

  return (
    <section aria-label="Company insiders" className="mt-6 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold">Who to contact at a company</h2>
        </div>
        <a
          href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&network=%5B%22F%22%5D`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Search on LinkedIn <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Company name, e.g. Roche"
          aria-label="Company name"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_COMPANIES.map((company) => (
          <button
            key={company}
            type="button"
            onClick={() => setQuery(company)}
            className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {company}
          </button>
        ))}
      </div>

      {!contacts || contacts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          Import your <code>Connections.csv</code> above and this list ranks the people in your
          network at any company by how useful they are for a referral — recruiters first, then peers
          in technical writing and content, then leadership.
        </p>
      ) : top.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          No connections matched “{query}” in your imported network. Try a shorter form of the name
          (e.g. “Roche” instead of “F. Hoffmann-La Roche”), or use the LinkedIn search link above.
        </p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {top.map((contact, index) => (
            <li key={`${contact.name}-${index}`} className="rounded-xl border p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-display text-sm font-semibold">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contact.position || "Position not in export"}
                    {contact.company ? ` · ${contact.company}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {index === 0 ? "Contact first" : `Priority ${contact.score}`}
                </span>
              </div>
              <p className="mt-2 text-xs">{contact.reason}</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <span>{contact.askSuggestion}</span>
              </p>
              {contact.url && (
                <a
                  href={contact.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Open profile <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
