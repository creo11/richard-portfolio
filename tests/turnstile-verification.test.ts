// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstileRequest } from '../functions/lib/turnstile'

const env = {
  TURNSTILE_SECRET: 'test-secret',
  TURNSTILE_HOSTNAMES: 'localhost,rickgutz.com,www.rickgutz.com',
} as Env

function createRequest(token = 'test-token'): Request {
  return new Request('http://localhost/api/dartsync/players', {
    method: 'POST',
    headers: {
      'CF-Connecting-IP': '203.0.113.10',
      'X-Turnstile-Token': token,
    },
  })
}

const localTestEnv = {
  TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
  TURNSTILE_HOSTNAMES: 'localhost,127.0.0.1',
} as Env

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('Turnstile request verification', () => {
  it('accepts a successful result with the exact action and hostname', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({
      success: true,
      action: 'player_create',
      hostname: 'localhost',
    }))

    await expect(
      verifyTurnstileRequest(createRequest(), env, 'player_create'),
    ).resolves.toBe(true)

    const request = vi.mocked(fetch).mock.calls[0]?.[1]
    expect(request?.method).toBe('POST')
    expect(String(request?.body)).toContain('response=test-token')
    expect(String(request?.body)).toContain('remoteip=203.0.113.10')
  })

  it('accepts Cloudflare test-key metadata only for a local request', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({
      success: true,
      action: '',
      hostname: 'example.com',
    }))

    await expect(
      verifyTurnstileRequest(createRequest(), localTestEnv, 'player_create'),
    ).resolves.toBe(true)

    const remoteRequest = new Request('https://rickgutz.com/api/dartsync/players', {
      method: 'POST',
      headers: { 'X-Turnstile-Token': 'test-token' },
    })
    await expect(
      verifyTurnstileRequest(remoteRequest, localTestEnv, 'player_create'),
    ).resolves.toBe(false)
  })

  it.each([
    { action: 'player_delete', hostname: 'localhost' },
    { action: 'player_create', hostname: 'unapproved.example.com' },
  ])('rejects mismatched verification metadata', async (result) => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ success: true, ...result }))

    await expect(
      verifyTurnstileRequest(createRequest(), env, 'player_create'),
    ).resolves.toBe(false)
  })

  it('rejects a missing or oversized token without calling Siteverify', async () => {
    await expect(
      verifyTurnstileRequest(createRequest(''), env, 'player_create'),
    ).resolves.toBe(false)
    await expect(
      verifyTurnstileRequest(createRequest('x'.repeat(2049)), env, 'player_create'),
    ).resolves.toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fails closed when Siteverify cannot be reached', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network unavailable'))

    await expect(
      verifyTurnstileRequest(createRequest(), env, 'player_create'),
    ).resolves.toBe(false)
  })
})
