import {
  abandonGame,
  GameAlreadyFinishedError,
  GameNotFoundError,
  type GameDatabase,
} from '../../../../lib/dartsync/gameRepository'
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

export async function handleAbandonGame(
  database: GameDatabase,
  gameId: string,
): Promise<Response> {
  try {
    await abandonGame(database, gameId)
    return new Response(null, { status: 204, headers: responseHeaders })
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      return jsonResponse({ error: error.message }, 404)
    }
    if (error instanceof GameAlreadyFinishedError) {
      return jsonResponse({ error: error.message }, 409)
    }

    console.error(JSON.stringify({
      event: 'dartsync.games.abandon_failed',
      gameId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return jsonResponse({ error: 'Unable to abandon game.' }, 500)
  }
}

export const onRequestPost: PagesFunction<Env, 'id'> = async (context) => {
  const gameId = context.params.id
  if (typeof gameId !== 'string') {
    return jsonResponse({ error: 'Invalid game ID.' }, 400)
  }

  if (!await verifyTurnstileRequest(context.request, context.env, 'game_abandon')) {
    return turnstileForbiddenResponse()
  }

  return handleAbandonGame(context.env.DB, gameId)
}
