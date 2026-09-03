import {
  InvalidGameParticipantsError,
  startGame,
  type GameDatabase,
} from '../../lib/dartsync/gameRepository'
import {
  MAX_GAME_REQUEST_BYTES,
  validateStartGame,
} from '../../lib/dartsync/gameValidation'
import {
  turnstileForbiddenResponse,
  verifyTurnstileRequest,
} from '../../lib/turnstile'

const responseHeaders = {
  'Cache-Control': 'no-store',
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: responseHeaders })
}

export async function handleStartGame(
  request: Request,
  database: GameDatabase,
  createId: () => string = () => crypto.randomUUID(),
): Promise<Response> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415)
  }

  const contentLength = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_GAME_REQUEST_BYTES) {
    return jsonResponse({ error: 'Request body is too large.' }, 413)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Request body must contain valid JSON.' }, 400)
  }

  const input = validateStartGame(body)
  if (!input) {
    return jsonResponse({ error: 'Game type, options, or player order is invalid.' }, 400)
  }

  try {
    const game = await startGame(database, {
      id: createId(),
      ...input,
    })
    return jsonResponse({ game }, 201)
  } catch (error) {
    if (error instanceof InvalidGameParticipantsError) {
      return jsonResponse({ error: error.message }, 400)
    }

    console.error(JSON.stringify({
      event: 'dartsync.games.start_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return jsonResponse({ error: 'Unable to start game.' }, 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await verifyTurnstileRequest(request, env, 'game_start')) {
    return turnstileForbiddenResponse()
  }

  return handleStartGame(request, env.DB)
}
