import { describe, expect, test, beforeEach } from '@jest/globals';

// Configurações padrão para teste
const defaultConfig = {
    IXC_CONFIG: {
        CDY: {
            TOKEN: '14:7bef3c8a91d2f5e6b4a0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8',
            BASEURL: 'https://ixc.example.com/webservice/v1'
        },
        BD: {
            TOKEN: '12:7bef3c8a91d2f5e6b4a0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8',
            BASEURL: 'https://ixc.example.com/webservice/v1'
        },
        BR364: {
            TOKEN: '25:7bef3c8a91d2f5e6b4a0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8',
            BASEURL: 'https://ixc.example.com/webservice/v1'
        }
    },
    TR069_CONFIG: {
        url: 'http://acs.example.com',
        username: 'admin',
        password: 'TestPass789!@#',
        connectionRequestUsername: 'connection',
        connectionRequestPassword: 'ConnReq456!@#',
        periodicInformInterval: '1200'
    },
    DEVICE_CONFIG: {
        port: '80',
        loginUser: ['user1', 'user2'],
        loginPassword: ['pass1', 'pass2', 'pass3']
    },
    WORKER_CONFIG: {
        batchSize: 2,
        poolSize: 1,
        ttl: 30,
        gracefulShutdownTimeout: 60
    }
};

// Mock do módulo de configuração
const mockModule = {
    ...defaultConfig
};

jest.mock('../index', () => mockModule);

// Importa as dependências após o mock
import { validateConfig } from '../validator';

describe('Config Validator', () => {
    beforeEach(() => {
        // Restaura as configurações originais antes de cada teste
        Object.assign(mockModule, defaultConfig);
    });

    test('deve validar configurações válidas', () => {
        expect(() => validateConfig()).not.toThrow();
    });

    test('deve rejeitar token IXC inválido', () => {
        mockModule.IXC_CONFIG = {
            ...mockModule.IXC_CONFIG,
            CDY: {
                ...mockModule.IXC_CONFIG.CDY,
                TOKEN: 'invalid-token'
            }
        };

        expect(() => validateConfig()).toThrow(/Token must be in format XX:hash/);
    });

    test('deve rejeitar URL com barra no final', () => {
        mockModule.IXC_CONFIG = {
            ...mockModule.IXC_CONFIG,
            CDY: {
                ...mockModule.IXC_CONFIG.CDY,
                BASEURL: 'https://ixc.example.com/webservice/v1/'
            }
        };

        expect(() => validateConfig()).toThrow(/URL must not end with a slash/);
    });

    test('deve rejeitar senha TR069 muito curta', () => {
        mockModule.TR069_CONFIG = {
            ...mockModule.TR069_CONFIG,
            password: '123'
        };

        expect(() => validateConfig()).toThrow(/String must contain at least 8 character/);
    });

    test('deve rejeitar porta de dispositivo inválida', () => {
        mockModule.DEVICE_CONFIG = {
            ...mockModule.DEVICE_CONFIG,
            port: '70000'
        };

        expect(() => validateConfig()).toThrow(/Port must be between 1 and 65535/);
    });

    test('deve rejeitar tamanho de lote de worker inválido', () => {
        mockModule.WORKER_CONFIG = {
            ...mockModule.WORKER_CONFIG,
            batchSize: 0
        };

        expect(() => validateConfig()).toThrow(/Number must be greater than or equal to 1/);
    });

    test('deve rejeitar lista vazia de usuários', () => {
        mockModule.DEVICE_CONFIG = {
            ...mockModule.DEVICE_CONFIG,
            loginUser: []
        };

        expect(() => validateConfig()).toThrow(/Array must contain at least 1 element/);
    });

    test('deve rejeitar TTL de worker muito baixo', () => {
        mockModule.WORKER_CONFIG = {
            ...mockModule.WORKER_CONFIG,
            ttl: 2
        };

        expect(() => validateConfig()).toThrow(/Number must be greater than or equal to 20/);
    });

    test('deve rejeitar TTL de worker muito alto', () => {
        mockModule.WORKER_CONFIG = {
            ...mockModule.WORKER_CONFIG,
            ttl: 90000
        };

        expect(() => validateConfig()).toThrow(/Number must be less than or equal to 120/);
    });

    test('deve rejeitar timeout de graceful shutdown muito baixo', () => {
        mockModule.WORKER_CONFIG = {
            ...mockModule.WORKER_CONFIG,
            gracefulShutdownTimeout: 20
        };

        expect(() => validateConfig()).toThrow(/Number must be greater than or equal to 30/);
    });

    test('deve rejeitar timeout de graceful shutdown muito alto', () => {
        mockModule.WORKER_CONFIG = {
            ...mockModule.WORKER_CONFIG,
            gracefulShutdownTimeout: 400
        };

        expect(() => validateConfig()).toThrow(/Number must be less than or equal to 300/);
    });
}); 