declare module 'puppeteer-extra-plugin-user-preferences' {
    import { PuppeteerExtraPlugin } from 'puppeteer-extra-plugin';

    interface UserPreferences {
        userPrefs?: {
            [key: string]: any;
        };
    }

    class UserPreferencesPlugin extends PuppeteerExtraPlugin {
        constructor(opts?: UserPreferences);
        _isPuppeteerExtraPlugin: boolean;
    }

    export default function(pluginConfig?: UserPreferences): UserPreferencesPlugin;
}