export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = resolveAviatorLimit(query.limit)

  setHeader(event, 'cache-control', 'no-store, max-age=0')

  const history = await fetchAviatorHistory(limit)

  if (history.warning) {
    setResponseStatus(event, 200)
  }

  return {
    success: true,
    data: history.data,
    source: history.source,
    warning: history.warning,
    proxiedAt: new Date().toISOString(),
    limit,
  }
})
