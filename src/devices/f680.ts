import { Frame, Page } from 'puppeteer';
import { checkLoginInAllServices } from "../services/Search.service.ts";
import { ClearmacInAllServices } from "../services/ClearMac.service.ts";
import { TR069_CONFIG } from '../config/index.ts';
import { logger } from '../util/logger';

export class F680 {
    private page: Page;

    private readonly device: string;

    constructor(page: Page, device: string) {
        this.page = page;
        this.device = device;
    }

    private async checkWan(element: Frame) {
        try {
            const wans = await element.$$eval('#Frm_WANCName0 option', options => {
                return options.map(option => ({
                    value: option.getAttribute('value'),
                    text: option.textContent?.trim()
                }));
            });

            // Verifica se já existe um WAN Internet_TR069 ou omci
            const hasTargetWan = wans.some(wan =>
                wan.text && (
                    wan.text === 'Internet_TR069' ||
                    wan.text.toLowerCase().includes('omci')
                )
            );

            if (!hasTargetWan) {
                logger.info('❌ WAN Internet_TR069 não configurado.');
                return false;
            }

            logger.info('✅ WAN Internet_TR069 encontrado.');
            return true;
        } catch (error) {
            logger.error(`❌ Erro ao verificar WANs: ${error}`);
            return false;
        }
    }

