import JSZip from "jszip";

// ── PDF ────────────────────────────────────────────────────────────────────

async function pdfToMarkdown(buffer: Buffer, fileName: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const { text } = await pdfParse(buffer);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Heuristic: short lines surrounded by blank context are likely headings
  const md: string[] = [`# ${fileName.replace(/\.[^/.]+$/, "")}\n`];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prev = lines[i - 1] ?? "";
    const next = lines[i + 1] ?? "";
    if (line.length < 80 && line.length > 3 && prev === "" && next === "") {
      md.push(`\n## ${line}\n`);
    } else {
      md.push(line);
    }
  }
  return md.join("\n");
}

// ── PPTX ───────────────────────────────────────────────────────────────────

function extractTextFromSlideXml(xml: string): { title: string; body: string[] } {
  // Title placeholder: <p:ph type="title"> or <p:ph type="ctrTitle">
  const titleMatch = xml.match(
    /<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<p:ph\s[^>]*type="(?:title|ctrTitle)"[^>]*\/?>[\s\S]*?<\/p:sp>/
  );
  let title = "";
  if (titleMatch) {
    title = titleMatch[0]
      .match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)
      ?.map((t) => t.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join(" ") ?? "";
  }

  // All text runs — skip title block
  const allTexts = xml
    .match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)
    ?.map((t) => t.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean) ?? [];

  // Remove title words from body to avoid duplication
  const titleWords = new Set(title.toLowerCase().split(/\s+/));
  const body = allTexts.filter(
    (t) => !titleWords.has(t.toLowerCase()) || t.length > 40
  );

  return { title, body };
}

async function pptxToMarkdown(buffer: Buffer, fileName: string): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
      return na - nb;
    });

  const md: string[] = [`# ${fileName.replace(/\.[^/.]+$/, "")}\n`];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("string");
    const { title, body } = extractTextFromSlideXml(xml);

    md.push(`\n## ${title || `Slide ${i + 1}`}\n`);
    if (body.length > 0) {
      md.push(body.map((line) => `- ${line}`).join("\n"));
    }
  }

  return md.join("\n");
}

// ── Plain text / Markdown pass-through ────────────────────────────────────

function textToMarkdown(text: string, fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "");
  if (fileName.endsWith(".md") || fileName.endsWith(".markdown")) return text;
  return `# ${base}\n\n${text}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

export type ConvertedFile = {
  fileName: string;
  markdownContent: string;
};

export async function convertFileToMarkdown(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<ConvertedFile> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  let md: string;

  if (ext === "pdf" || mimeType === "application/pdf") {
    md = await pdfToMarkdown(buffer, fileName);
  } else if (
    ext === "pptx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    md = await pptxToMarkdown(buffer, fileName);
  } else {
    md = textToMarkdown(buffer.toString("utf-8"), fileName);
  }

  return { fileName, markdownContent: md };
}
