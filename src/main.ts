import * as fs from "node:fs";
import * as path from "node:path";
import { readIPColumnFromCSV } from "./util/CsvParser";
import { stringify } from 'csv-stringify';
import csvParser from 'csv-parser';
import WorkerPool from "./workers/WorkerPool";
import { DEVICE_CONFIG, WORKER_CONFIG } from "./config";

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


/**
 * Processes the CSV file to remove rows with processed IPs.
 *
 * @param {string} csvFilePath - The path to the CSV file.
 * @param {Set<string>} processedIPs - A set of IPs that have been processed.
 * @returns {Promise<void>} - A promise that resolves when the CSV processing is complete.
 */
const processCSV = (csvFilePath: string, processedIPs: Set<string>): Promise<void> => {
    return new Promise((resolve, reject) => {
        const remainingRows: any[] = [];
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
                    console.log(`✅ IPs processed remove on CSV.`);
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
            console.log(`🔄 Retrying failed logins with user ${loginUser}...`);
            const results = await pool.runTaskQueue(failedIPs, loginUser);
            const configuredDevices: Set<string> = fs.existsSync(devicesFilePath)
                ? new Set(JSON.parse(fs.readFileSync(devicesFilePath, 'utf-8')))
                : new Set();

            const newConfiguredDevices: Set<string> = new Set();

            for (const { ip, result } of results) {
                if (result instanceof Error) {
                    console.log(`❌ Fail: ${ip} - ${result.message}`);
                    continue;
                } else if (result && result.user) {
                    newConfiguredDevices.add(result.user);
                }
            }

            try {
                const updatedDevices = new Set([...configuredDevices, ...newConfiguredDevices]);
                fs.writeFileSync(devicesFilePath, JSON.stringify(Array.from(updatedDevices), null, 2));
                console.log('✅ devices.json updated.');
            } catch (error) {
                console.error('❌ Write error devices.json:', error);
            }

            // Clear the loginerror.json file after processing
            fs.writeFileSync(loginErrorFilePath, JSON.stringify([], null, 2));
            console.log(`✅ Retried failed logins with user ${loginUser}.`);
        }
    }
};

/**
 * @async
 * @function
 * @description Main function to process IPs, configure devices, and update CSV.
 */
(async () => {
    const csvFilePath = path.join(__dirname, 'resources/radusuarios-bd-1741705917176.csv');
    const workersPath = path.join(__dirname, 'workers/worker.js');
    const ips = await readIPColumnFromCSV(csvFilePath);

    console.log(`🔄 Initiated process on  ${ips.length} IPs in bulk of ${BATCH_SIZE}...`);

    const pool = new WorkerPool(workersPath, POOL_SIZE);

    for (let i = 0; i < ips.length; i += BATCH_SIZE) {
        // Load the configured devices from `devices.json`
        const configuredDevices: Set<string> = fs.existsSync(devicesFilePath)
            ? new Set(JSON.parse(fs.readFileSync(devicesFilePath, 'utf-8')))
            : new Set();

        const batch = ips.slice(i, i + BATCH_SIZE);
        console.log(`🚀 Bulk process: ${i / BATCH_SIZE + 1} (${batch.length} IPs)...`);

        const results = await pool.runTaskQueue(batch, DEVICE_CONFIG.loginUser[0]);

        // Store the processed results
        const processedIPs: Set<string> = new Set();
        const newConfiguredDevices: Set<string> = new Set();

        for (const { ip, result } of results) {
            if (result instanceof Error) {
                console.log(`❌ Fail: ${ip} - ${result.message}`);
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
            console.log('✅ devices.json updated.');
        } catch (error) {
            console.error('❌ Write error devices.json:', error);
        }
        // Remove the processed IPs from the CSV in batch
        await processCSV(csvFilePath, processedIPs);
        await retryFailedLogins(pool, loginErrorFilePath, DEVICE_CONFIG.loginUser[1])

        console.log(`✅ Batch ${i / BATCH_SIZE + 1} ok .`);


    }

    console.log(`🏁 Process finished.`);
})();