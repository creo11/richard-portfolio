import {
  DuplicatePlayerNameError,
  PlayerNotFoundError,
  softDeletePlayer,
  updatePlayer,
  type PlayerDatabase,
} from '../../../lib/dartsync/playerRepository'
import {
  MAX_PLAYER_REQUEST_BYTES,
  validatePlayerDetails,
} from '../../../lib/dartsync/playerValidation'
import {
  turnstileForbiddenResponse,
  verifyTurnstileRequest,
} from '../../../lib/turnstile'

const responseHeaders = {
  'Cache-Control': 'no-store',
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: responseHeaders })
}

export async function handleUpdatePlayer(
  request: Request,
  database: PlayerDatabase,
  playerId: string,
): Promise<Response> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415)
  }

  const contentLength = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_PLAYER_REQUEST_BYTES) {
    return jsonResponse({ error: 'Request body is too large.' }, 413)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Request body must contain valid JSON.' }, 400)
  }

  const input = validatePlayerDetails(body)
  if (input === null) {
    return jsonResponse({
      error: 'Name is required and must be 80 characters or fewer. Description must be 240 characters or fewer.',
    }, 400)
  }

  try {
    const player = await updatePlayer(database, {
      id: playerId,
      ...input,
    })

    return jsonResponse({ player }, 200)
  } catch (error) {
    if (error instanceof DuplicatePlayerNameError) {
      return jsonResponse({ error: error.message }, 409)
    }

    if (error instanceof PlayerNotFoundError) {
      return jsonResponse({ error: error.message }, 404)
    }

    console.error(JSON.stringify({
      event: 'dartsync.players.update_failed',
      playerId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return jsonResponse({ error: 'Unable to update player.' }, 500)
  }
}

export const onRequestPatch: PagesFunction<Env, 'id'> = async (context) => {
  const playerId = context.params.id

  if (typeof playerId !== 'string') {
    return jsonResponse({ error: 'Invalid player ID.' }, 400)
  }

  if (!await verifyTurnstileRequest(context.request, context.env, 'player_update')) {
    return turnstileForbiddenResponse()
  }

  return handleUpdatePlayer(context.request, context.env.DB, playerId)
}

export async function handleDeletePlayer(
  database: PlayerDatabase,
  playerId: string,
): Promise<Response> {
  try {
    await softDeletePlayer(database, playerId)
    return new Response(null, { status: 204, headers: responseHeaders })
  } catch (error) {
    if (error instanceof PlayerNotFoundError) {
      return jsonResponse({ error: error.message }, 404)
    }

    console.error(JSON.stringify({
      event: 'dartsync.players.delete_failed',
      playerId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return jsonResponse({ error: 'Unable to delete player.' }, 500)
  }
}

export const onRequestDelete: PagesFunction<Env, 'id'> = async (context) => {
  const playerId = context.params.id

  if (typeof playerId !== 'string') {
    return jsonResponse({ error: 'Invalid player ID.' }, 400)
  }

  if (!await verifyTurnstileRequest(context.request, context.env, 'player_delete')) {
    return turnstileForbiddenResponse()
  }

  return handleDeletePlayer(context.env.DB, playerId)
}
