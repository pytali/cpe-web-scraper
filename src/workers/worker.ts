/**
 * Worker thread for device configuration
 *
 * This module runs in a Node.js worker thread to configure TR-069 devices.
 * It receives IP address information from the parent thread, calls the configuration
 * function, and posts the result back to the parent thread.
 *
 * @module worker
 */
import { parentPort, workerData } from 'worker_threads';
import { configureDevices } from "../configureTR069.ts";

/**
 * Interface representing the data passed to the worker
 * @interface WorkerData
 * @property {string} ip - The IP address of the device to configure
 * @property {string} loginUser - The username for device login
 */
interface WorkerData {
    ip: string;
    loginUser: string;
}

/**
 * @async
 * @function
 * @description Self-executing async function that handles the worker's main process
 * 1. Validates that parentPort is available
 * 2. Extracts the IP address from the worker data
 * 3. Calls configureDevices with the IP address
 * 4. Posts the result back to the parent thread
 * 5. Handles any errors by posting the error message back to the parent
 */
(async () => {
    try {
        if (!parentPort) {
            throw new Error("parentPort is not available.");
        }

        const data: WorkerData = workerData as WorkerData;
        const result = await configureDevices(data.ip, data.loginUser);

        // Send successful result back to parent thread
        parentPort.postMessage({ ip: data.ip, result });
    } catch (error) {
        // Send error information back to parent thread
        parentPort?.postMessage({ error: (error as Error).message });
    }
})();