/**
 * Handles the login process to a TR-069 device, including navigating to the
 * device's URL, attempting multiple passwords, and reporting login status.
 */
import puppeteer from 'puppeteer-extra';
import { Browser, BrowserContext, Page } from 'puppeteer';

export class Login {
    /**
     * @private
     * @type {Browser}
     */
    private browser!: Browser;

    /**
     * @private
     * @type {Page}
     */
    private page!: Page;

    /**
     * @private
     * @type {string}
     */
    private readonly url: string;

    /**
     * @private
     * @type {string}
     */
    private readonly username: string;

    /**
     * @private
     * @type {string[]}
     */
    private readonly passwords: string[];

    /**
     * @private
     * @type {BrowserContext}
     */
    private context!: BrowserContext;

    /**
     * Initializes the login process for a given URL, username, and list of passwords.
     * @param {string} url - The URL to the device's login page.
     * @param {string} username - The username to attempt during login.
     * @param {string[]} passwords - A list of potential passwords.
     */
    constructor(url: string, username: string, passwords: string[]) {
        this.url = url;
        this.username = username;
        this.passwords = passwords;
    }

    /**
     * Launches a headless browser, navigates to the device URL, and attempts
     * to log in with each provided password.
     * @async
     * @returns {Promise<{page: Page, login: boolean} | Error>} - Resolves with
     * an object containing the Puppeteer page and login status, or an Error if
     * loading the page or logging in fails.
     */
    async launch(): Promise<{page: Page, login: boolean} | Error> {
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--no-default-browser-check',
                '--ignore-certificate-errors',
                '--start-minimized',
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
            timeout: 15000
        });

        this.context = await this.browser.createBrowserContext();
        this.page = await this.context.newPage();

        try {
            const urlPage = await this.page.goto(this.url, { waitUntil: 'networkidle2', timeout: 7000 });
            if (!urlPage) {
                return new Error('Error loading page');
            }
        } catch (error) {
            return new Error(`Error loading page: ${error}`);
        }

        let login = false;

        // Dynamically check login fields and attempt passwords
        if (await this.page.$('#Frm_Username')) {
            for (const pass of this.passwords) {
                if (login) {
                    break;
                }

                await this.page.type('#Frm_Username', this.username);
                await this.page.type('#Frm_Password', pass);

                await Promise.all([
                    this.page.click('#LoginId'),
                ]);

                await new Promise(resolve => setTimeout(resolve, 2000));

                if (await this.page.$('#login_error_span') || await this.page.$('#errnote')) {
                    await this.page.$eval('#Frm_Username', el => (el as HTMLInputElement).value = '');
                    await this.page.$eval('#Frm_Password', el => (el as HTMLInputElement).value = '');
                    console.log('🚨 Invalid credentials for ZTE!');
                } else {
                    login = true;
                    console.log('✅ Logged into ZTE!');
                }
            }
        }

        return { page: this.page, login };
    }

    /**
     * Closes the current browser instance and frees its resources.
     * @async
     * @returns {Promise<void>} - Resolves when the browser is successfully closed.
     */
    async close(): Promise<void> {
        await this.browser.close();
    }
}