import { environment } from './env';
import { validateConfig } from './validator';

// Carrega as configurações baseadas no ambiente atual
export const IXC_CONFIG = {
    CDY: {
        TOKEN: process.env.IXC_CDY_TOKEN || "<TOKEN>",
        BASEURL: process.env.IXC_CDY_URL || "https://ixc.example.com/webservice/v1",
    },
    BD: {
        TOKEN: process.env.IXC_BD_TOKEN || "<TOKEN>",
        BASEURL: process.env.IXC_BD_URL || "https://ixc.example.com/webservice/v1",

    },
    BR364: {
        TOKEN: process.env.IXC_BR364_TOKEN || "<TOKEN>",
        BASEURL: process.env.IXC_BR364_URL || "https://ixc.example.com/webservice/v1",
    }
}

export const TR069_CONFIG = {
    url: process.env.TR069_URL || "http://acs.example.com",
    username: process.env.TR069_USERNAME || "<USERNAME>",
    password: process.env.TR069_PASSWORD || "<PASSWORD>",
    connectionRequestUsername: process.env.TR069_CONN_USERNAME || "<CONNECTION_REQUEST_USERNAME>",
    connectionRequestPassword: process.env.TR069_CONN_PASSWORD || "<CONNECTION_REQUEST_PASSWORD>",
    periodicInformInterval: process.env.TR069_INFORM_INTERVAL || "1200",
}

export const DEVICE_CONFIG = {
    port: process.env.DEVICE_PORT || "80",
    loginUser: process.env.DEVICE_USERS?.split(",") || ["<LOGIN_USER_1>", "<LOGIN_USER_2>"],
    loginPassword: process.env.DEVICE_PASSWORDS?.split(",") || ["<LOGIN_PASSWORD_1>", "<LOGIN_PASSWORD_2>", "<LOGIN_PASSWORD_3>"]
}

export const WORKER_CONFIG = {
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || "2"),
    poolSize: parseInt(process.env.WORKER_POOL_SIZE || "1")
}

// Valida as configurações ao importar o módulo
const validatedConfig = validateConfig();

// Re-exporta as configurações validadas
export const {
    IXC_CONFIG: ValidatedIXCConfig,
    TR069_CONFIG: ValidatedTR069Config,
    DEVICE_CONFIG: ValidatedDeviceConfig,
    WORKER_CONFIG: ValidatedWorkerConfig
} = validatedConfig;

// Exporta informações do ambiente
export const { env, isDevelopment, isTest, isProduction } = environment;