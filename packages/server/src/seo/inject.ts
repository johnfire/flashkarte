export interface InjectPayload {
  headHtml: string;
  bodyHtml?: string;
}

const ROOT = '<div id="root"></div>';

export function inject(template: string, payload: InjectPayload): string {
  if (!template.includes("</head>")) return template; // fail safe
  let out = template;
  if (payload.headHtml) {
    out = out.replace("</head>", `${payload.headHtml}</head>`);
  }
  if (payload.bodyHtml && out.includes(ROOT)) {
    out = out.replace(ROOT, `<div id="root">${payload.bodyHtml}</div>`);
  }
  return out;
}
