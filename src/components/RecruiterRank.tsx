import { useMemo } from "react";
import { UserSearch, ExternalLink, Sparkles, Briefcase } from "lucide-react";
import { rankRecruiters, type Contact } from "../lib/network";

interface Props {
  contacts: Contact[] | undefined;
}

export function RecruiterRank({ contacts }: Props) {
  const ranked = useMemo(() => rankRecruiters(contacts ?? []), [contacts]);
  const top = ranked.slice(0, 10);

  return (
    <section aria-label="Recruiter contacts" className="mt-6 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserSearch className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold">Recruiters in your network, ranked</h2>
        </div>
        <a
          href="https://www.linkedin.com/search/results/people/?keywords=recruiter&network=%5B%22F%22%5D"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Find recruiters on LinkedIn <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Ranked for your goals: contract-focused agency recruiters first (they hold most freelance
        briefs), then recruiters aligned with content, documentation and requirements roles, then
        senior talent contacts.
      </p>

      {!contacts || contacts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          Import your <code>Connections.csv</code> above and this list will rank every recruiter and
          talent-acquisition contact in your network by how likely they are to land you a contract or
          permanent role.
        </p>
      ) : top.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          No recruiter-style titles found among your {contacts.length} imported connections. Use the
          LinkedIn search above to find recruiters covering technical writing and content in
          Switzerland, or connect with agencies like Hays, Robert Walters or Michael Page and
          re-import your data.
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
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Briefcase className="h-3 w-3" />
                    {contact.kind === "agency" ? "Agency" : "In-house"}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {index === 0 ? "Contact first" : `Priority ${contact.score}`}
                  </span>
                </div>
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
