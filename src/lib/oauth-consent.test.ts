import { describe, it, expect } from 'vitest';
import { claudeCodeCommand, cursorConfig, isSafeRedirectTarget, readAuthorizeParams } from './oauth-consent';
import { safeRedirectPath, withRedirect } from './auth-redirect';

describe('oauth consent helpers', () => {
  it('keeps only known authorize params', () => {
    const p = readAuthorizeParams(new URLSearchParams('client_id=ecc_1&state=s&evil=x&code_challenge=c'));
    expect(p).toEqual({ client_id: 'ecc_1', state: 's', code_challenge: 'c' });
  });

  it('refuses script and local schemes but allows https and native apps', () => {
    expect(isSafeRedirectTarget('https://claude.ai/api/mcp/auth_callback?code=x')).toBe(true);
    expect(isSafeRedirectTarget('cursor://anysphere.cursor-mcp/oauth/callback')).toBe(true);
    expect(isSafeRedirectTarget('javascript:alert(1)')).toBe(false);
    expect(isSafeRedirectTarget('data:text/html,x')).toBe(false);
    expect(isSafeRedirectTarget('not a url')).toBe(false);
    expect(isSafeRedirectTarget(undefined)).toBe(false);
  });

  it('builds Claude Code and Cursor snippets with the key', () => {
    expect(claudeCodeCommand('ek_1', 'https://api.x/mcp')).toBe(
      'claude mcp add --transport http echome https://api.x/mcp --header "Authorization: Bearer ek_1"',
    );
    expect(JSON.parse(cursorConfig('ek_1', 'https://api.x/mcp'))).toEqual({
      mcpServers: { echome: { url: 'https://api.x/mcp', headers: { Authorization: 'Bearer ek_1' } } },
    });
  });

  it('only carries same-origin redirect paths between login and signup', () => {
    expect(safeRedirectPath('/oauth/authorize?client_id=a')).toBe('/oauth/authorize?client_id=a');
    expect(safeRedirectPath('//evil.com')).toBeNull();
    expect(safeRedirectPath('https://evil.com')).toBeNull();
    expect(withRedirect('/auth/signup', '/oauth/authorize?a=1')).toBe('/auth/signup?redirect=%2Foauth%2Fauthorize%3Fa%3D1');
    expect(withRedirect('/auth/signup', null)).toBe('/auth/signup');
  });
});
