import { marked } from "marked";

// Match XML-like tags: <tag-name>...content...</tag-name>
const XML_TAG_REGEX = /<([a-z][a-z0-9_-]*?)>([\s\S]*?)<\/\1>/gi;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMessageContent(content: string): string {
  if (!content) return "";

  // Stage 1: Extract XML tags into collapsible blocks
  const xmlBlocks: string[] = [];
  const withoutXml = content.replace(
    XML_TAG_REGEX,
    (_, tagName: string, innerContent: string) => {
      const placeholder = `__XML_BLOCK_${xmlBlocks.length}__`;
      xmlBlocks.push(
        `<details class="xml-block"><summary>${escapeHtml(tagName)}</summary><pre>${escapeHtml(innerContent.trim())}</pre></details>`
      );
      return placeholder;
    }
  );

  // Stage 2: Render markdown
  let html = marked.parse(withoutXml, { breaks: true }) as string;

  // Stage 3: Re-insert XML blocks
  xmlBlocks.forEach((block, i) => {
    html = html.replace(`__XML_BLOCK_${i}__`, block);
    // Also handle case where marked wraps placeholder in <p> tags
    html = html.replace(`<p>__XML_BLOCK_${i}__</p>`, block);
  });

  return html;
}
