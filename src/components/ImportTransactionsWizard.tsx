"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";

type Wallet = { id: string; name: string };
type RowObj = Record<string, unknown>;

type ImportMode = "expense" | "income" | "inferBySign";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replaceAll(",", "").trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toDateISO(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "number") {
    // Excel dates sometimes come through as numbers; best-effort parse:
    const asDate = XLSX.SSF.parse_date_code(v);
    if (asDate) {
      const d = new Date(asDate.y, asDate.m - 1, asDate.d);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

export function ImportTransactionsWizard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState<string>("");

  const [rows, setRows] = useState<RowObj[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const [dateCol, setDateCol] = useState<string>("");
  const [descCol, setDescCol] = useState<string>("");
  const [amountCol, setAmountCol] = useState<string>("");
  const [mode, setMode] = useState<ImportMode>("expense");
  const [wantsVsNeeds, setWantsVsNeeds] = useState<"need" | "want">("need");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((d) => {
        const ws = (d?.wallets ?? []) as Wallet[];
        setWallets(ws);
        if (!walletId && ws.length > 0) setWalletId(ws[0].id);
      })
      .catch(() => {
        // ignore
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function parseFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);

    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv")) {
      const text = await file.text();
      const parsed = Papa.parse<RowObj>(text, {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors?.length) {
        throw new Error(parsed.errors[0]?.message ?? "CSV parse failed");
      }
      const data = (parsed.data ?? []).filter((r) => Object.keys(r).length > 0);
      setRows(data.slice(0, 5000));
      const cols = data[0] ? Object.keys(data[0]) : [];
      setColumns(cols);
      setDateCol(cols[0] ?? "");
      setDescCol(cols[1] ?? "");
      setAmountCol(cols[2] ?? "");
      return;
    }

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("No sheets found");
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<RowObj>(ws, { defval: "" });
      setRows(data.slice(0, 5000));
      const cols = data[0] ? Object.keys(data[0]) : [];
      setColumns(cols);
      setDateCol(cols[0] ?? "");
      setDescCol(cols[1] ?? "");
      setAmountCol(cols[2] ?? "");
      return;
    }

    throw new Error("Unsupported file type. Use CSV or Excel (.xlsx).");
  }

  const preview = useMemo(() => {
    if (!dateCol || !descCol || !amountCol) return [];
    return rows.slice(0, 10).map((r) => {
      const dateIso = toDateISO(r[dateCol]);
      const desc = r[descCol];
      const amtRaw = toNumber(r[amountCol]);
      const descStr = isNonEmptyString(desc) ? desc.trim() : "(no description)";

      const inferredTxnType =
        mode === "inferBySign"
          ? (amtRaw ?? 0) < 0
            ? "expense"
            : "income"
          : mode;

      const amt = amtRaw === null ? null : Math.round(Math.abs(amtRaw));

      return {
        dateIso,
        description: descStr,
        txnType: inferredTxnType,
        amount: amt,
      };
    });
  }, [rows, dateCol, descCol, amountCol, mode]);

  async function runImport() {
    setLoading(true);
    setError(null);
    setResult(null);

    if (!walletId) {
      setError("Select a wallet.");
      setLoading(false);
      return;
    }
    if (!dateCol || !descCol || !amountCol) {
      setError("Choose date/description/amount columns.");
      setLoading(false);
      return;
    }

    const mapped = [];
    for (const r of rows) {
      const dateIso = toDateISO(r[dateCol]);
      const amtRaw = toNumber(r[amountCol]);
      const desc = r[descCol];
      const descStr = isNonEmptyString(desc) ? desc.trim() : "";

      if (!dateIso || amtRaw === null || !descStr) continue;

      const txnType =
        mode === "inferBySign" ? (amtRaw < 0 ? "expense" : "income") : mode;

      const amt = Math.round(Math.abs(amtRaw));
      if (amt <= 0) continue;

      mapped.push({
        clientId: crypto.randomUUID(),
        date: dateIso,
        description: descStr,
        amount: amt,
        txnType,
        wantsVsNeeds,
      });
    }

    if (mapped.length === 0) {
      setError("No valid rows after mapping. Check your columns.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/import/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletId, rows: mapped }),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      setError("Import failed.");
      return;
    }

    const body = (await res.json().catch(() => null)) as { inserted?: number } | null;
    setResult(`Imported ${body?.inserted ?? mapped.length} transactions.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">1) Upload</div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          CSV or Excel (.xlsx). First row should be headers.
        </p>
        <input
          className="mt-3 block w-full text-sm"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            parseFile(f).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Parse failed");
            });
          }}
        />
        {fileName ? (
          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Loaded: {fileName} ({rows.length} rows)
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">2) Map columns</div>

        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Import into wallet
            </span>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Date
              </span>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
              >
                <option value="">—</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Description
              </span>
              <select
                value={descCol}
                onChange={(e) => setDescCol(e.target.value)}
                className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
              >
                <option value="">—</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Amount
              </span>
              <select
                value={amountCol}
                onChange={(e) => setAmountCol(e.target.value)}
                className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
              >
                <option value="">—</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Transaction type
              </span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ImportMode)}
                className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
              >
                <option value="expense">All expense</option>
                <option value="income">All income</option>
                <option value="inferBySign">Infer by sign (+/-)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Want/Need
              </span>
              <select
                value={wantsVsNeeds}
                onChange={(e) => setWantsVsNeeds(e.target.value as "need" | "want")}
                className="h-11 rounded-xl border border-zinc-200 bg-transparent px-3 outline-none dark:border-zinc-800"
              >
                <option value="need">Need</option>
                <option value="want">Want</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">3) Preview</div>
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Description</th>
                <th className="p-2">Type</th>
                <th className="p-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p, idx) => (
                <tr key={idx} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-2">{p.dateIso ? p.dateIso.slice(0, 10) : "—"}</td>
                  <td className="p-2">{p.description}</td>
                  <td className="p-2">{p.txnType}</td>
                  <td className="p-2">{p.amount ?? "—"}</td>
                </tr>
              ))}
              {preview.length === 0 ? (
                <tr>
                  <td className="p-2 text-zinc-600 dark:text-zinc-400" colSpan={4}>
                    Upload a file to preview.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {result ? (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
            {result}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loading || rows.length === 0}
          onClick={runImport}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {loading ? "Importing..." : "Import"}
        </button>
      </section>
    </div>
  );
}

