import {
  completeGame,
  GameAlreadyFinishedError,
  GameNotFoundError,
  InvalidGameResultsError,
  type GameDatabase,
} from '../../../../lib/dartsync/gameRepository'
import {
  MAX_GAME_REQUEST_BYTES,
  validateCompleteGame,
} from '../../../../lib/dartsync/gameValidation'
import {
  turnstileForbiddenResponse,
  verifyTurnstileRequest,
} from '../../../../lib/turnstile'

const responseHeaders = {
  'Cache-Control': 'no-store',
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: responseHeaders })
}

export async function handleCompleteGame(
  request: Request,
  database: GameDatabase,
  gameId: string,
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

  const input = validateCompleteGame(body)
  if (!input) {
    return jsonResponse({ error: 'Winner or participant results are invalid.' }, 400)
  }

  try {
    await completeGame(database, {
      gameId,
      ...input,
    })
    return new Response(null, { status: 204, headers: responseHeaders })
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      return jsonResponse({ error: error.message }, 404)
    }
    if (error instanceof GameAlreadyFinishedError) {
      return jsonResponse({ error: error.message }, 409)
    }
    if (error instanceof InvalidGameResultsError) {
      return jsonResponse({ error: error.message }, 400)
    }

    console.error(JSON.stringify({
      event: 'dartsync.games.complete_failed',
      gameId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return jsonResponse({ error: 'Unable to complete game.' }, 500)
  }
}

export const onRequestPost: PagesFunction<Env, 'id'> = async (context) => {
  const gameId = context.params.id
  if (typeof gameId !== 'string') {
    return jsonResponse({ error: 'Invalid game ID.' }, 400)
  }

  if (!await verifyTurnstileRequest(context.request, context.env, 'game_complete')) {
    return turnstileForbiddenResponse()
  }

  return handleCompleteGame(context.request, context.env.DB, gameId)
}
