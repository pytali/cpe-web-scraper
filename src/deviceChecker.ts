/**
 * Imports the Puppeteer Page object.
 */
import { Page } from 'puppeteer';

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
        if (this.page instanceof Page) {
            const modelF680 = await this.page.evaluate(() => {
                const iframe = document.getElementById("mainFrame") as HTMLIFrameElement | null;
                if (!iframe) {
                    console.error('Iframe with ID "mainFrame" not found.');
                    return '';
                }
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!iframeDoc) {
                    console.error('Iframe document not accessible.');
                    return '';
                }
                const element = iframeDoc.querySelector('#Frm_ModelName');
                return element ? element.textContent?.trim() || '' : '';
            });

            if (modelF680 && modelF680.includes('F680')) {
                console.log(`✅ Detected device: ${modelF680}`);
                return 'F680';
            }

            if (modelF680 && modelF680.includes('F670')) {
                console.log(`✅ Detected device: ${modelF680}`);
                return 'F670L_OLD';
            }

            const modelF6600P = await this.page.evaluate(() => {
                const element = document.querySelector('#pdtVer');
                return element ? element.textContent?.trim() || '' : '';
            });

            if (modelF6600P && modelF6600P.includes('F6600P')) {
                console.log(`✅ Detected device: ${modelF6600P}`);
                return 'F6600P';
            }

            if (modelF6600P && modelF6600P.includes('F670L')) {
                console.log(`✅ Detected device: ${modelF6600P}`);
                return 'F670L';
            }
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