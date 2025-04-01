/**
 * Imports the Puppeteer Page object.
 */
import { Page } from 'puppeteer';
import { logger } from './util/logger.ts';

/**
 * Represents a device checker with methods to detect device models and retrieve all elements.
 */
export class DeviceChecker {
    /**
     * Holds a Puppeteer Page instance or an Error.
     * @private
     * @type {Page|Error}
     */
    private page: Page | Error;

    /**
     * Initializes the DeviceChecker instance.
     * @param {Page|Error} page - A Puppeteer Page instance or an Error object.
     */
    constructor(page: Page | Error) {
        this.page = page;
    }

    /**
     * Attempts to detect the device model by evaluating DOM elements inside the current page.
     * @async
     * @returns {Promise<string|Error>} The detected model string or an Error if detection fails.
     */
    async detectDevice(): Promise<string | Error> {
        if (!(this.page instanceof Page)) {
            return new Error('❌ Page not found.');
        }

        const mainFrame = this.page.frames().find(frame => frame.name() === 'mainFrame');


        if (!mainFrame) {
            const modelF6600P = await this.page.evaluate(() => {
                const element = document.querySelector('#pdtVer');
                return element ? element.textContent?.trim() || '' : '';
            });

            if (modelF6600P && modelF6600P.includes('F6600P')) {
                logger.info(`✅ Detected device: ${modelF6600P}`);
                return 'F6600P';
            }

            if (modelF6600P && modelF6600P.includes('F670L')) {
                logger.info(`✅ Detected device: ${modelF6600P}`);
                return 'F670L';
            }

            if (modelF6600P && modelF6600P.includes('H196')) {
                logger.info(`✅ Detected device: ${modelF6600P}`);
                return 'H196';
            }

            if (modelF6600P && modelF6600P.includes('H199')) {
                logger.info(`✅ Detected device: ${modelF6600P}`);
                return 'H199';
            }

            if (modelF6600P && modelF6600P.includes('H3601')) {
                logger.info(`✅ Detected device: ${modelF6600P}`);
                return 'H3601';
            }

            return new Error('❌ Device detection failed.');

        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        const element = await mainFrame.$eval('#Frm_ModelName', el => el.textContent?.trim() || '');

        if (element && element.includes('F680')) {
            logger.info(`✅ Detected device: ${element}`);
            return 'F680';
        }

        if (element && element.includes('F670')) {
            logger.info(`✅ Detected device: ${element}`);
            return 'F670L_OLD';
        }

        return new Error('❌ Device detection failed.');
    }

    /**
     * Retrieves all HTML elements from the current page as strings.
     * @async
     * @returns {Promise<string[]>} An array of outerHTML strings for all elements on the page,
     * or an empty array if the page is invalid.
     */
    async getAllElements(): Promise<string[]> {
        if (this.page instanceof Page) {
            const elements = await this.page.evaluate(() => {
                const allElements = Array.from(document.querySelectorAll('*'));
                return allElements.map(element => element.outerHTML);
            });
            return elements;
        }
        return [];
    }
}