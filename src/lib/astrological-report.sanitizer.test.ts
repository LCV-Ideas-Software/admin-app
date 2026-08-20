// Regression tests for the e-mail sanitizer findings from the review threads
// on PRs #1/#2/#3: DOMParser-less fallback must strip tags, structural tags
// must keep their line breaks in the text output, and scheme checks must not
// be bypassable with embedded control characters.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { astrologicalReportTestHooks } from './astrological-report';

const { htmlToPlainText, sanitizeForEmail } = astrologicalReportTestHooks;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('htmlToPlainText', () => {
  it('preserves line breaks from <br>, <p> and <li> in the DOM path', () => {
    const text = htmlToPlainText(
      '<p>Primeira linha</p><p>Segunda linha<br>terceira</p><ul><li>item um</li><li>item dois</li></ul>',
    );
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    expect(lines).toEqual(['Primeira linha', 'Segunda linha', 'terceira', 'item um', 'item dois']);
  });

  it('strips tags in the DOMParser-less fallback instead of leaking them', () => {
    vi.stubGlobal('DOMParser', undefined);
    const text = htmlToPlainText('<p>Texto &amp; s&iacute;ntese</p><script>alert(1)</script>');
    expect(text).not.toMatch(/[<>]/);
    expect(text).toContain('Texto & s');
    // Break-producing tags still separate lines in the fallback.
    const broken = htmlToPlainText('<p>um</p><p>dois</p>');
    expect(
      broken
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ).toEqual(['um', 'dois']);
  });
});

describe('sanitizeForEmail', () => {
  it('returns tag-free plain text when DOMParser is unavailable', () => {
    vi.stubGlobal('DOMParser', undefined);
    const out = sanitizeForEmail('<p>ola</p><iframe src="https://exemplo.com"></iframe>');
    expect(out).not.toMatch(/[<>]/);
    expect(out).toContain('ola');
  });

  it('never emits a raw tag opener from the DOMParser-less fallback (entity-order/unclosed-tag invariant)', () => {
    vi.stubGlobal('DOMParser', undefined);
    // Encoded markup must stay inert text, never become a live tag.
    const encoded = sanitizeForEmail('&lt;img src=x onerror=alert(1)&gt; e &amp;lt;script&amp;gt;');
    expect(encoded).not.toMatch(/<[a-zA-Z!/]/);
    // An UNCLOSED tag does not match the <[^>]*> strip; the raw `<` must not
    // reach the HTML e-mail context where a later `>` could complete it.
    const unclosed = sanitizeForEmail('inicio <img src=x onerror=alert(1) fim');
    expect(unclosed).not.toMatch(/<[a-zA-Z!/]/);
    expect(unclosed).toContain('inicio');
  });

  it('removes attributes whose scheme hides behind embedded control characters', () => {
    // DOMParser decodes &#x0d; into a raw CR inside the attribute value, so a
    // plain startsWith('javascript:') check would miss it.
    const out = sanitizeForEmail(
      '<p data-x="java&#x0d;script:alert(1)">seguro</p><a href="https://exemplo.com/ok">link</a>',
    );
    expect(out).not.toContain('script:alert');
    expect(out).toContain('seguro');
    expect(out).toContain('https://exemplo.com/ok');
  });
});
