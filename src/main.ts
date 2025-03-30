import * as fs from "node:fs";
import * as path from "node:path";
import { readIPColumnFromCSV } from "./util/CsvParser.ts";
import { stringify } from 'csv-stringify';
import csvParser from 'csv-parser';
import WorkerPool from "./workers/WorkerPool.ts";
import { DEVICE_CONFIG, WORKER_CONFIG } from "./config/index.ts";
import { logger } from "./util/logger.ts";

if (WORKER_CONFIG.batchSize < 1 || WORKER_CONFIG.poolSize < 1) {
    throw new Error('❌ Batch size and pool size must be greater than 0');
}
if (!WORKER_CONFIG.batchSize || !WORKER_CONFIG.poolSize) {
    throw new Error('❌ Batch size and pool size must be defined');
}

const BATCH_SIZE = WORKER_CONFIG.batchSize; // Number of IPs to process in each batch
const POOL_SIZE = WORKER_CONFIG.poolSize; // Number of workers in the worker pool

const devicesFilePath = 'devices.json';
const loginErrorFilePath = 'loginerror.json';

interface CsvRow {
    ip: string;
    [key: string]: string;
}

// Variável para controlar o estado de shutdown
let isShuttingDown = false;

// Função para lidar com o graceful shutdown
async function handleGracefulShutdown(pool: WorkerPool, signal: string) {
    if (isShuttingDown) return;

    isShuttingDown = true;
    logger.warn(`🛑 Recebido sinal ${signal}. Iniciando graceful shutdown...`);

    try {
        // Aguarda a conclusão de todas as tarefas em andamento
        await pool.drain();
        logger.info('✅ Todas as tarefas foram concluídas com sucesso.');
    } catch (error) {
        logger.error('❌ Erro durante o shutdown:', error);
    } finally {
        // Encerra o pool de workers
        await pool.shutdown();
        logger.info('🏁 Aplicação encerrada com sucesso.');
        process.exit(0);
    }
}

/**
 * Processes the CSV file to remove rows with processed IPs.
 *
 * @param {string} csvFilePath - The path to the CSV file.
 * @param {Set<string>} processedIPs - A set of IPs that have been processed.
 * @returns {Promise<void>} - A promise that resolves when the CSV processing is complete.
 */
const processCSV = (csvFilePath: string, processedIPs: Set<string>): Promise<void> => {
    return new Promise((resolve, reject) => {
        const remainingRows: CsvRow[] = [];
        fs.createReadStream(csvFilePath)
            .pipe(csvParser())
            .on('data', (row) => {
                if (!processedIPs.has(row.ip)) {
                    remainingRows.push(row);
                }
            })
            .on('end', () => {
                stringify(remainingRows, { header: true }, (err, output) => {
                    if (err) {
                        console.error('❌ Error on write CSV:', err);
                        reject(err);
                        return;
                    }
                    fs.writeFileSync(csvFilePath, output);
                    logger.info(`✅ IPs processed remove on CSV.`);
                    resolve();
                });
            })
            .on('error', (err) => {
                console.error('❌ Error to read CSV:', err);
                reject(err);
            });
    });
};

/**
 * @async
 * @function
 * @description Retries failed logins from the login error file.
 * @param {WorkerPool} pool - The worker pool instance.
 * @param {string} loginErrorFilePath - The path to the login error file.
 * @param {string} loginUser - The username for login attempts.
 */
