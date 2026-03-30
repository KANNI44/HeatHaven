function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}

// Central error handler for sync/async route failures.
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  // eslint-disable-next-line no-console
  console.error('API error:', err);
  res.status(status).json({ success: false, message });
}

module.exports = { errorHandler, notFound };

