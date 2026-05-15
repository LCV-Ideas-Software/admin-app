import { describe, expect, it } from 'vitest';

import { sanitizePlainText, sanitizePostHtml } from './sanitize-post-html.ts';

describe('sanitizePostHtml — Tiptap-emitted formatting persistence', () => {
  it('preserves text-align on headings (h1..h6)', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const out = sanitizePostHtml(`<h${level} style="text-align: left">Title</h${level}>`);
      expect(out).toMatch(new RegExp(`<h${level} style="text-align:\\s*left">Title</h${level}>`));
    }
    for (const value of ['center', 'right', 'justify']) {
      const out = sanitizePostHtml(`<h3 style="text-align: ${value}">Title</h3>`);
      expect(out).toMatch(new RegExp(`<h3 style="text-align:\\s*${value}">Title</h3>`));
    }
  });

  it('preserves text-align on paragraphs', () => {
    const out = sanitizePostHtml('<p style="text-align: center">Body</p>');
    expect(out).toMatch(/<p style="text-align:\s*center">Body<\/p>/);
  });

  it('preserves EditorSpacing on paragraphs (line-height, margin-top, margin-bottom)', () => {
    const out = sanitizePostHtml('<p style="line-height: 1.6; margin-top: 12px; margin-bottom: 24px">Spaced</p>');
    expect(out).toMatch(/line-height:\s*1\.6/);
    expect(out).toMatch(/margin-top:\s*12px/);
    expect(out).toMatch(/margin-bottom:\s*24px/);
  });

  it('preserves EditorSpacing on headings', () => {
    const out = sanitizePostHtml(
      '<h2 style="line-height: 1.4; margin-top: 16px; margin-bottom: 8px">Spaced heading</h2>',
    );
    expect(out).toMatch(/line-height:\s*1\.4/);
    expect(out).toMatch(/margin-top:\s*16px/);
    expect(out).toMatch(/margin-bottom:\s*8px/);
  });

  it('preserves EditorSpacing on list items, ul, and ol (CRITICAL — lists were stripped pre-fix)', () => {
    const li = sanitizePostHtml('<ul><li style="line-height: 1.8; margin-top: 4px; margin-bottom: 4px">item</li></ul>');
    expect(li).toMatch(/line-height:\s*1\.8/);
    expect(li).toMatch(/margin-top:\s*4px/);
    expect(li).toMatch(/margin-bottom:\s*4px/);

    const ul = sanitizePostHtml('<ul style="margin-top: 16px; margin-bottom: 16px"><li>x</li></ul>');
    expect(ul).toMatch(/<ul style="[^"]*margin-top:\s*16px/);
    expect(ul).toMatch(/margin-bottom:\s*16px/);

    const ol = sanitizePostHtml('<ol style="line-height: 2"><li>x</li></ol>');
    expect(ol).toMatch(/<ol style="line-height:\s*2"/);
  });

  it('preserves FontSize on spans', () => {
    const out = sanitizePostHtml('<p>Hi <span style="font-size: 18px">big</span></p>');
    expect(out).toMatch(/font-size:\s*18px/);
  });

  it('preserves FontFamily on spans (common stack with quoted name)', () => {
    const out = sanitizePostHtml('<p><span style="font-family: \'Inter\', system-ui, sans-serif">Inter</span></p>');
    expect(out).toMatch(/font-family:\s*'Inter',\s*system-ui,\s*sans-serif/);
  });

  it('preserves Color on spans (hex, rgb, named)', () => {
    expect(sanitizePostHtml('<p><span style="color: #ff0000">red</span></p>')).toMatch(/color:\s*#ff0000/);
    expect(sanitizePostHtml('<p><span style="color: rgb(255, 0, 0)">red</span></p>')).toMatch(
      /color:\s*rgb\(255,\s*0,\s*0\)/,
    );
    expect(sanitizePostHtml('<p><span style="color: red">red</span></p>')).toMatch(/color:\s*red/);
  });

  it('preserves TextIndent on paragraphs and headings (rem units)', () => {
    expect(sanitizePostHtml('<p style="text-indent: 1.5rem">Indented</p>')).toMatch(/text-indent:\s*1\.5rem/);
    expect(sanitizePostHtml('<h3 style="text-indent: 2rem">Indented heading</h3>')).toMatch(/text-indent:\s*2rem/);
  });

  it('preserves CustomResizableImage style (width, height) on img', () => {
    const out = sanitizePostHtml(
      '<img src="https://example.com/x.png" alt="x" data-width="80%" style="width: 80%; height: auto">',
    );
    expect(out).toContain('data-width="80%"');
    expect(out).toMatch(/width:\s*80%/);
    expect(out).toMatch(/height:\s*auto/);
  });

  it('preserves FigureImageNode style on figure and inner img', () => {
    const out = sanitizePostHtml(
      '<figure class="tiptap-figure" style="width: 60%; max-width: 100%"><img src="https://example.com/x.png" alt="x" style="width: 100%; height: auto; display: block"><figcaption>caption</figcaption></figure>',
    );
    expect(out).toMatch(/width:\s*60%/);
    expect(out).toMatch(/max-width:\s*100%/);
    expect(out).toMatch(/display:\s*block/);
    expect(out).toContain('<figcaption>caption</figcaption>');
  });

  it('preserves Tiptap Table sizing (width, min-width on table and col)', () => {
    const out = sanitizePostHtml(
      '<table style="width: 100%; min-width: 50px"><colgroup><col style="width: 200px; min-width: 50px"></colgroup><tbody><tr><td style="width: 100px">cell</td></tr></tbody></table>',
    );
    expect(out).toMatch(/<table style="[^"]*width:\s*100%/);
    expect(out).toMatch(/<table style="[^"]*min-width:\s*50px/);
    expect(out).toMatch(/<col style="[^"]*width:\s*200px/);
    expect(out).toMatch(/<col style="[^"]*min-width:\s*50px/);
  });

  it('preserves blank-line paragraph (vertical-space insertion)', () => {
    const out = sanitizePostHtml('<p style="margin-bottom: 24px">Para</p><p><br></p>');
    expect(out).toMatch(/margin-bottom:\s*24px/);
    expect(out).toMatch(/<p><br\s*\/?>\s*<\/p>/);
  });

  it('strips style attribute from tags not whitelisted for style', () => {
    const out = sanitizePostHtml('<a href="https://example.com" style="color: red">link</a>');
    expect(out).not.toContain('style=');
    expect(out).toContain('href="https://example.com"');
  });

  it('drops disallowed CSS properties silently while keeping allowed ones in same declaration', () => {
    const out = sanitizePostHtml('<p style="font-size: 18px; position: absolute; top: 0; line-height: 1.6">Hi</p>');
    expect(out).toMatch(/font-size:\s*18px/);
    expect(out).toMatch(/line-height:\s*1\.6/);
    expect(out).not.toContain('position');
    expect(out).not.toMatch(/\btop\s*:/);
  });

  it('rejects CSS-injection patterns inside allowed CSS properties', () => {
    expect(sanitizePostHtml('<p style="background-color: url(javascript:alert(1))">x</p>')).not.toContain('javascript');
    expect(sanitizePostHtml('<span style="color: rgb(255,0,0); /* */ expression(alert(1))">x</span>')).not.toContain(
      'expression',
    );
    expect(sanitizePostHtml('<p style="font-family: foo;</style><script>alert(1)</script>">x</p>')).not.toContain(
      '<script',
    );
    expect(sanitizePostHtml('<p style="background: url(javascript:alert(1))">x</p>')).not.toContain('javascript');
  });

  it('rejects display: none (content-hiding footgun)', () => {
    const out = sanitizePostHtml('<span style="display: none">hidden</span>');
    expect(out).not.toContain('display');
  });

  it('strips javascript: URLs from href', () => {
    const out = sanitizePostHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript');
  });

  it('forces target=_blank-aware rel on links', () => {
    const out = sanitizePostHtml('<a href="https://example.com" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('forces loading=lazy on img unless eager is explicit', () => {
    expect(sanitizePostHtml('<img src="https://example.com/x.png" alt="x">')).toContain('loading="lazy"');
    expect(sanitizePostHtml('<img src="https://example.com/x.png" alt="x" loading="eager">')).toContain(
      'loading="eager"',
    );
  });

  it('preserves YouTube container empty-string marker (Tiptap actual emit format)', () => {
    const out = sanitizePostHtml(
      '<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe></div>',
    );
    expect(out).toContain('data-youtube-video');
    expect(out).toContain('youtube-nocookie.com/embed/abc');
  });

  it('preserves task-list data attributes', () => {
    const out = sanitizePostHtml(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">done</li></ul>',
    );
    expect(out).toContain('data-type="taskList"');
    expect(out).toContain('data-checked="true"');
  });

  it('preserves code block class for syntax highlighting', () => {
    const out = sanitizePostHtml('<pre><code class="language-ts">const x = 1;</code></pre>');
    expect(out).toContain('class="language-ts"');
  });

  it('preserves mention span class', () => {
    const out = sanitizePostHtml('<p>Hello <span class="editor-mention">@user</span></p>');
    expect(out).toContain('class="editor-mention"');
  });

  it('returns empty string for non-string or empty inputs', () => {
    expect(sanitizePostHtml('')).toBe('');
    expect(sanitizePostHtml(undefined as unknown as string)).toBe('');
    expect(sanitizePostHtml(null as unknown as string)).toBe('');
  });
});

describe('sanitizePlainText', () => {
  it('strips all HTML and trims', () => {
    expect(sanitizePlainText('<p>hello <b>world</b></p>', 100)).toBe('hello world');
  });

  it('truncates to maxLength', () => {
    expect(sanitizePlainText('a'.repeat(20), 5)).toBe('aaaaa');
  });

  it('handles non-string input', () => {
    expect(sanitizePlainText(undefined, 100)).toBe('');
    expect(sanitizePlainText(123, 100)).toBe('123');
  });
});
