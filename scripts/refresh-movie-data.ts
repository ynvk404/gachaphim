import { readFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { refreshActressData } from '../src/server/jav-crawler/crawler';
import { paths } from '../src/server/jav-crawler/store';

const startedAt = Date.now();
const stamp = () => new Date().toISOString();
const elapsed = () => `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
const describeError = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);
const log = (message: string) =>
  console.error(`[data:refresh] ${stamp()} ${message}`);

async function readDiagnostic(path: string, label: string) {
  try {
    log(`${label}: ${await readFile(path, 'utf8')}`);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    log(`${label}: unavailable${code ? ` (${code})` : ''}`);
  }
}

async function reportProgress() {
  await readDiagnostic(`${paths.publicRoot}/status.json`, 'progress');
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.once(signal, () => {
    log(`received ${signal} after ${elapsed()}; terminating`);
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
  });
}

process.on('uncaughtExceptionMonitor', (error, origin) =>
  log(`uncaught exception (${origin}): ${describeError(error)}`),
);
process.on('unhandledRejection', (reason) =>
  log(`unhandled rejection: ${describeError(reason)}`),
);
process.on('warning', (warning) =>
  log(`Node warning: ${describeError(warning)}`),
);
process.on('exit', (code) =>
  log(`process exiting with code ${code} after ${elapsed()}`),
);

log(
  `starting pid=${process.pid} host=${hostname()} node=${process.version} platform=${process.platform}/${process.arch} cwd=${process.cwd()}`,
);
const progressTimer = setInterval(() => void reportProgress(), 30_000);
progressTimer.unref();

try {
  const success = await refreshActressData(true);
  log(`refresh completed success=${success} after ${elapsed()}`);

  if (!success) {
    await readDiagnostic(`${paths.publicRoot}/status.json`, 'last status');
    await readDiagnostic(paths.lockPath, 'refresh lock');
    process.exitCode = 1;
  }
} catch (error) {
  log(`fatal error after ${elapsed()}: ${describeError(error)}`);
  await readDiagnostic(`${paths.publicRoot}/status.json`, 'last status');
  await readDiagnostic(paths.lockPath, 'refresh lock');
  process.exitCode = 1;
} finally {
  clearInterval(progressTimer);
}
