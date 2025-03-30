import { Worker } from 'worker_threads';
import { logger } from '../util/logger.ts';

class WorkerPool {
    private workerPath: string;
    private poolSize: number;
    private taskQueue: string[] = [];
    private activeWorkers: Set<Worker> = new Set();
    private isShuttingDown: boolean = false;

    /**
     * Creates an instance of WorkerPool.
     * @param {string} workerPath - The path to the worker script.
     * @param {number} poolSize - The number of workers in the pool.
     */
    constructor(workerPath: string, poolSize: number) {
        this.workerPath = workerPath;
        this.poolSize = poolSize;
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

            worker.on('message', (msg) => {
                if (msg.result && msg.result.message) {
                    logger.error(`[Worker Error] ${msg.ip}: ${msg.result.message}`);
                    resolve(msg)
                } else {
                    logger.info(`[Worker Done] ${msg.ip}: ${JSON.stringify(msg.result)}`);
                    resolve(msg);
                }
            });

            worker.on('error', reject);
            worker.on('exit', (code) => {
                this.activeWorkers.delete(worker);
                if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
            });

            this.activeWorkers.add(worker);
        });
    }

    /**
     * Aguarda a conclusão de todas as tarefas em andamento
     * @returns {Promise<void>} - Uma promise que resolve quando todas as tarefas são concluídas
     */
    async drain(): Promise<void> {
        this.isShuttingDown = true;
        logger.info(`Aguardando conclusão de ${this.activeWorkers.size} workers ativos...`);

        // Aguarda a conclusão de todos os workers ativos
        while (this.activeWorkers.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * Encerra todos os workers e limpa o pool
     * @returns {Promise<void>} - Uma promise que resolve quando todos os workers são encerrados
     */
    async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        // Termina todos os workers ativos
        for (const worker of this.activeWorkers) {
            worker.terminate();
        }

        this.activeWorkers.clear();
        this.taskQueue = [];

        logger.info('Worker pool encerrado com sucesso.');
    }

    /**
     * Runs the task queue, processing IPs with the worker pool.
     * @param {string[]} ips - The list of IP addresses to be processed.
     * @param {string} userLogin - The username for device login.
     * @returns {Promise<{ ip: string; result: any }[]>} - A promise that resolves with the results of the processed IPs.
     */
    async runTaskQueue(ips: string[], userLogin: string): Promise<{ ip: string; result: any }[]> {
        if (this.isShuttingDown) {
            throw new Error('Worker pool está em processo de shutdown');
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