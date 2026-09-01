import {
  createPlayer,
  DuplicatePlayerNameError,
  listPlayers,
  type PlayerDatabase,
} from '../../lib/dartsync/playerRepository'
import {
  MAX_PLAYER_REQUEST_BYTES,
  validatePlayerDetails,
} from '../../lib/dartsync/playerValidation'
import {
  turnstileForbiddenResponse,
  verifyTurnstileRequest,
} from '../../lib/turnstile'

const responseHeaders = {
  'Cache-Control': 'no-store',
}

export async function handleListPlayers(database: PlayerDatabase): Promise<Response> {
  try {
    const players = await listPlayers(database)

    return Response.json(
      { players },
      { headers: responseHeaders },
    )
  } catch (error) {
    console.error(JSON.stringify({
      event: 'dartsync.players.read_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }))

    return Response.json(
      { error: 'Unable to load players.' },
      { status: 500, headers: responseHeaders },
    )
  }
}

export const onRequestGet: PagesFunction<Env> = ({ env }) => (
  handleListPlayers(env.DB)
)

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: responseHeaders,
  })
}

export async function handleCreatePlayer(
  request: Request,
  database: PlayerDatabase,
  createId: () => string = () => crypto.randomUUID(),
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
    const player = await createPlayer(database, {
      id: createId(),
      ...input,
    })

    return jsonResponse({ player }, 201)
  } catch (error) {
    if (error instanceof DuplicatePlayerNameError) {
      return jsonResponse({ error: error.message }, 409)
    }

    console.error(JSON.stringify({
      event: 'dartsync.players.create_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return jsonResponse({ error: 'Unable to create player.' }, 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await verifyTurnstileRequest(request, env, 'player_create')) {
    return turnstileForbiddenResponse()
  }

  return handleCreatePlayer(request, env.DB)
}
