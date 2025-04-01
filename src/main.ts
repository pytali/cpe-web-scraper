import * as fs from "node:fs";
import * as path from "node:path";
import { readIpsFromCsv } from "./util/CsvParser.ts";
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
const GRACEFUL_SHUTDOWN_TIMEOUT = WORKER_CONFIG.gracefulShutdownTimeout * 1000; // Convert to milliseconds

const devicesFilePath = 'devices.json';
const loginErrorFilePath = 'loginerror.json';

interface CsvRow {
    ip: string;
    [key: string]: string;
}

// Variable to control shutdown state
let isShuttingDown = false;
let shutdownTimer: NodeJS.Timeout | null = null;

// Function to force shutdown after timeout
function forceShutdown() {
    logger.error(`⚠️ Graceful shutdown timeout (${GRACEFUL_SHUTDOWN_TIMEOUT / 1000}s) reached. Forcing shutdown...`);
    process.exit(1);
}

// Function to handle graceful shutdown
async function handleGracefulShutdown(pool: WorkerPool, signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.warn(`🛑 Received signal ${signal}. Starting graceful shutdown...`);
    logger.info(`⏳ Waiting up to ${GRACEFUL_SHUTDOWN_TIMEOUT / 1000} seconds to complete tasks...`);

    // Configure timer to force shutdown
    shutdownTimer = setTimeout(forceShutdown, GRACEFUL_SHUTDOWN_TIMEOUT);

    try {
        // Wait for all ongoing tasks to complete
        await pool.drain();
        logger.info('✅ All tasks completed successfully.');
    } catch (error) {
        logger.error('❌ Error during shutdown:', error);
    } finally {
        // Clear timer if shutdown was successful
        if (shutdownTimer) {
            clearTimeout(shutdownTimer);
            shutdownTimer = null;
        }

        // Shutdown worker pool
        await pool.shutdown();
        logger.info('🏁 Application shut down successfully.');
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
                        console.error('❌ Error writing CSV:', err);
                        reject(err);
                        return;
                    }
                    fs.writeFileSync(csvFilePath, output);
                    logger.info(`✅ Processed IPs removed from CSV.`);
                    resolve();
                });
            })
            .on('error', (err) => {
                console.error('❌ Error reading CSV:', err);
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
                    logger.error(`❌ Failed: ${ip} - ${result.message}`);
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
                logger.error('❌ Error writing devices.json:' + error);
            }

            // Clear the loginerror.json file after processing
            fs.writeFileSync(loginErrorFilePath, JSON.stringify([], null, 2));
            logger.info(`✅ Completed retrying failed logins with user ${loginUser}.`);
        }
    }
};

/**
 * @async
 * @function
 * @description Main function to process IPs, configure devices, and update CSV.
 */
(async () => {
    const csvFilePath = path.join(__dirname, 'resources/radusuarios-bd-1743385861471.csv');
    const workersPath = path.join(__dirname, 'workers/worker.js');
    const ips = await readIpsFromCsv(csvFilePath);

    logger.info(`🔄 Started processing ${ips.length} IPs in batches of ${BATCH_SIZE}...`);

    const pool = new WorkerPool(workersPath, POOL_SIZE);

    // Register graceful shutdown handlers
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
            logger.info(`🚀 Processing batch: ${i / BATCH_SIZE + 1} (${batch.length} IPs)...`);

            const results = await pool.runTaskQueue(batch, DEVICE_CONFIG.loginUser[0]);

            if (isShuttingDown) break;

            // Store the processed results
            const processedIPs: Set<string> = new Set();
            const newConfiguredDevices: Set<string> = new Set();

            for (const { ip, result } of results) {
                if (result instanceof Error) {
                    logger.error(`❌ Failed: ${ip} - ${result.message}`);
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
                logger.error('❌ Error writing devices.json:' + error);
            }
            // Remove the processed IPs from the CSV in batch
            await processCSV(csvFilePath, processedIPs);
            await retryFailedLogins(pool, loginErrorFilePath, DEVICE_CONFIG.loginUser[1])

            logger.info(`✅ Batch ${i / BATCH_SIZE + 1} completed successfully.`);
        }
    } catch (error) {
        logger.error('❌ Error during processing:', error);
        await handleGracefulShutdown(pool, 'ERROR');
    }

    if (!isShuttingDown) {
        logger.info(`🏁 Process completed successfully.`);
        await pool.shutdown();
        process.exit(0);
    }
})();