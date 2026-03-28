import { marked, type Tokens } from "marked";

// Match XML-like tags: <tag-name>...content...</tag-name>
const XML_TAG_REGEX = /<([a-z][a-z0-9_-]*?)>([\s\S]*?)<\/\1>/gi;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Use a placeholder that won't be parsed by markdown
// (double underscores get interpreted as bold/emphasis)
function xmlPlaceholder(i: number): string {
  return `\x00XMLBLOCK${i}\x00`;
}

// Custom renderer to convert mermaid code blocks into renderable divs
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }: Tokens.Code): string {
  if (lang === "mermaid") {
    // Escape < and & to prevent HTML injection, but keep > raw for mermaid arrows (-->)
    const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<div class="mermaid">${safe}</div>`;
  }
  return `<pre><code class="language-${escapeHtml(lang || "")}">${escapeHtml(text)}</code></pre>`;
};

export function renderMessageContent(content: string): string {
  if (!content) return "";

  // Stage 1: Extract XML tags into collapsible blocks
  const xmlBlocks: string[] = [];
  const withoutXml = content.replace(
    XML_TAG_REGEX,
    (_, tagName: string, innerContent: string) => {
      const idx = xmlBlocks.length;
      xmlBlocks.push(
        `<details class="xml-block"><summary>${escapeHtml(tagName)}</summary><pre>${escapeHtml(innerContent.trim())}</pre></details>`
      );
      return xmlPlaceholder(idx);
    }
  );

  // Stage 2: Render markdown (with mermaid support)
  let html = marked.parse(withoutXml, { breaks: true, renderer }) as string;

  // Stage 3: Re-insert XML blocks (handle both raw and <p>-wrapped placeholders)
  xmlBlocks.forEach((block, i) => {
    const ph = escapeHtml(xmlPlaceholder(i));
    // Replace <p>-wrapped version first (more specific)
    html = html.replace(`<p>${ph}</p>`, block);
    html = html.replace(ph, block);
    // Also try raw null bytes in case marked didn't escape them
    html = html.replace(`<p>${xmlPlaceholder(i)}</p>`, block);
    html = html.replace(xmlPlaceholder(i), block);
  });

  return html;
}
