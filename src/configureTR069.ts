/**
 * Imports required modules and device-specific classes for TR-069 configuration.
 */
import { Login } from './auth/login.ts';
import { DeviceChecker } from './deviceChecker.ts';
import { F680 } from './devices/f680.ts';
import { F6600P } from './devices/f6600p.ts';
import * as fs from "node:fs";
import { DEVICE_CONFIG } from './config/index.ts';

interface ConfigureDevicesResult {
    type: string;
    user: string;
    vlan: string;
    pass: string;
    priority: string;
    service_list: string;
    name: string;
}

/**
 * Configures TR-069 devices based on the given IP address.
 * - Launches a browser and logs into the device.
 * - Detects the device model.
 * - Runs the appropriate configuration routine.
 * - Closes the browser instance upon completion.
 *
 * @async
 * @function configureDevices
 * @param {string} deviceIP - The IP address of the device to configure.
 * @param {string} loginUser - The username for device login.
 * @returns {Promise<ConfigureDevicesResult | Error | undefined>} Resolves with the configuration result or an Error object.
 */
export async function configureDevices(deviceIP: string, loginUser: string): Promise<ConfigureDevicesResult | Error | undefined> {

    /**
     * Validates the device IP address format.
     */
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(deviceIP)) {
        return new Error('❌ Invalid IP address format.');
    }

    /**
     * Validates the device IP address is not empty.
     */
    if (!deviceIP) {
        return new Error('❌ Device IP address is empty.');
    }
    /**
     * Validates the device IP address is not localhost.
     */
    if (deviceIP === 'localhost') {
        return new Error('❌ Device IP address cannot be localhost.');
    }


    const loginErrorFilePath = 'loginerror.json';


    /**
     * Creates a Login instance for the specified device IP using predefined credentials.
     */
    const login = new Login(`http://${deviceIP}:${DEVICE_CONFIG.port}`, loginUser, DEVICE_CONFIG.loginPassword);
    const page = await login.launch();

    // Check if login object is valid and if login was successful
    if (!(page instanceof Error) && !page.login) {
        await login.close();

        // Read existing login errors
        const loginErrors = fs.existsSync(loginErrorFilePath)
            ? JSON.parse(fs.readFileSync(loginErrorFilePath, 'utf-8'))
            : [];

        // Append the current IP address to the login errors
        loginErrors.push(deviceIP);

        // Write the updated login errors back to the file
        fs.writeFileSync(loginErrorFilePath, JSON.stringify(loginErrors, null, 2));

        return new Error('❌ Unable to login to the device.');
    }

    // Check for browser launch issues
    if (!page) {
        await login.close();
        return new Error('❌ Unable to launch the browser.');
    }

    if (page instanceof Error) {
        await login.close();
        return new Error('❌ Unable to launch the browser.');
    }

    /**
     * Detects the device type/model using a DeviceChecker instance.
     */
    const deviceChecker = new DeviceChecker(page.page);
    const detectedDevice = await deviceChecker.detectDevice();

    if (detectedDevice instanceof Error) {
        await login.close();
        return detectedDevice;
    }

    /**
     * Depending on the detected device, initialize and run its configuration routine.
     */
    if (detectedDevice === 'F680' || detectedDevice === 'F670L_OLD') {
        // console.log(detectedDevice);
        const device = new F680(page.page, detectedDevice);
        const result = await device.run();
        await login.close();
        return result;
    } else if (detectedDevice === 'F6600P' || detectedDevice === 'F670L') {
        console.log(detectedDevice);
        const device = new F6600P(page.page, detectedDevice);
        const result = await device.run();
        await login.close();
        return result;
    } else {
        console.error('❌ No compatible device detected.');
    }

    // Close the browser if no configuration routine matches
    await login.close();
    return new Error('❌ No compatible device detected.');
}