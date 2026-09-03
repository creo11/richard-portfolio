import {
  listPlayerStatistics,
} from '../../lib/dartsync/statisticsRepository'
import type { PlayerDatabase } from '../../lib/dartsync/playerRepository'
import {
  turnstileForbiddenResponse,
  verifyTurnstileRequest,
} from '../../lib/turnstile'

const responseHeaders = {
  'Cache-Control': 'no-store',
}

export async function handleListStatistics(
  database: PlayerDatabase,
): Promise<Response> {
  try {
    const players = await listPlayerStatistics(database)
    return Response.json({ players }, { headers: responseHeaders })
  } catch (error) {
    console.error(JSON.stringify({
      event: 'dartsync.statistics.read_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return Response.json(
      { error: 'Unable to load player statistics.' },
      { status: 500, headers: responseHeaders },
    )
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await verifyTurnstileRequest(request, env, 'statistics_read')) {
    return turnstileForbiddenResponse()
  }

  return handleListStatistics(env.DB)
}
