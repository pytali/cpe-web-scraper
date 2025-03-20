import { Worker } from 'worker_threads';

class WorkerPool {
    private workerPath: string;
    private poolSize: number;
    private taskQueue: string[] = [];
    private activeWorkers: Set<Worker> = new Set();

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
                if(msg.result && msg.result.message) {
                    console.log(`[Worker Error] ${msg.ip}:`, msg.result.message);
                    resolve(msg)
                } else {
                    console.log(`[Worker Done] ${msg.ip}:`, msg.result);
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
     * Runs the task queue, processing IPs with the worker pool.
     * @param {string[]} ips - The list of IP addresses to be processed.
     * @param {string} userLogin - The username for device login.
     * @returns {Promise<{ ip: string; result: any }[]>} - A promise that resolves with the results of the processed IPs.
     */
    async runTaskQueue(ips: string[], userLogin: string): Promise<{ ip: string; result: any }[]> {
        this.taskQueue.push(...ips);
        const results: { ip: string; result: any }[] = [];

        while (this.taskQueue.length > 0 || this.activeWorkers.size > 0) {
            while (this.activeWorkers.size < this.poolSize && this.taskQueue.length > 0) {
                const ip = this.taskQueue.shift()!;
                this.runWorker(ip, userLogin).then((result) => results.push(result));
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return results;
    }
}

export default WorkerPool;