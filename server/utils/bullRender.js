import { Queue, Worker } from 'bullmq';

const connection = () => {
  const url = new URL(process.env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
  };
};

let queue = null;

export const startBullWorker = async () => {
  const conn = connection();
  queue = new Queue('video-render', { connection: conn });
  const worker = new Worker(
    'video-render',
    async (job) => {
      const { processVideoJob } = await import('./videoQueue.js');
      await processVideoJob(job.data.id);
    },
    { connection: conn, concurrency: 1 }
  );
  worker.on('failed', (job, err) => console.error('Bull render failed', job?.id, err.message));
};

export const addBullJob = async (id) => {
  if (!queue) throw new Error('Bull queue not started');
  await queue.add('render', { id: String(id) }, { removeOnComplete: 100, removeOnFail: 50 });
};
