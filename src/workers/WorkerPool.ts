import { Worker } from 'worker_threads';
import { logger } from '../util/logger.ts';

class WorkerPool {
    private workerPath: string;
    private poolSize: number;
    private taskQueue: string[] = [];
    private activeWorkers: Set<Worker> = new Set();
    private isShuttingDown: boolean = false;
    private readonly WORKER_TTL = 30000; // 30 segundos em milissegundos
    private workerTimers: Map<Worker, NodeJS.Timeout> = new Map();

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
     * Termina um worker e limpa seus recursos associados
     * @param {Worker} worker - O worker a ser terminado
     * @param {string} reason - O motivo do término
     */
    private terminateWorker(worker: Worker, reason: string): void {
        const timer = this.workerTimers.get(worker);
        if (timer) {
            clearTimeout(timer);
            this.workerTimers.delete(worker);
        }
        this.activeWorkers.delete(worker);
        worker.terminate();
        logger.warn(`Worker terminado: ${reason}`);
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

            // Configura o timer de TTL
            const ttlTimer = setTimeout(() => {
                this.terminateWorker(worker, `TTL excedido (${this.WORKER_TTL}ms) para IP ${ip}`);
                resolve({
                    ip,
                    result: {
                        message: `Operação cancelada: tempo limite de ${this.WORKER_TTL / 1000} segundos excedido`
                    }
                });
            }, this.WORKER_TTL);

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
                this.terminateWorker(worker, `Erro no worker para IP ${ip}`);
                reject(error);
            });

            worker.on('exit', (code) => {
                this.terminateWorker(worker, `Worker encerrado com código ${code}`);
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
            this.terminateWorker(worker, 'Shutdown do pool');
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