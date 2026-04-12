import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { eventRoutes } from './routes/events';
import { hostRoutes } from './routes/host';
import { paymentRoutes, everyPayWebhookHandler } from './routes/payments';
import { deleteExpiredEvents, syncEventExpirations } from './services/eventCleanup';

// #region agent log
fetch('http://127.0.0.1:7648/ingest/f1af423a-5dbc-47ac-b418-353d9ec9b372',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2329f0'},body:JSON.stringify({sessionId:'2329f0',location:'index.ts:before-dotenv',message:'About to call dotenv.config()',data:{hasOpenAIKey:!!process.env.OPENAI_API_KEY},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
// #endregion

dotenv.config();

// #region agent log
fetch('http://127.0.0.1:7648/ingest/f1af423a-5dbc-47ac-b418-353d9ec9b372',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2329f0'},body:JSON.stringify({sessionId:'2329f0',location:'index.ts:after-dotenv',message:'dotenv.config() completed',data:{hasOpenAIKey:!!process.env.OPENAI_API_KEY},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
// #endregion

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.post(
  '/api/payments/webhook',
  express.urlencoded({ extended: true }),
  express.json(),
  everyPayWebhookHandler,
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Start server
const PORT = Number(process.env.PORT) || 4000;
const EVENT_CLEANUP_SCHEDULE = process.env.EVENT_CLEANUP_SCHEDULE || '0 0 * * *';
const EVENT_CLEANUP_TIMEZONE = process.env.EVENT_CLEANUP_TIMEZONE || 'UTC';

const runExpiredEventCleanup = async (reason: 'startup' | 'scheduled') => {
  try {
    const syncResult = await syncEventExpirations();
    const result = await deleteExpiredEvents();
    console.log('[EVENT_CLEANUP] completed', {
      reason,
      syncedEventCount: syncResult.updatedCount,
      checkedEventCount: syncResult.checkedCount,
      checkedAt: result.checkedAt.toISOString(),
      deletedCount: result.deletedCount,
      cleanupFailureCount: result.cleanupFailures.length,
    });

    if (result.cleanupFailures.length > 0) {
      console.warn('[EVENT_CLEANUP] cleanup failures', result.cleanupFailures);
    }
  } catch (error) {
    console.error('[EVENT_CLEANUP] failed', { reason, error });
  }
};

app.listen(PORT, '0.0.0.0', () => {
// #region agent log
  fetch('http://127.0.0.1:7648/ingest/f1af423a-5dbc-47ac-b418-353d9ec9b372',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2329f0'},body:JSON.stringify({sessionId:'2329f0',location:'index.ts:app-listen',message:'Server started successfully',data:{port:PORT},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
// #endregion
  console.log(`Server running on port ${PORT}`);
  console.log('[EVENT_CLEANUP] scheduler configured', {
    schedule: EVENT_CLEANUP_SCHEDULE,
    timezone: EVENT_CLEANUP_TIMEZONE,
  });

  void runExpiredEventCleanup('startup');
});

cron.schedule(
  EVENT_CLEANUP_SCHEDULE,
  () => {
    void runExpiredEventCleanup('scheduled');
  },
  {
    timezone: EVENT_CLEANUP_TIMEZONE,
  }
);
