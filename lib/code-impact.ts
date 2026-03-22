import path from "path";
import type { RawJSONLEntry, RawContentBlock, CodeImpact, FileChange } from "./types";

const MAX_CONTENT_LENGTH = 2000;

function truncate(str: string): string {
  if (str.length <= MAX_CONTENT_LENGTH) return str;
  return str.slice(0, MAX_CONTENT_LENGTH) + "... (truncated)";
}

function countLines(str: string): number {
  if (!str) return 0;
  return str.split("\n").length;
}

export function extractCodeImpact(rawEntries: RawJSONLEntry[]): CodeImpact {
  const fileMap = new Map<string, FileChange>();

  for (const raw of rawEntries) {
    if (raw.type !== "assistant" || !raw.message) continue;
    const content = raw.message.content;
    if (!Array.isArray(content)) continue;

    for (const block of content as RawContentBlock[]) {
      if (block.type !== "tool_use" || !block.input) continue;

      const filePath = block.input.file_path as string | undefined;
      if (!filePath) continue;

      if (block.name === "Write") {
        const writeContent = block.input.content as string | undefined;
        const existing = fileMap.get(filePath);
        if (existing) {
          // File already tracked — subsequent Write is a modification
          existing.changeType = "modified";
          existing.edits.push({
            oldString: existing.createdContent || "",
            newString: truncate(writeContent || ""),
          });
          existing.createdContent = undefined;
        } else {
          fileMap.set(filePath, {
            filePath,
            changeType: "created",
            edits: [],
            createdContent: truncate(writeContent || ""),
          });
        }
      } else if (block.name === "Edit") {
        const oldString = truncate((block.input.old_string as string) || "");
        const newString = truncate((block.input.new_string as string) || "");
        const existing = fileMap.get(filePath);
        if (existing) {
          existing.changeType = "modified";
          existing.edits.push({ oldString, newString });
        } else {
          fileMap.set(filePath, {
            filePath,
            changeType: "modified",
            edits: [{ oldString, newString }],
          });
        }
      }
    }
  }

  const allFiles = Array.from(fileMap.values());

  let filesCreated = 0;
  let filesModified = 0;
  let totalEdits = 0;
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const file of allFiles) {
    if (file.changeType === "created") {
      filesCreated++;
      if (file.createdContent) {
        linesAdded += countLines(file.createdContent);
      }
    } else if (file.changeType === "modified") {
      filesModified++;
    }
    totalEdits += file.edits.length;
    for (const edit of file.edits) {
      linesAdded += countLines(edit.newString);
      linesRemoved += countLines(edit.oldString);
    }
  }

  const impactScore = Math.round(
    filesCreated * 3 + filesModified * 2 + totalEdits + (linesAdded + linesRemoved) / 10
  );

  const filesByDirectory: Record<string, FileChange[]> = {};
  for (const file of allFiles) {
    const dir = path.dirname(file.filePath);
    if (!filesByDirectory[dir]) filesByDirectory[dir] = [];
    filesByDirectory[dir].push(file);
  }

  return {
    filesCreated,
    filesModified,
    filesDeleted: 0,
    totalEdits,
    linesAdded,
    linesRemoved,
    impactScore,
    filesByDirectory,
    allFiles,
  };
}
