import { describe, expect, it } from 'vitest';
import { bookmarkletFromCode, detectPortal, districtFor, shadowCss } from './host';

describe('detectPortal', () => {
  it('recognizes the parent portal', () => {
    const p = detectPortal({ origin: 'https://parents.summit.k12.nj.us', pathname: '/genesis/parents' });
    expect(p?.kind).toBe('parent');
    expect(p?.base).toBe('https://parents.summit.k12.nj.us/genesis/parents');
  });

  it('recognizes the student portal and uses its own path', () => {
    const p = detectPortal({ origin: 'https://students.summit.k12.nj.us', pathname: '/genesis/students' });
    expect(p?.kind).toBe('student');
    expect(districtFor(p!).portals.parent).toBe('https://students.summit.k12.nj.us/genesis/students');
  });

  it('falls back to the configured path on the login page', () => {
    const p = detectPortal({ origin: 'https://students.summit.k12.nj.us', pathname: '/genesis/sis/view' });
    expect(p?.base).toBe('https://students.summit.k12.nj.us/genesis/students');
  });

  it('returns null on other sites', () => {
    expect(detectPortal({ origin: 'https://example.com', pathname: '/' })).toBeNull();
  });
});

describe('shadowCss', () => {
  it('maps :root and body for a shadow root', () => {
    expect(shadowCss(':root { --a: 1 }\nbody {\n color: red }\n.x body{}')).toBe(':host { --a: 1 }\n.ggl-body {\n color: red }\n.x .ggl-body{}');
    expect(shadowCss('@media (x) { :root:not([data-theme]) { } }')).toBe('@media (x) { :host:not([data-theme]) { } }');
    expect(shadowCss('.tbody { } .body-text { }')).toBe('.tbody { } .body-text { }');
  });
});

describe('bookmarkletFromCode', () => {
  const code = "(function(){var a='x?y#z%';if(window.__t)return;window.__t=a})();\n";
  const b = bookmarkletFromCode(code);

  it('is a javascript: URL with nothing browsers rewrite', () => {
    expect(b.startsWith('javascript:')).toBe(true);
    expect(b.slice('javascript:'.length)).not.toMatch(/[?#"\s]/);
  });

  it('decodes back to exactly the code', () => {
    expect(decodeURIComponent(b.slice('javascript:'.length))).toBe(code.trim());
  });
});
