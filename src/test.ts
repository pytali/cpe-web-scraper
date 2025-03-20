import * as fs from 'node:fs';
import {ClearmacInAllServices} from "./services/ClearMac.service";
import {checkLoginInAllServices} from "./services/Search.service";
import WorkerPool from "./workers/WorkerPool";
import * as path from "node:path";

const LOGINs = JSON.parse(fs.readFileSync('../devices.json', 'utf-8'));


(async () => {
    const workersPath = path.join(__dirname, 'workers/worker.js');

    const pool = new WorkerPool(workersPath, 10);


    for (const login of LOGINs) {
        try {
            const loginResult = await checkLoginInAllServices(login);

            if (loginResult instanceof Error) {
                console.error(`❌ Error to login ${loginResult.message}`);
                continue;
            }
            await ClearmacInAllServices(loginResult.id)

        } catch (err) {
            console.error("Error to process login:", err);
        }

    }
})();
