/**
 * Test script for checking and clearing MAC addresses for a list of logins.
 * Reads logins from a JSON file and processes them through the worker pool.
 */
import * as fs from 'node:fs';
import { ClearmacInAllServices } from "./services/ClearMac.service.ts";
import { checkLoginInAllServices } from "./services/Search.service.ts";
import WorkerPool from "./workers/WorkerPool.ts";
import * as path from "node:path";

// Read logins from devices.json
const LOGINs = JSON.parse(fs.readFileSync('../devices.json', 'utf-8'));

(async () => {
    // Initialize worker pool with 10 workers
    const workersPath = path.join(__dirname, 'workers/worker.js');
    const pool = new WorkerPool(workersPath, 10);

    // Process each login
    for (const login of LOGINs) {
        try {
            const loginResult = await checkLoginInAllServices(login);

            if (loginResult instanceof Error) {
                console.error(`❌ Error logging in: ${loginResult.message}`);
                continue;
            }
            await ClearmacInAllServices(loginResult.id);

        } catch (err) {
            console.error("Error processing login:", err);
        }
    }
})();
