import sanitizeHtml from 'sanitize-html';

const LENGTH_NON_NEGATIVE = /^(?:0|\d+(?:\.\d+)?(?:px|em|rem|%|pt|vh|vw))$/i;
const LINE_HEIGHT = /^(?:normal|\d+(?:\.\d+)?(?:px|em|rem|%)?)$/i;
const FONT_FAMILY = /^[a-zA-Z0-9\s,'"_-]+$/;
const COLOR_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_RGB = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i;
const COLOR_HSL = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i;
const COLOR_NAMED = /^[a-z]+$/i;
const SAFE_DIMENSION = /^(?:auto|0|\d+(?:\.\d+)?(?:px|em|rem|%|vw|vh))$/i;
const SAFE_DISPLAY = /^(?:block|inline|inline-block|flex|inline-flex)$/i;
const TEXT_ALIGN = /^(?:left|right|center|justify|start|end)$/i;

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

const headingAttributes = HEADING_TAGS.reduce<Record<string, string[]>>((acc, tag) => {
  acc[tag] = ['style'];
  return acc;
}, {});

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a',
    'abbr',
    'b',
    'blockquote',
    'br',
    'caption',
    'code',
    'col',
    'colgroup',
    'del',
    'div',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'iframe',
    'img',
    'input',
    'label',
    'li',
    'mark',
    'ol',
    'p',
    'pre',
    's',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
  ],
  allowedAttributes: {
    ...headingAttributes,
    a: ['href', 'name', 'target', 'rel', 'title'],
    blockquote: ['cite'],
    code: ['class'],
    col: ['span', 'style', 'width'],
    colgroup: ['span', 'width'],
    div: ['class', 'data-youtube-video', 'style'],
    figure: ['class', 'style'],
    iframe: ['allow', 'allowfullscreen', 'frameborder', 'height', 'scrolling', 'src', 'style', 'title', 'width'],
    img: ['alt', 'data-width', 'height', 'loading', 'src', 'style', 'title', 'width'],
    input: ['checked', 'disabled', 'type'],
    label: ['for'],
    li: ['data-checked', 'data-type', 'style'],
    mark: ['style'],
    ol: ['start', 'style', 'type'],
    p: ['style'],
    pre: ['class'],
    span: ['class', 'style'],
    table: ['style', 'width'],
    td: ['colspan', 'colwidth', 'rowspan', 'style'],
    th: ['colspan', 'colwidth', 'rowspan', 'scope', 'style'],
    ul: ['data-type', 'style'],
  },
  allowedEmptyAttributes: ['data-youtube-video'],
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'youtube.com', 'youtube-nocookie.com'],
  allowProtocolRelative: false,
  nonBooleanAttributes: [
    'allow',
    'allowfullscreen',
    'alt',
    'cite',
    'class',
    'colspan',
    'colwidth',
    'data-checked',
    'data-type',
    'data-width',
    'frameborder',
    'height',
    'href',
    'loading',
    'name',
    'rel',
    'rowspan',
    'scope',
    'scrolling',
    'src',
    'style',
    'target',
    'title',
    'type',
    'width',
  ],
  enforceHtmlBoundary: true,
  parseStyleAttributes: true,
  allowedStyles: {
    '*': {
      'background-color': [COLOR_HEX, COLOR_RGB, COLOR_HSL, COLOR_NAMED],
      color: [COLOR_HEX, COLOR_RGB, COLOR_HSL, COLOR_NAMED],
      display: [SAFE_DISPLAY],
      'font-family': [FONT_FAMILY],
      'font-size': [LENGTH_NON_NEGATIVE],
      'font-style': [/^(?:normal|italic|oblique)$/i],
      'font-weight': [/^(?:normal|bold|bolder|lighter|[1-9]00)$/i],
      height: [SAFE_DIMENSION],
      'line-height': [LINE_HEIGHT],
      'margin-bottom': [LENGTH_NON_NEGATIVE],
      'margin-top': [LENGTH_NON_NEGATIVE],
      'max-width': [SAFE_DIMENSION],
      'min-width': [SAFE_DIMENSION],
      'text-align': [TEXT_ALIGN],
      'text-decoration': [/^(?:none|underline|line-through|overline)$/i],
      'text-indent': [LENGTH_NON_NEGATIVE],
      'vertical-align': [/^(?:baseline|sub|super|top|middle|bottom)$/i],
      width: [SAFE_DIMENSION],
    },
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    img: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        loading: attribs.loading === 'eager' ? 'eager' : 'lazy',
      },
    }),
  },
};

export function sanitizePostHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}

export function sanitizePlainText(raw: unknown, maxLength: number): string {
  return sanitizeHtml(String(raw ?? ''), { allowedTags: [], allowedAttributes: {} })
    .trim()
    .slice(0, maxLength);
}
