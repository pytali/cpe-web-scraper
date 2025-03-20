import * as dotenv from 'dotenv';
import * as path from 'node:path';

export type Environment = 'development' | 'test' | 'production';

export function loadEnv() {
    const env = (process.env.NODE_ENV || 'development') as Environment;
    const envFiles = [
        '.env',                    // Base .env file
        `.env.${env}`,            // Environment specific .env
        `.env.${env}.local`,      // Local overrides
        '.env.local'              // Local overrides for all environments
    ];

    // Carrega os arquivos .env em ordem
    for (const file of envFiles) {
        dotenv.config({
            path: path.resolve(process.cwd(), file),
            override: true // Permite sobrescrever variáveis já definidas
        });
    }

    return {
        env,
        isDevelopment: env === 'development',
        isTest: env === 'test',
        isProduction: env === 'production'
    };
}

// Carrega as variáveis de ambiente assim que o módulo é importado
export const environment = loadEnv(); 