/**
 * Represents a F680 device and provides methods to configure WAN, DNS, and TR-069
 * through Puppeteer-based interactions.
 */
import { Frame, Page } from 'puppeteer';
import { checkLoginInAllServices } from "../services/Search.service.ts";
import { ClearmacInAllServices } from "../services/ClearMac.service.ts";
import { TR069_CONFIG } from '../config/index.ts';
import { logger } from '../util/logger';

export class F680 {
    /**
     * The Puppeteer page instance used to interact with the device's web UI.
     */
    private page: Page;

    /**
     * The identifier or name of the device.
     */
    private readonly device: string;

    /**
     * Creates an instance of F680.
     * @param {Page} page - Puppeteer page instance.
     * @param {string} device - The device identifier.
     */
    constructor(page: Page, device: string) {
        this.page = page;
        this.device = device;
    }

    /**
     * Checks whether a WAN with the specified name is configured.
     * @private
     * @async
     * @param {Frame} element - The frame element to check.
     * @returns {Promise<boolean>} True if WAN is found, otherwise false.
     */
    private async checkWan(element: Frame) {
        try {
            const wans = await element.$$eval('#Frm_WANCName0 option', options => {
                return options.map(option => ({
                    value: option.getAttribute('value'),
                    text: option.textContent?.trim()
                }));
            });

            // Check if Internet_TR069 or omci WAN already exists
            const hasTargetWan = wans.some(wan =>
                wan.text && (
                    wan.text === 'Internet_TR069' ||
                    wan.text.toLowerCase().includes('omci')
                )
            );

            if (!hasTargetWan) {
                logger.info('❌ WAN Internet_TR069 not configured');
                return false;
            }

            logger.info('✅ WAN Internet_TR069 found');
            return true;
        } catch (error) {
            logger.error(`❌ Error checking WANs: ${error}`);
            return false;
        }
    }

    /**
     * Ensures that a checkbox element is checked.
     * @private
     * @async
     * @param {Frame} iframe - The frame containing the checkbox.
     * @param {string} selector - The selector for the checkbox element.
     */
    private async ensureCheckboxChecked(iframe: Frame, selector: string) {
        await iframe.waitForSelector(selector, { visible: true });
        const isChecked = await iframe.$eval(selector, el => (el as HTMLInputElement).checked);
        if (!isChecked) {
            await iframe.click(selector);
        }
    }

    /**
     * Configures the WAN on the F680 device.
     * @async
     * @returns {Promise<{type: string, user: string, vlan: string, pass: string, priority: string, service_list: string, name: string} | Error>} The WAN config or an Error.
     */
    async configureWAN() {
        logger.info(`🌎️ Configuring WAN for ${this.device}...`);

        const LinkMode = {
            'PPP': 'PPPoE', 'IP': 'DHCP'
        };

        const UserAuth: {
            type: string,
            user: string,
            vlan: string,
            pass: string,
            priority: string,
            service_list: string,
            name: string
        } = {
            type: 'PPPoE',
            user: 'multipro',
            vlan: '0',
            pass: '0000',
            priority: '7',
            service_list: '3',
            name: 'Internet_TR069'
        };

        const mainFrame = this.page.frames().find(frame => frame.name() === 'mainFrame');

        if (!mainFrame) {
            return new Error('❌ Main frame not found');
        }

        await mainFrame.waitForSelector('#Frm_WANCName0');

        const wanName = await this.checkWan(mainFrame);

        if (wanName) {
            logger.info('WAN already configured!');
            return UserAuth;
        }

        await mainFrame.waitForSelector('#Frm_WANCName0');

        const wanValue = await mainFrame.$eval('#Frm_WANCName0', el => (el as HTMLInputElement).value);

        if (wanValue.toLowerCase().includes('omci')) {
            logger.info('WAN OK');
            return UserAuth;
        }

        UserAuth.user = await mainFrame.$eval('#Frm_Username', (el => (el as HTMLInputElement).value));
        const linkType = await mainFrame.$eval('#Frm_LinkMode', (el => (el as HTMLInputElement).value));

        if (linkType === 'PPP') {
            UserAuth.type = LinkMode.PPP;
        } else {
            UserAuth.type = LinkMode.IP;
        }

        const userLogin = await checkLoginInAllServices(UserAuth.user);

        if (userLogin instanceof Error) {
            await ClearmacInAllServices(UserAuth.user);
        }

        return UserAuth;
    }

