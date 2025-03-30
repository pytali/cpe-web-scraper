/**
 * Represents a F6600P device and provides methods to configure WAN, DNS, and TR-069
 * through Puppeteer-based interactions.
 */
import { Page } from 'puppeteer';
import { checkLoginInAllServices } from "../services/Search.service";
import { ClearmacInAllServices } from "../services/ClearMac.service";
import { TR069_CONFIG } from '../config/index.ts';
import { logger } from '../util/logger.ts';

export class F6600P {
    /**
     * The Puppeteer page instance used to interact with the device's web UI.
     */
    private page: Page;

    /**
     * The identifier or name of the device.
     */
    private device: string | null;

    /**
     * Creates an instance of F6600P.
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
     * @param {string} wanName - The desired WAN name.
     * @returns {Promise<boolean>} True if WAN is found, otherwise false.
     */
    async checkWAN(wanName: string): Promise<boolean> {
        let count = 0;
        for (const it of [0, 1, 2, 3, 4]) {
            try {
                const wan = await this.page.$eval(`#instName_Internet\\:${it}`, el => (el as HTMLInputElement).title);
                if (wan === wanName) {
                    count++;
                    return true;
                }
                if (wan.toLowerCase().includes('voip')) {
                    count++;
                    return true;
                }
                if (wan.toLowerCase().includes('omci')) {
                    count++;
                    return true;
                }
                if (wan.toLowerCase().includes('tr069')) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    count++;
                    return true;
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                logger.error(`Error checking WAN for index ${it}`);
            }
        }
        return false;
    }

    /**
     * Configures the WAN on the F6600P device. It determines the WAN type, checks user login info,
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

        await this.page.click('#internet');
        await this.page.waitForSelector('#internetConfig');
        await this.page.click('#internetConfig');
        await this.page.waitForSelector('#instName_Internet\\:0');

        const wanName = await this.checkWAN(UserAuth.name);

        if (wanName) {
            logger.info('WAN already configured!');
            return UserAuth;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        await this.page.click('#instName_Internet\\:0');

        if ((await this.page.$eval('#WANCName\\:0', (el => (el as HTMLInputElement).value))).includes('omci')) {
            logger.info('WAN OK');
            return UserAuth;
        }

        UserAuth.user = await this.page.$eval('#UserName\\:0', (el => (el as HTMLInputElement).value));
        const linkType = await this.page.$eval('#linkMode\\:0', (el => (el as HTMLInputElement).value));

        if (linkType !== 'PPP') {
            logger.info('IPOE CONFIGURED');
            return UserAuth;
        }

        UserAuth.type = LinkMode[linkType as keyof typeof LinkMode];
        const loginResult = await checkLoginInAllServices(UserAuth.user);

        if (loginResult instanceof Error) {
            return loginResult;
        }

        UserAuth.pass = loginResult.senha;
        UserAuth.vlan = await this.page.$eval('#VLANID\\:0', (el => (el as HTMLInputElement).value));
        UserAuth.priority = await this.page.$eval('#Priority\\:0', (el => (el as HTMLInputElement).value));

        await this.page.click('#addInstBar_Internet');
        await this.page.waitForSelector('#WANCName\\:1');
        await this.page.type('#WANCName\\:1', UserAuth.name);
        await this.page.type('#Password\\:1', UserAuth.pass);
        await this.page.type('#UserName\\:1', UserAuth.user);
        await this.page.click('#VlanEnable1\\:1');
        await this.page.select('#ServList\\:1', '3');
        await this.page.select('#Priority\\:1', UserAuth.priority);
        await this.page.type('#VLANID\\:1', UserAuth.vlan);

        const clearMac = await ClearmacInAllServices(loginResult.id);

        if (clearMac instanceof Error) {
            logger.error(clearMac.message);
        }

        await this.page.click('#Btn_apply_internet\\:1');
        await new Promise(resolve => setTimeout(resolve, 3000));

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
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.page.waitForSelector('#dns');
                await this.page.click('#dns');
                await this.page.waitForSelector('#LocalDnsServerBar');
                await this.page.click('#LocalDnsServerBar');

                for (const i of [0, 1, 2, 3]) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await this.page.$eval(`#sub_SerIPAddress1${i}`, el => (el as HTMLInputElement).value = '');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await this.page.type(`#sub_SerIPAddress1${i}`, DNS.dns1[i]);
                    await this.page.$eval(`#sub_SerIPAddress2${i}`, el => (el as HTMLInputElement).value = '');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await this.page.type(`#sub_SerIPAddress2${i}`, DNS.dns2[i]);
                }

                await this.page.click('#Btn_apply_LocalDnsServer');
                logger.info(`✅ DNS configured successfully on ${this.device}!`);
            }
        }

        logger.info(`✅ DNS configured correctly on ${this.device}!`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    /**
     * Configures TR-069 settings, pointing the device to a remote management server.
     * @async
     * @param {string | Error} wan - The name of the WAN or an Error.
     * @returns {Promise<void>} No return value.
     */
    async configureTR069(wan: string | Error) {
        logger.info(`⚙️ Configuring TR-069 for ${this.device}...`);

        await this.page.click('#mgrAndDiag');
        await this.page.waitForSelector('#remoteMgr');
        await this.page.click('#remoteMgr');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const wanListValue = await this.page.$eval('#DefaultWan', (el, wanName) => {
            const selectElement = el as HTMLSelectElement;
            const option = Array.from(selectElement.options).find(opt => opt.title === wanName);
            return option ? option.value : null;
        }, wan);

        if (wanListValue) {
            await this.page.select('#DefaultWan', wanListValue);
        } else {
            // no WAN found to select
        }

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
        await this.page.click('#RemoteUpgradeCertAuth1');
        await new Promise(resolve => setTimeout(resolve, 100));

        await this.page.click('#Btn_apply_TR069BasicConf');
        await new Promise(resolve => setTimeout(resolve, 1200));

        logger.info(`✅ TR-069 configured successfully on ${this.device}!`);
    }

    /**
     * Logs out by removing WAN configurations if they exist.
     * @private
     * @async
     * @returns {Promise<void>} No return value.
     */
    async #logout() {
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
     * Runs the F6600P configuration process, setting up WAN, TR-069, and DNS.
     * Rolls back configuration if user is 'multipro'.
     * @async
     * @returns {Promise<object | Error | undefined>} The final WAN config or an Error.
     */
    async run() {
        try {
            const wan = await this.configureWAN();
            await this.configureTR069(wan.name);
            await this.checkDNS();

            if (!(wan instanceof Error) && wan.user === 'multipro') {
                return wan;
            }
            await this.#logout();
            return wan;
        } catch (error) {
            logger.error('❌ An error occurred:' + error);
        }
    }
}