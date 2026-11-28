import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: api }));

import {
  JustEchoHttpError,
  getConversation,
  streamTurn,
} from './just-echo-client';

describe('just-echo-client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('authToken', 'tok');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('getConversation unwraps data and hits the limit=200 url', async () => {
    const payload = {
      conversation: { id: 'c1' },
      messages: [{ id: 'm1' }],
      jobs: [],
    };
    api.get.mockResolvedValue({ data: { data: payload } });
    await expect(getConversation('c1')).resolves.toEqual(payload);
    expect(api.get).toHaveBeenCalledWith('/echo/conversations/c1?limit=200');
  });

  it('streamTurn throws JustEchoHttpError with status and server message on 429 before yielding', async () => {
    const message = "You've hit today's Echo limit. It resets tomorrow.";
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: () => ({ error: { message } }) });
    const seen: unknown[] = [];
    let caught: unknown;
    try {
      for await (const ev of streamTurn('c1', 'hi', null)) seen.push(ev);
    } catch (err) {
      caught = err;
    }
    expect(seen).toEqual([]);
    expect(caught).toBeInstanceOf(JustEchoHttpError);
    expect((caught as JustEchoHttpError).status).toBe(429);
    expect((caught as JustEchoHttpError).message).toBe(message);
  });

  it('streamTurn omits panel when null and sends it when set', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, body: null });
    for await (const ev of streamTurn('c1', 'hi', null)) void ev;
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/echo\/conversations\/c1\/messages$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
    const body = JSON.parse(init.body);
    expect(body).toEqual({ message: 'hi' });
    expect('panel' in body).toBe(false);

    for await (const ev of streamTurn('c1', 'hi', { kind: 'kit', id: 'k1' })) void ev;
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      message: 'hi',
      panel: { kind: 'kit', id: 'k1' },
    });
  });

  it('axios errors become JustEchoHttpError with the response status', async () => {
    api.get.mockRejectedValue({
      message: 'Request failed with status code 404',
      response: { status: 404, data: { error: { message: 'Not found' } } },
    });
    const err = await getConversation('nope').catch((e) => e);
    expect(err).toBeInstanceOf(JustEchoHttpError);
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
  });
});
