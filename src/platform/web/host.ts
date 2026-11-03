// Pure helpers for running inside a Genesis page (tested in host.test.ts).

import { DISTRICTS, type District, type PortalKind } from '../../config/districts';

export interface ActivePortal {
  district: District;
  kind: PortalKind;
  /** e.g. https://students.summit.k12.nj.us/genesis/students */
  base: string;
}

/**
 * Which district and portal is this Genesis tab? Matches the host against the known portals.
 * The portal path is taken from the current page (/genesis/parents or /genesis/students).
 */
export function detectPortal(loc: { origin: string; pathname: string }, districts = DISTRICTS): ActivePortal | null {
  for (const district of districts) {
    for (const [kind, url] of Object.entries(district.portals) as [PortalKind, string | undefined][]) {
      if (!url || new URL(url).origin !== loc.origin) continue;
      const seg = loc.pathname.match(/^\/genesis\/(parents|students)\b/)?.[1];
      const base = seg ? `${loc.origin}/genesis/${seg}` : url;
      return { district, kind: seg === 'students' ? 'student' : seg === 'parents' ? 'parent' : kind, base };
    }
  }
  return null;
}

/** The app's pages all use the "parent" slot for URLs; point it at whichever portal is open. */
export function districtFor(active: ActivePortal): District {
  return { ...active.district, portals: { ...active.district.portals, parent: active.base } };
}

/** Adapt page-level CSS for a shadow root: :root → :host, body → .ggl-body. */
export function shadowCss(css: string): string {
  return css.replace(/:root/g, ':host').replace(/(^|[\s,}])body(\s*[{,])/g, '$1.ggl-body$2');
}

/**
 * The bookmark itself: the whole app inside a javascript: URL. Genesis's signed-in pages only
 * allow scripts from Genesis (plus inline code), so the app can't be loaded from elsewhere.
 * Percent-encoding everything keeps "?", "#" and "%" out of the raw URL, so browsers store it
 * unchanged; they decode it again before running it.
 */
export function bookmarkletFromCode(code: string): string {
  return 'javascript:' + encodeURIComponent(code.trim());
}
