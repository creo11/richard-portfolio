import {
  PlayerNotFoundError,
  resetPlayerStats,
  type PlayerDatabase,
} from '../../../../lib/dartsync/playerRepository'
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

export async function handleResetPlayerStats(
  database: PlayerDatabase,
  playerId: string,
): Promise<Response> {
  try {
    const player = await resetPlayerStats(database, playerId)
    return jsonResponse({ player }, 200)
  } catch (error) {
    if (error instanceof PlayerNotFoundError) {
      return jsonResponse({ error: error.message }, 404)
    }

    console.error(JSON.stringify({
      event: 'dartsync.players.stats_reset_failed',
      playerId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return jsonResponse({ error: 'Unable to reset player statistics.' }, 500)
  }
}

export const onRequestPost: PagesFunction<Env, 'id'> = async (context) => {
  const playerId = context.params.id

  if (typeof playerId !== 'string') {
    return jsonResponse({ error: 'Invalid player ID.' }, 400)
  }

  if (!await verifyTurnstileRequest(context.request, context.env, 'player_reset')) {
    return turnstileForbiddenResponse()
  }

  return handleResetPlayerStats(context.env.DB, playerId)
}
