/**
 * Represents a H199 device and provides methods to configure WAN, DNS, and TR-069
 * through Puppeteer-based interactions.
 */
import { Page } from 'puppeteer';
import { TR069_CONFIG } from '../config/index.ts';
import { logger } from '../util/logger.ts';

export class H199 {
    /**
     * The Puppeteer page instance used to interact with the device's web UI.
     */
    private page: Page;

    /**
     * The identifier or name of the device.
     */
    private device: string | null;

    /**
     * Creates an instance of H199.
     * @param {Page | Error} page - Puppeteer page or an Error if unavailable.
     * @param {string | null} device - The device identifier.
     * @throws {Error} If `page` is not an instance of Page.
     */
    constructor(page: Page | Error, device: string | null) {
        if (page instanceof Page) {
            this.page = page;
        } else {
            throw new Error('❌ Page not found.');
        }
        this.device = device;
    }

    /**
     * Checks whether a WAN with the specified name is configured by iterating through possible indices.
     * @async
     * @returns {Promise<boolean>} True if WAN is found, otherwise false.
     */
    async checkWAN(): Promise<boolean> {

        if (await this.page.$eval('#Servlist_TR069\\:0', (el => (el as HTMLInputElement).checked))) {

            return true
        }

        return false

    }

    /**
     * Configures the WAN on the H199 device. It determines the WAN type, checks user login info,
     * and clears the MAC if necessary. Returns the configuration details or an Error.
     * @async
     * @returns {Promise<{type: string, user: string, vlan: string, pass: string, priority: string, service_list: string, name: string} | Error>} The WAN config or an Error.
     */
    async configureWAN() {
        logger.info(` 🌎️ Configuring WAN for ${this.device}...`);

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
        await new Promise(resolve => setTimeout(resolve, 1000));

        await this.page.waitForSelector('#internet');
        await this.page.click('#internet');
        await this.page.waitForSelector('#internetConfig');
        await this.page.click('#internetConfig');
        await this.page.waitForSelector('#instName_Internet\\:0');
        await this.page.click('#instName_Internet\\:0');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const wanName = await this.checkWAN();


        if (wanName) {
            logger.info('WAN already configured!');
            return UserAuth;
        }

        if (!wanName) {
            await this.page.click('#Servlist_TR069\\:0');
            await new Promise(resolve => setTimeout(resolve, 100));
            await this.page.click('#Btn_apply_internet\\:0');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        UserAuth.user = await this.page.$eval('#UserName\\:0', (el => (el as HTMLInputElement).value));
        const linkType = await this.page.$eval('#linkMode\\:0', (el => (el as HTMLInputElement).value));

        UserAuth.type = LinkMode[linkType as keyof typeof LinkMode];

        UserAuth.vlan = await this.page.$eval('#VLANID\\:0', (el => (el as HTMLInputElement).value));
        UserAuth.priority = await this.page.$eval('#Priority\\:0', (el => (el as HTMLInputElement).value));

        logger.info(`✅ WAN configured successfully on ${this.device}!`);
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

        await this.page.waitForSelector('#localnet');
        await this.page.click('#localnet');
        await this.page.waitForSelector('#lanConfig');
        await this.page.click('#lanConfig');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.page.click('#DHCPBasicCfgBar');
        await this.page.waitForSelector('#sub_IPAddr0\\:DHCPBasicCfg', { visible: true });

        const checkDNS: { dns1: string[], dns2: string[] } = {
            dns1: [],
            dns2: []
        };

        const isISPDNS = await this.page.$eval('#DnsServerSource1', el => (el as HTMLInputElement).checked);

        if (!isISPDNS) {
            for (const i of [0, 1, 2, 3]) {
                if (i === 3) {
                    checkDNS.dns1.push(await this.page.$eval(`#sub_DNSServer1${i}`, el => (el as HTMLInputElement).value));
                    checkDNS.dns2.push(await this.page.$eval(`#sub_DNSServer2${i}`, el => (el as HTMLInputElement).value));
                } else {
                    checkDNS.dns1.push(await this.page.$eval(`#sub_DNSServer1${i}`, el => (el as HTMLInputElement).value) + '.');
                    checkDNS.dns2.push(await this.page.$eval(`#sub_DNSServer2${i}`, el => (el as HTMLInputElement).value) + '.');
                }
            }
            if (checkDNS.dns1.join('') !== '177.221.56.3' || checkDNS.dns2.join('') !== '177.221.56.10') {
                const DNS = {
                    dns1: ['177', '221', '56', '3'],
                    dns2: ['177', '221', '56', '10']
                };

                logger.error('🚨 DNS is not configured correctly!');
                logger.info(`🔧 Configuring DNS for ${this.device}...`);

                await this.page.click('#DnsServerSource0');

                for (const i of [0, 1, 2, 3]) {
                    await this.page.$eval(`#sub_DNSServer1${i}`, el => (el as HTMLInputElement).value = '');
                    await this.page.type(`#sub_DNSServer1${i}`, DNS.dns1[i]);
                    await this.page.$eval(`#sub_DNSServer2${i}`, el => (el as HTMLInputElement).value = '');
                    await this.page.type(`#sub_DNSServer2${i}`, DNS.dns2[i]);
                }

                await this.page.click('#Btn_apply_DHCPBasicCfg');
                logger.info(`✅ DNS configured successfully on ${this.device}!`);
            }
        }

        logger.info(`✅ DNS configured correctly on ${this.device}!`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    /**
     * Configures TR-069 settings, pointing the device to a remote management server.
     * @async
     * @returns {Promise<void>} No return value.
     */
    async configureTR069() {
        logger.info(`⚙️ Configuring TR-069 for ${this.device}...`);

        await this.page.click('#mgrAndDiag');
        await this.page.waitForSelector('#remoteMgr');
        await this.page.click('#remoteMgr');
        await new Promise(resolve => setTimeout(resolve, 1000));


        await this.page.$eval('#URL', el => (el as HTMLInputElement).value = '');
        await this.page.type('#URL', TR069_CONFIG.url);
        await this.page.$eval('#UserName', el => (el as HTMLInputElement).value = '');
        await this.page.type('#UserName', TR069_CONFIG.username);
        await this.page.$eval('#UserPassword', el => (el as HTMLInputElement).value = '');
        await this.page.type('#UserPassword', TR069_CONFIG.password);
        await this.page.$eval('#ConnectionRequestUsername', el => (el as HTMLInputElement).value = '');
        await this.page.type('#ConnectionRequestUsername', TR069_CONFIG.connectionRequestUsername);
        await this.page.$eval('#ConnectionRequestPassword', el => (el as HTMLInputElement).value = '');
        await this.page.type('#ConnectionRequestPassword', TR069_CONFIG.connectionRequestPassword);
        await this.page.$eval('#PeriodicInformInterval', el => (el as HTMLInputElement).value = '');
        await this.page.type('#PeriodicInformInterval', String(TR069_CONFIG.periodicInformInterval));

        await this.page.click('#PeriodicInformEnable1');
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.page.click('#SupportCertAuth1');
        await new Promise(resolve => setTimeout(resolve, 100));


        await this.page.click('#Btn_apply_TR069BasicConf');
        await new Promise(resolve => setTimeout(resolve, 100));

        logger.info(`✅ TR-069 configured successfully on ${this.device}!`);
    }

    /**
     * Logs out by removing WAN configurations if they exist.
     * @private
     * @async
     * @returns {Promise<void>} No return value.
     */
    private async logout(): Promise<void> {
        await this.page.click('#internet');
        await this.page.waitForSelector('#internetConfig');
        await this.page.click('#internetConfig');
        await this.page.waitForSelector('#instName_Internet\\:0');

        const ids = ['#template_Internet_1', '#template_Internet_2', '#template_Internet_3'];
        let elementExists = false;

        for (const id of ids) {
            if (await this.page.$(id) !== null) {
                elementExists = true;
                break;
            }
        }

        if (elementExists) {
            logger.info('Deleting WANs...');
            await this.page.click('#instDelete_Internet\\:0');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        logger.info('Finished! Logging out...');
    }

    /**
    * Runs the H199 configuration process, setting up WAN, TR-069, and DNS.
     * Rolls back configuration if user is 'multipro'.
     * @async
     * @returns {Promise<object | Error | undefined>} The final WAN config or an Error.
     */
    async run() {
        try {
            await this.configureTR069();
            await this.checkDNS();
            const wan = await this.configureWAN();

            if (!(wan instanceof Error) && wan.user === 'multipro') {
                return wan;
            }
            // await this.logout();
            return wan;
        } catch (error) {
            logger.error('❌ An error occurred:' + error);
        }
    }
}