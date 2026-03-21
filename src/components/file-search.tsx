"use client";

import { useState } from "react";
import Link from "next/link";
import type { FileHistoryEntry } from "@/lib/claude-data";

interface FileSearchProps {
  files: FileHistoryEntry[];
  initialQuery?: string;
}

export default function FileSearch({ files, initialQuery = "" }: FileSearchProps) {
  const [query, setQuery] = useState(initialQuery);

  const filtered = query
    ? files.filter((f) =>
        f.filePath.toLowerCase().includes(query.toLowerCase())
      )
    : files;

  return (
    <div style={{ padding: "16px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Search bar */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "8px 12px",
          }}
        >
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>$</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search files... (e.g. login.ts, src/auth/)"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontFamily: "inherit",
              outline: "none",
            }}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "inherit",
              }}
            >
              clear
            </button>
          )}
        </div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            marginTop: "6px",
          }}
        >
          {filtered.length} file{filtered.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Results */}
      <div>
        {filtered.map((file) => (
          <details key={file.filePath} style={{ marginBottom: "2px" }}>
            <summary
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                cursor: "pointer",
                listStyle: "none",
                borderBottom: "1px solid var(--border-light)",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {file.filePath}
              </span>
              <span
                style={{
                  color: "var(--purple)",
                  fontSize: "11px",
                  flexShrink: 0,
                  marginLeft: "12px",
                }}
              >
                {file.sessions.length} session{file.sessions.length !== 1 ? "s" : ""}
              </span>
            </summary>

            {/* Expanded: sessions that touched this file */}
            <div
              style={{
                padding: "8px 12px 12px 24px",
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              {file.sessions.map((s) => (
                <Link
                  key={s.sessionId}
                  href={`/sessions/${s.sessionId}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "4px 0",
                    textDecoration: "none",
                    color: "inherit",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "var(--green)" }}>{s.project}</span>
                  <span style={{ color: "var(--text-muted)" }}>{s.branch}</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                    {s.lastActiveAt.slice(0, 10)}
                  </span>
                </Link>
              ))}
            </div>
          </details>
        ))}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            {query ? "no files match your search" : "no files changed in any session"}
          </div>
        )}
      </div>
    </div>
  );
}
