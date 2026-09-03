export type TurnstileAction =
  | 'player_create'
  | 'player_update'
  | 'player_reset'
  | 'player_delete'
  | 'game_start'
  | 'game_complete'
  | 'game_abandon'
  | 'game_history'
  | 'statistics_read'

type TurnstileResult = {
  success?: unknown
  action?: unknown
  hostname?: unknown
}

const TOKEN_HEADER = 'X-Turnstile-Token'
const MAX_TOKEN_LENGTH = 2048

export async function verifyTurnstileRequest(
  request: Request,
  env: Env,
  expectedAction: TurnstileAction,
): Promise<boolean> {
  const token = request.headers.get(TOKEN_HEADER)
  const expectedHostnames = new Set(
    env.TURNSTILE_HOSTNAMES
      ?.split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  )

  if (
    !token
    || token.length > MAX_TOKEN_LENGTH
    || !env.TURNSTILE_SECRET
    || expectedHostnames.size === 0
  ) {
    return false
  }

  let result: TurnstileResult

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP') ?? '',
        }),
      },
    )

    if (!response.ok) return false
    result = await response.json() as TurnstileResult
  } catch {
    return false
  }

  return result.success === true
    && result.action === expectedAction
    && typeof result.hostname === 'string'
    && expectedHostnames.has(result.hostname)
}

export function turnstileForbiddenResponse(): Response {
  return Response.json(
    { error: 'Cloudflare could not verify this request.' },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  )
}