    /**
     * Checks if DNS is configured properly and updates the DNS settings if needed.
     * @async
     * @returns {Promise<void>} No return value.
     */
    async checkDNS() {
        logger.info(`🔍 Checking DNS for ${this.device}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mainFrame = this.page.frames().find(frame => frame.name() === 'mainFrame');

        if (!mainFrame) {
            logger.error('❌ Main frame not found');
            return;
        }

        await mainFrame.waitForSelector('#Frm_DNSServer1');
        await mainFrame.waitForSelector('#Frm_DNSServer2');

        const dns1 = await mainFrame.$eval('#Frm_DNSServer1', el => (el as HTMLInputElement).value);
        const dns2 = await mainFrame.$eval('#Frm_DNSServer2', el => (el as HTMLInputElement).value);

        if (dns1 !== '177.221.56.3' || dns2 !== '177.221.56.10') {
            logger.error('🚨 DNS is not configured correctly!');
            logger.info(`🔧 Configuring DNS for ${this.device}...`);

            await mainFrame.$eval('#Frm_DNSServer1', el => (el as HTMLInputElement).value = '');
            await mainFrame.type('#Frm_DNSServer1', '177.221.56.3');

            await mainFrame.$eval('#Frm_DNSServer2', el => (el as HTMLInputElement).value = '');
            await mainFrame.type('#Frm_DNSServer2', '177.221.56.10');

            await mainFrame.click('#Btn_Submit');
            logger.info(`✅ DNS configured successfully on ${this.device}!`);
        }

        logger.info(`✅ DNS configured correctly on ${this.device}!`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    /**
     * Configures TR-069 settings on the device.
     * @async
     * @returns {Promise<void>} No return value.
     */
    async configureTR069() {
        logger.info(`🔧 Configuring TR-069 for ${this.device}...`);

        const mainFrame = this.page.frames().find(frame => frame.name() === 'mainFrame');

        if (!mainFrame) {
            logger.error('❌ Main frame not found');
            return;
        }

        await mainFrame.waitForSelector('#Frm_URL');
        await mainFrame.$eval('#Frm_URL', el => (el as HTMLInputElement).value = '');
        await mainFrame.type('#Frm_URL', TR069_CONFIG.url);

        await mainFrame.waitForSelector('#Frm_Username');
        await mainFrame.$eval('#Frm_Username', el => (el as HTMLInputElement).value = '');
        await mainFrame.type('#Frm_Username', TR069_CONFIG.username);

        await mainFrame.waitForSelector('#Frm_Password');
        await mainFrame.$eval('#Frm_Password', el => (el as HTMLInputElement).value = '');
        await mainFrame.type('#Frm_Password', TR069_CONFIG.password);

        await mainFrame.waitForSelector('#Frm_PeriodicInformEnable');
        await this.ensureCheckboxChecked(mainFrame, '#Frm_PeriodicInformEnable');

        await mainFrame.waitForSelector('#Frm_PeriodicInformInterval');
        await mainFrame.$eval('#Frm_PeriodicInformInterval', el => (el as HTMLInputElement).value = '');
        await mainFrame.type('#Frm_PeriodicInformInterval', '60');

        await mainFrame.click('#Btn_Submit');
        logger.info(`✅ TR-069 configured successfully on ${this.device}!`);
    }

    /**
     * Runs the complete configuration process for the device.
     * @async
     * @returns {Promise<{type: string, user: string, vlan: string, pass: string, priority: string, service_list: string, name: string} | Error>} The configuration result or an Error.
     */
    async run() {
        try {
            const mainFrame = this.page.frames().find(frame => frame.name() === 'mainFrame');

            if (!mainFrame) {
                return new Error('❌ Main frame not found');
            }

            await mainFrame.waitForSelector('#menu_network');
            await mainFrame.click('#menu_network');

            await mainFrame.waitForSelector('#menu_wan');
            await mainFrame.click('#menu_wan');

            const wanConfig = await this.configureWAN();

            if (wanConfig instanceof Error) {
                return wanConfig;
            }

            await mainFrame.waitForSelector('#menu_dns');
            await mainFrame.click('#menu_dns');

            await this.checkDNS();

            await mainFrame.waitForSelector('#menu_tr069');
            await mainFrame.click('#menu_tr069');

            await this.configureTR069();

            return wanConfig;
        } catch (error) {
            logger.error(`❌ Error configuring device: ${error}`);
            return new Error('❌ Error configuring device');
        }
    }
}