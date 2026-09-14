/**
 * Renders card front/back text, recognizing `![alt](url)` image markdown
 * where `url` is an `https://` link or a root-relative path (bundled
 * schematic assets ship at `/schematics/*.svg`). No general markdown engine:
 * everything else — including any other URL scheme or bare HTML — stays
 * literal text, exactly as it renders today. Alt text and the URL only ever
 * flow through as React props, never `dangerouslySetInnerHTML`, so there is
 * no HTML-injection surface.
 */

const IMAGE_PATTERN = /!\[([^\]]*)\]\(((?:https:\/\/|\/)[^\s)]+)\)/g;

type CardTextSegment =
  { type: "text"; value: string } | { type: "image"; alt: string; src: string };

export function splitCardText(text: string): CardTextSegment[] {
  const segments: CardTextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(IMAGE_PATTERN)) {
    const [full, alt, src] = match;
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    segments.push({ type: "image", alt, src });
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

export function CardText({ text }: { text: string }) {
  return (
    <>
      {splitCardText(text).map((segment, i) =>
        segment.type === "image" ? (
          <img
            key={i}
            src={segment.src}
            alt={segment.alt}
            loading="lazy"
            style={{ maxWidth: "100%" }}
          />
        ) : (
          <span key={i}>{segment.value}</span>
        ),
      )}
    </>
  );
}
