import { useEffect, useRef, useState } from "react";
import { Users, Upload, Trash2, Info } from "lucide-react";
import { summarizeConnectionsCsv, type NetworkSummary } from "../lib/network";
import { CompanyInsiders } from "./CompanyInsiders";
import { RecruiterRank } from "./RecruiterRank";
import { cn } from "../lib/utils";

const STORAGE_KEY = "job-radar.network";

const BAR_TONES = [
  "bg-primary",
  "bg-primary/80",
  "bg-primary/65",
  "bg-primary/50",
  "bg-primary/40",
  "bg-primary/30",
  "bg-primary/25",
  "bg-primary/20",
];

export function NetworkPanel() {
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSummary(JSON.parse(stored) as NetworkSummary);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const persist = (next: NetworkSummary | null) => {
    setSummary(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const next = summarizeConnectionsCsv(text);
      if (next.total === 0) {
        setError("That file had no connection rows. Use the Connections.csv from your export.");
        return;
      }
      persist(next);
    } catch {
      setError("Couldn't read that file. Make sure it's the Connections.csv from LinkedIn.");
    }
  };

  return (
    <section aria-label="Network by field" className="mt-6 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm font-semibold">Your network by field</h2>
          {summary && (
            <span className="text-xs text-muted-foreground">
              {summary.total.toLocaleString()} connections
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Upload className="h-3.5 w-3.5" />
            {summary ? "Re-import CSV" : "Import Connections.csv"}
          </button>
          {summary && (
            <button
              type="button"
              onClick={() => persist(null)}
              aria-label="Clear imported connections"
              className="inline-flex items-center justify-center rounded-lg border bg-card p-2 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {!summary ? (
        <div className="mt-4 rounded-xl border border-dashed p-5">
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              LinkedIn&apos;s API doesn&apos;t expose your connection list to apps, so import it
              yourself: LinkedIn → <strong>Settings &amp; Privacy → Data privacy → Get a copy of
              your data</strong> → pick <strong>Connections</strong>. Drop the{" "}
              <code>Connections.csv</code> here and the breakdown is computed in your browser — the
              file never leaves your device.
            </span>
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {summary.slices.map((slice, index) => (
            <div key={slice.field}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium">{slice.field}</span>
                <span className="text-muted-foreground">
                  <span className="font-display text-sm font-bold text-foreground">
                    {slice.percentage}%
                  </span>{" "}
                  · {slice.count}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn("h-full rounded-full", BAR_TONES[index % BAR_TONES.length])}
                  style={{ width: `${Math.max(slice.percentage, 1)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Fields inferred from each connection&apos;s job title. Stored only in this browser.
          </p>
        </div>
      )}
      <CompanyInsiders contacts={summary?.contacts} />
      <RecruiterRank contacts={summary?.contacts} />
    </section>
  );
}
