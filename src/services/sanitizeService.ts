import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "ul", "ol", "li",
  "strong", "em", "b", "i", "u", "s",
  "a", "img",
  "blockquote", "pre", "code",
  "table", "thead", "tbody", "tr", "th", "td",
  "figure", "figcaption",
  "div", "span",
  "iframe",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading"],
  iframe: ["src", "width", "height", "frameborder", "allowfullscreen"],
  div: ["class"],
  span: ["class"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
};

export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
  });
}
