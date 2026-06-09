import { useEffect } from "react";

interface Head {
  title: string;
  description?: string;
}

function upsertMeta(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

// Keeps the document title + description in sync on client navigation. The
// server injects first-paint meta for crawlers; this handles SPA route changes.
export function useDocumentHead({ title, description }: Head): void {
  useEffect(() => {
    document.title = title;
    if (description) upsertMeta("description", description);
  }, [title, description]);
}