    async configureWan() {
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

        const iframe = this.page.frames().find(frame => frame.name() === 'mainFrame');
        if (!iframe) {
            logger.error('❌ Iframe with name "mainFrame" not found.');
            return UserAuth;
        }

        await iframe.waitForSelector('#Fnt_mmNet');
        await iframe.click('#Fnt_mmNet');

        await iframe.waitForNavigation({ waitUntil: 'networkidle2' });
        await iframe.waitForSelector('#Frm_WANCName0');

        await new Promise(resolve => setTimeout(resolve, 2000));


        // Busca todos os WANs disponíveis
        const wans = await iframe.$$eval('#Frm_WANCName0 option', options => {
            return options.map(option => ({
                value: option.getAttribute('value'),
                text: option.textContent?.trim()
            }));
        });

        // Procura por um WAN existente que não seja Internet_TR069
        const existingWan = wans.find(wan =>
            wan.value &&
            wan.value !== '-1' &&
            wan.text &&
            !wan.text.includes('Internet_TR069') &&
            !wan.text.includes('omci')
        );

        // Se encontrou um WAN existente, seleciona ele para configuração
        if (existingWan && existingWan.value) {
            logger.info(`Selecionando WAN existente: ${existingWan.text}`);
            await iframe.select('#Frm_WANCName0', existingWan.value);
        } else {
            logger.info('Nenhum WAN existente encontrado para configuração');
            return UserAuth;
        }

        await iframe.waitForNavigation({ waitUntil: 'networkidle2' });

        await new Promise(resolve => setTimeout(resolve, 2000));

        await iframe.waitForSelector('#Frm_UserName');

        const wanChecker = await this.checkWan(iframe);

        if (wanChecker) {
            const linkType = await iframe.$eval('#Frm_linkMode', (el => (el as HTMLInputElement).value));
            logger.info('WAN already configured.');
            UserAuth.type = LinkMode[linkType as keyof typeof LinkMode];
            return UserAuth;
        }

        UserAuth.user = await iframe.$eval('#Frm_UserName', (el => (el as HTMLInputElement).value));
        const linkType = await iframe.$eval('#Frm_linkMode', (el => (el as HTMLInputElement).value));

        if (linkType !== 'PPP') {
            logger.info('IPOE CONFIGURED');
            UserAuth.vlan = await iframe.$eval('#Frm_VLANID', (el => (el as HTMLInputElement).value));
            UserAuth.priority = await iframe.$eval('#Frm_Priority', (el => (el as HTMLInputElement).value));
            await new Promise(resolve => setTimeout(resolve, 500));
            await iframe.select('#Frm_WANCName0', "-1");
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iframe.type('#Frm_WANCName1', UserAuth.name);
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.click('#Frm_WBDMode');
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.select('#Frm_ServList', '3');
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.select('#Frm_linkMode', 'IP');
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.select('#Frm_Priority', UserAuth.priority);
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.type('#Frm_VLANID', UserAuth.vlan);
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.select('#Frm_IsAuto', '1');
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.select('#Frm_Prefix', 'DHCP');
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.click('#Frm_IsPdAddr');
            await new Promise(resolve => setTimeout(resolve, 100));
            await iframe.click('#Btn_Add');
            await iframe.waitForNavigation({ waitUntil: 'networkidle2' });

            await new Promise(resolve => setTimeout(resolve, 1000));

            UserAuth.user = 'IPOE';

            return UserAuth;
        }

        UserAuth.type = LinkMode[linkType as keyof typeof LinkMode];
        const loginResult = await checkLoginInAllServices(UserAuth.user);

        if (loginResult instanceof Error) {
            return loginResult;
        }

        UserAuth.pass = loginResult.senha;
        UserAuth.vlan = await iframe.$eval('#Frm_VLANID', (el => (el as HTMLInputElement).value));
        UserAuth.priority = await iframe.$eval('#Frm_Priority', (el => (el as HTMLInputElement).value));

        await iframe.select('#Frm_WANCName0', "-1");

        await new Promise(resolve => setTimeout(resolve, 1000));

        await iframe.waitForSelector('#Frm_UserName');

        await iframe.type('#Frm_WANCName1', UserAuth.name);
        await iframe.type('#Frm_UserName', UserAuth.user);
        await iframe.type('#Frm_Password', UserAuth.pass);
        await iframe.click('#Frm_WBDMode');
        await iframe.select('#Frm_ServList', '3');
        await iframe.select('#Frm_Priority', UserAuth.priority);
        await iframe.type('#Frm_VLANID', UserAuth.vlan);
        await iframe.select('#Frm_IsAuto', '1');
        await iframe.select('#Frm_Prefix', 'DHCP');
        await iframe.click('#Frm_IsPdAddr');

        const clearMac = await ClearmacInAllServices(loginResult.id);

        if (clearMac instanceof Error) {
            logger.error(clearMac.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        await iframe.click('#Btn_Add');

        await new Promise(resolve => setTimeout(resolve, 1000));

        logger.info(`✅ WAN configured successfully on ${this.device}!`);
        return UserAuth;
    }

    private async configureTR069(wan: string) {
        logger.info('⚙️ Configuring TR-069 for ' + this.device + '...');

        // Navigate to TR-069 configuration page
        await this.navigateToTR069Page();

        // Interact with the iframe and configure TR-069
        const iframe = await this.getIframe('#mainFrame');
        if (!iframe) {
            logger.error('Iframe with ID "mainFrame" not found or not accessible.');
            return;
        }

        logger.info("📄 Iframe found. Interacting with form fields...");

        await this.fillTR069Form(iframe, wan);

        logger.info('✅ TR-069 configured successfully on ' + this.device + '!');
    }

    private async navigateToTR069Page() {
        await this.page.evaluate(() => {
            const iframe = document.getElementById("mainFrame") as HTMLIFrameElement | null;
            if (!iframe) {
                logger.error('❌ Iframe with ID "mainFrame" not found.');
                return;
            }
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
                logger.error('❌ Iframe document not accessible.');
                return;
            }
            (iframeDoc.querySelector('#Fnt_mmManager') as HTMLElement)?.click();
        });

        // await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    private async getIframe(selector: string) {
        const iframeElement = await this.page.waitForSelector(selector);
        return iframeElement ? await iframeElement.contentFrame() : null;
    }

    private async fillTR069Form(iframe: Frame, wan: string) {
        const formFields = {
            '#Frm_URL': TR069_CONFIG.url, // Updated ACS URL
            '#Frm_UserName': TR069_CONFIG.username, // Updated Username
            '#Frm_UserPassword': TR069_CONFIG.password, // Updated Password
            '#Frm_ConnectionRequestUsername': TR069_CONFIG.connectionRequestUsername, // Updated Connection Request Username
            '#Frm_ConnectionRequestPassword': TR069_CONFIG.connectionRequestPassword, // Updated Connection Request Password
            '#Frm_PeriodicInformInterval': TR069_CONFIG.periodicInformInterval, // Updated Periodic Inform Interval
        };

        await iframe.waitForSelector('#TestContent', { visible: true });

        await new Promise(resolve => setTimeout(resolve, 1000));


        // Fill form fields
        for (const [selector, value] of Object.entries(formFields)) {
            await iframe.waitForSelector(selector, { visible: true });
            await iframe.$eval(selector, (el, val) => ((el as HTMLInputElement).value = String(val)), value);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));


        const wanListValue = await iframe.$$eval('#Frm_DefaultWan option', options => {
            return options.map(option => {
                const value = option.getAttribute('value');
                const text = option.textContent;
                return { value, text };
            });
        });

        const wanName = wanListValue.find(wanListValue => {

            if (wanListValue.value === null || wanListValue.text === null) {
                return false;
            }

            return wanListValue.text === wan;


        });

        if (wanName && wanName.value) {
            await iframe.select('#Frm_DefaultWan', wanName.value);
        } else {
            // no WAN found to select
        }

        // Enable Periodic Inform checkbox if not already checked
        await this.ensureCheckboxChecked(iframe, '#Frm_PeriodicInformEnable');
        await iframe.click('#Frm_RemoteUpgradeCertAuth')

        // Enable Certificate Authentication checkbox if not already checked
        // await this.ensureCheckboxChecked(iframe, '#Frm_SupportCertAuth');

        // Submit the form

        await iframe.evaluate(() => {

            const submitButton = document.querySelector('#Btn_Submit') as HTMLElement;
            if (submitButton) {
                submitButton.click();
            } else {
                logger.error("❌ Submit button not found!");
            }
        })

        await iframe.waitForNavigation({ waitUntil: 'networkidle2' });

        // await iframe.waitForSelector('#Btn_Submit', { visible: true });
        // await iframe.click('#Btn_Submit');

        logger.info('📨 Form submitted successfully!');

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    private async ensureCheckboxChecked(iframe: Frame, selector: string) {
        await iframe.waitForSelector(selector, { visible: true });
        const isChecked = await iframe.$eval(selector, el => (el as HTMLInputElement).checked);
        if (!isChecked) {
            await iframe.click(selector);
        }
    }

    private async logout() {

        const iframe = this.page.frames().find(frame => frame.name() === 'mainFrame');
        if (!iframe) {
            logger.error('❌ Iframe with name "mainFrame" not found.');
            return;
        }

        await iframe.waitForSelector('#Fnt_mmNet');
        await iframe.click('#Fnt_mmNet');

        await new Promise(resolve => setTimeout(resolve, 1000));

        const wan = await iframe.$$eval('#Frm_WANCName0 option', options => {
            return options.map(option => {
                const value = option.getAttribute('value');
                const text = option.textContent;
                return { value, text };
            });
        });


        const wanName = wan.filter(wan => {

            if (wan.value === null || wan.text === null) {
                return false;
            }

            // Filter out 'Internet_TR069' and 'omci' options
            return !wan.text.includes('Internet_TR069') && !wan.text.includes('omci') && wan.value !== '-1';

        });

        // Check if "Internet_TR069" is already configured
        const isWanConfigured = wan.some(wan => wan.text === 'Internet_TR069');

        if (!isWanConfigured) {
            logger.info('❌ WAN "Internet_TR069" not configured.');
            return;
        }


        for (const wan of wanName) {
            if (wan.value === null || wan.text === null) {
                return false;
            }


            await iframe.select('#Frm_WANCName0', wan.value);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iframe.click('#Btn_Delete')
            logger.info(`Deleting WAN: ${wan.text} (${wan.value})`);

            await new Promise(resolve => setTimeout(resolve, 1000));

        }


    }

    async run() {
        try {
            const wan = await this.configureWan();

            if (wan instanceof Error) {
                logger.error('❌ Error configuring WAN:' + wan);
                return wan;
            }

            await this.configureTR069(wan.name);


            if (wan.user === 'multipro' && wan.type === 'PPPoE') {
                return wan;
            }

            await this.logout()

            return wan;
        } catch (error) {
            logger.error('❌ An error occurred:' + error);
        }
    }
}