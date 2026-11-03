import { describe, expect, it } from 'vitest';
import { detectPageState, parseHtml } from './detect';

const PORTAL = 'https://parents.example.k12.nj.us/genesis/parents?tab1=studentdata';

describe('detectPageState', () => {
  it('recognizes the login page', () => {
    const doc = parseHtml('<form><input name="j_username"><input type="password" name="j_password"></form>');
    expect(detectPageState(doc, 'https://parents.example.k12.nj.us/genesis/sis/view?gohome=true')).toEqual({
      kind: 'signed-out',
    });
  });

  it('recognizes a closed gradebook and keeps the message', () => {
    const doc = parseHtml('<body><nav>Gradebook</nav><div>The gradebook is not available at this time.</div></body>');
    expect(detectPageState(doc, PORTAL)).toEqual({
      kind: 'gradebook-unavailable',
      message: 'The gradebook is not available at this time.',
    });
  });

  it('treats other portal pages as ok', () => {
    const doc = parseHtml('<body><table><tr><td>Course</td></tr></table></body>');
    expect(detectPageState(doc, PORTAL)).toEqual({ kind: 'ok' });
  });
});
