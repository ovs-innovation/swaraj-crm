export const initSentry = async (app) => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
    if (Sentry.setupExpressErrorHandler) Sentry.setupExpressErrorHandler(app);
    console.log('Sentry enabled');
  } catch (err) {
    console.error('Sentry init skipped:', err.message);
  }
};

export const captureError = async (err) => {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureException(err);
  } catch {
    // ignore
  }
};
