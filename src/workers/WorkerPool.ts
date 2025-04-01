import { Worker } from 'worker_threads';
import { logger } from '../util/logger.ts';
import { WORKER_CONFIG } from '../config/index.ts';

class WorkerPool {
    private workerPath: string;
    private poolSize: number;
    private taskQueue: string[] = [];
    private activeWorkers: Set<Worker> = new Set();
    private isShuttingDown: boolean = false;
    private readonly workerTTL: number;
    private readonly gracefulShutdownTimeout: number;
    private workerTimers: Map<Worker, NodeJS.Timeout> = new Map();
    private shutdownTimer: NodeJS.Timeout | null = null;

    /**
     * Creates an instance of WorkerPool.
     * @param {string} workerPath - The path to the worker script.
     * @param {number} poolSize - The number of workers in the pool.
     */
    constructor(workerPath: string, poolSize: number) {
        this.workerPath = workerPath;
        this.poolSize = poolSize;
        this.workerTTL = WORKER_CONFIG.ttl * 1000; // Convert seconds to milliseconds
        this.gracefulShutdownTimeout = WORKER_CONFIG.gracefulShutdownTimeout * 1000;
    }

    /**
     * Terminates a worker and cleans up its associated resources
     * @param {Worker} worker - The worker to terminate
     * @param {string} reason - The reason for termination
     */
    private terminateWorker(worker: Worker, reason: string): void {
        const timer = this.workerTimers.get(worker);
        if (timer) {
            clearTimeout(timer);
            this.workerTimers.delete(worker);
        }
        this.activeWorkers.delete(worker);
        worker.terminate();
        logger.warn(`Worker terminated: ${reason}`);
    }

    /**
     * Runs a worker to process a given IP.
     * @param {string} ip - The IP address to be processed by the worker.
     * @param {string} loginUser - The username for device login.
     * @returns {Promise<{ ip: string; result: any }>} - A promise that resolves with the IP and the result.
     */
    private runWorker(ip: string, loginUser: string): Promise<{ ip: string; result: any }> {
        return new Promise((resolve, reject) => {
            const worker = new Worker(this.workerPath, { workerData: { ip, loginUser } });

            // Configure TTL timer
            const ttlTimer = setTimeout(() => {
                this.terminateWorker(worker, `TTL exceeded (${this.workerTTL / 1000} seconds) for IP ${ip}`);
                resolve({
                    ip,
                    result: {
                        message: `Operation cancelled: time limit of ${this.workerTTL / 1000} seconds exceeded`
                    }
                });
            }, this.workerTTL);

            this.workerTimers.set(worker, ttlTimer);

            worker.on('message', (msg) => {
                if (msg.result && msg.result.message) {
                    logger.error(`[Worker Error] ${msg.ip}: ${msg.result.message}`);
                    resolve(msg)
                } else {
                    logger.info(`[Worker Done] ${msg.ip}: ${JSON.stringify(msg.result)}`);
                    resolve(msg);
                }
            });

            worker.on('error', (error) => {
                this.terminateWorker(worker, `Error in worker for IP ${ip}`);
                reject(error);
            });

            worker.on('exit', (code) => {
                this.terminateWorker(worker, `Worker exited with code ${code}`);
                if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
            });

            this.activeWorkers.add(worker);
        });
    }

    /**
     * Waits for all ongoing tasks to complete with timeout
     * @returns {Promise<void>} - A promise that resolves when all tasks are completed or timeout is reached
     */
    async drain(): Promise<void> {
        this.isShuttingDown = true;
        logger.info(`Waiting for ${this.activeWorkers.size} active workers to complete (timeout: ${this.gracefulShutdownTimeout / 1000}s)...`);

        return new Promise((resolve) => {
            // Timer to force shutdown after timeout
            this.shutdownTimer = setTimeout(() => {
                logger.warn(`Graceful shutdown timeout reached (${this.gracefulShutdownTimeout / 1000}s). Forcing shutdown...`);
                this.forceShutdown();
                resolve();
            }, this.gracefulShutdownTimeout);

            // Periodically check if all workers have finished
            const checkInterval = setInterval(() => {
                if (this.activeWorkers.size === 0) {
                    clearInterval(checkInterval);
                    if (this.shutdownTimer) clearTimeout(this.shutdownTimer);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Forces shutdown of all workers
     */
    private forceShutdown(): void {
        for (const worker of this.activeWorkers) {
            this.terminateWorker(worker, 'Forcing shutdown due to timeout');
        }
        this.activeWorkers.clear();
        this.taskQueue = [];
    }

    /**
     * Shuts down all workers and cleans up the pool
     * @returns {Promise<void>} - A promise that resolves when all workers are shut down
     */
    async shutdown(): Promise<void> {
        logger.info('Starting shutdown process...');
        await this.drain();

        if (this.shutdownTimer) {
            clearTimeout(this.shutdownTimer);
            this.shutdownTimer = null;
        }

        logger.info('Worker pool successfully shut down.');
    }

    /**
     * Runs the task queue, processing IPs with the worker pool.
     * @param {string[]} ips - The list of IP addresses to be processed.
     * @param {string} userLogin - The username for device login.
     * @returns {Promise<{ ip: string; result: any }[]>} - A promise that resolves with the results of the processed IPs.
     */
    async runTaskQueue(ips: string[], userLogin: string): Promise<{ ip: string; result: any }[]> {
        if (this.isShuttingDown) {
            throw new Error('Worker pool is in shutdown process');
        }

        this.taskQueue.push(...ips);
        const results: { ip: string; result: any }[] = [];

        while ((this.taskQueue.length > 0 || this.activeWorkers.size > 0) && !this.isShuttingDown) {
            while (this.activeWorkers.size < this.poolSize && this.taskQueue.length > 0 && !this.isShuttingDown) {
                const ip = this.taskQueue.shift()!;
                this.runWorker(ip, userLogin).then((result) => results.push(result));
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return results;
    }
}

export default WorkerPool;