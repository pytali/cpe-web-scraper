import { Frame, Page } from 'puppeteer';
import { checkLoginInAllServices } from "../services/Search.service";
import { ClearmacInAllServices } from "../services/ClearMac.service";
import { TR069_CONFIG } from '../config';

export class F680 {
    private page: Page;

    private readonly device: string;

    constructor(page: Page, device: string) {
        this.page = page;
        this.device = device;
    }

    private async checkWan(element: Frame) {

        const wan = await element.$$eval('#Frm_WANCName0 option', options => {
            return options.map(option => {
                const value = option.getAttribute('value');
                const text = option.textContent;
                return { value, text };
            });
        });

        const wanName = wan.find(wan => {

            if (wan.value === null || wan.text === null) {
                return false;
            }

            return wan.text === 'Internet_TR069' || wan.text.includes('omci');


        });

        if (!wanName) {
            console.log('❌ WAN not configured.');
            return false;
        } else {
            return true;
        }

    }

    async configureWan() {

        const LinkMode = {
            'PPP': 'PPPoE', 'IP': 'DHCP'
        };


        let UserAuth: {
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
            console.error('❌ Iframe with name "mainFrame" not found.');
            return UserAuth;
        }

        await iframe.waitForSelector('#Fnt_mmNet');
        await iframe.click('#Fnt_mmNet');

        await new Promise(resolve => setTimeout(resolve, 1000));

        await iframe.select('#Frm_WANCName0', "IGD.WD1.WCD1.WCPPP2");

        await new Promise(resolve => setTimeout(resolve, 1000));

        await iframe.waitForSelector('#Frm_UserName');

        const wanChecker = await this.checkWan(iframe)


        if (wanChecker) {
            console.log('WAN already configured.');
            return UserAuth;
        }


        UserAuth.user = await iframe.$eval('#Frm_UserName', (el => (el as HTMLInputElement).value));
        const linkType = await iframe.$eval('#Frm_linkMode', (el => (el as HTMLInputElement).value));

        if (linkType !== 'PPP') {
            console.log('IPOE CONFIGURED');
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
            console.log(clearMac.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        await iframe.click('#Btn_Add');




        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log(`✅ WAN configured successfully on ${this.device}!`);
        return UserAuth;


    }

    private async configureTR069(wan: string) {
        console.log('⚙️ Configuring TR-069 for F680...');

        // Navigate to TR-069 configuration page
        await this.navigateToTR069Page();

        // Interact with the iframe and configure TR-069
        const iframe = await this.getIframe('#mainFrame');
        if (!iframe) {
            console.error('Iframe with ID "mainFrame" not found or not accessible.');
            return;
        }

        console.log("📄 Iframe found. Interacting with form fields...");

        await this.fillTR069Form(iframe, wan);

        console.log('✅ TR-069 configured successfully on F680!');
    }

    private async navigateToTR069Page() {
        await this.page.evaluate(() => {
            const iframe = document.getElementById("mainFrame") as HTMLIFrameElement | null;
            if (!iframe) {
                console.error('❌ Iframe with ID "mainFrame" not found.');
                return;
            }
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
                console.error('❌ Iframe document not accessible.');
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
                console.error("❌ Submit button not found!");
            }
        })

        await iframe.waitForNavigation({ waitUntil: 'networkidle2' });

        // await iframe.waitForSelector('#Btn_Submit', { visible: true });
        // await iframe.click('#Btn_Submit');

        console.log('📨 Form submitted successfully!');

        await new Promise(resolve => setTimeout(resolve, 2000));
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
            console.error('❌ Iframe with name "mainFrame" not found.');
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
            console.log('❌ WAN "Internet_TR069" not configured.');
            return;
        }


        for (const wan of wanName) {
            if (wan.value === null || wan.text === null) {
                return false;
            }


            await iframe.select('#Frm_WANCName0', wan.value);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await iframe.click('#Btn_Delete')
            console.log(`Deleting WAN: ${wan.text} (${wan.value})`);

            await new Promise(resolve => setTimeout(resolve, 1000));

        }


    }

    async run() {
        try {
            const wan = await this.configureWan();

            if (wan instanceof Error) {
                console.error('❌ Error configuring WAN:', wan);
                return wan;
            }

            await this.configureTR069(wan.name);

            if (wan.user === 'multipro') {
                return wan;
            }

            await this.logout()

            return wan;
        } catch (error) {
            console.error('❌ An error occurred:', error);
        }
    }
}