const retryFailedLogins = async (pool: WorkerPool, loginErrorFilePath: string, loginUser: string) => {
    if (fs.existsSync(loginErrorFilePath)) {
        const failedIPs: string[] = JSON.parse(fs.readFileSync(loginErrorFilePath, 'utf-8'));
        if (failedIPs.length > 0) {
            logger.info(`🔄 Retrying failed logins with user ${loginUser}...`);
            const results = await pool.runTaskQueue(failedIPs, loginUser);
            const configuredDevices: Set<string> = fs.existsSync(devicesFilePath)
                ? new Set(JSON.parse(fs.readFileSync(devicesFilePath, 'utf-8')))
                : new Set();

            const newConfiguredDevices: Set<string> = new Set();

            for (const { ip, result } of results) {
                if (result instanceof Error) {
                    logger.error(`❌ Fail: ${ip} - ${result.message}`);
                    continue;
                } else if (result && result.user) {
                    newConfiguredDevices.add(result.user);
                }
            }

            try {
                const updatedDevices = new Set([...configuredDevices, ...newConfiguredDevices]);
                fs.writeFileSync(devicesFilePath, JSON.stringify(Array.from(updatedDevices), null, 2));
                logger.info('✅ devices.json updated.');
            } catch (error) {
                logger.error('❌ Write error devices.json:' + error);
            }

            // Clear the loginerror.json file after processing
            fs.writeFileSync(loginErrorFilePath, JSON.stringify([], null, 2));
            logger.info(`✅ Retried failed logins with user ${loginUser}.`);
        }
    }
};

/**
 * @async
 * @function
 * @description Main function to process IPs, configure devices, and update CSV.
 */
(async () => {
    const csvFilePath = path.join(__dirname, 'resources/radusuarios-bd-1743046670958.csv');
    const workersPath = path.join(__dirname, 'workers/worker.js');
    const ips = await readIPColumnFromCSV(csvFilePath);

    logger.info(`🔄 Initiated process on  ${ips.length} IPs in bulk of ${BATCH_SIZE}...`);

    const pool = new WorkerPool(workersPath, POOL_SIZE);

    // Registra os handlers de graceful shutdown
    process.on('SIGTERM', () => handleGracefulShutdown(pool, 'SIGTERM'));
    process.on('SIGINT', () => handleGracefulShutdown(pool, 'SIGINT'));
    process.on('SIGUSR2', () => handleGracefulShutdown(pool, 'SIGUSR2')); // Nodemon restart

    try {
        for (let i = 0; i < ips.length && !isShuttingDown; i += BATCH_SIZE) {
            // Load the configured devices from `devices.json`
            const configuredDevices: Set<string> = fs.existsSync(devicesFilePath)
                ? new Set(JSON.parse(fs.readFileSync(devicesFilePath, 'utf-8')))
                : new Set();

            const batch = ips.slice(i, i + BATCH_SIZE);
            logger.info(`🚀 Bulk process: ${i / BATCH_SIZE + 1} (${batch.length} IPs)...`);

            const results = await pool.runTaskQueue(batch, DEVICE_CONFIG.loginUser[0]);

            if (isShuttingDown) break;

            // Store the processed results
            const processedIPs: Set<string> = new Set();
            const newConfiguredDevices: Set<string> = new Set();

            for (const { ip, result } of results) {
                if (result instanceof Error) {
                    logger.error(`❌ Fail: ${ip} - ${result.message}`);
                    processedIPs.add(ip)
                    continue;
                } else if (result && result.user) {
                    newConfiguredDevices.add(result.user);
                    processedIPs.add(ip);
                }
            }

            // Save the configured devices in batch to `devices.json`
            try {
                const updatedDevices = new Set([...configuredDevices, ...newConfiguredDevices]);
                fs.writeFileSync(devicesFilePath, JSON.stringify(Array.from(updatedDevices), null, 2));
                logger.info('✅ devices.json updated.');
            } catch (error) {
                logger.error('❌ Write error devices.json:' + error);
            }
            // Remove the processed IPs from the CSV in batch
            await processCSV(csvFilePath, processedIPs);
            await retryFailedLogins(pool, loginErrorFilePath, DEVICE_CONFIG.loginUser[1])

            logger.info(`✅ Batch ${i / BATCH_SIZE + 1} ok .`);
        }
    } catch (error) {
        logger.error('❌ Erro durante o processamento:', error);
        await handleGracefulShutdown(pool, 'ERROR');
    }

    if (!isShuttingDown) {
        logger.info(`🏁 Process finished.`);
        await pool.shutdown();
        process.exit(0);
    }
})();