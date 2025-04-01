import { describe, expect, test, beforeEach } from '@jest/globals';

// Configurações padrão para teste
const defaultConfig = {
    IXC_CONFIG: {
        CDY: {
            TOKEN: '04:8f9e2a3b7c6d1f4e5d8c9b2a3f6e8d7c4b5a9f8e2d1c3b7a4f6e8d9c5b2a3f',
            BASEURL: 'https://ixc.example.com/webservice/v1'
        },
        BD: {
            TOKEN: '12:3a7b4c8d2e5f9g6h1i4j7k2l5m8n3o6p9q2r5s8t1u4v7w0x3y6z9a2b5c8d',
            BASEURL: 'https://ixc.example.com/webservice/v1'
        },
        BR364: {
            TOKEN: '17:5x8y2z7a4b1c6d3e9f5g2h8i4j1k7l3m9n5o2p8q4r1s7t3u9v5w2x8y4z',
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
        ttl: 3600,
        gracefulShutdownTimeout: 60
    }
};

// Mock do módulo de configuração
const mockModule = {
    ...defaultConfig
};

jest.mock('../index', () => mockModule);

// Importa as dependências após o mock
import { validateConfig } from '../validator.ts';

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

        expect(() => validateConfig()).toThrow(/Token deve estar no formato XX:hash/);
    });

    test('deve rejeitar URL com barra no final', () => {
        mockModule.IXC_CONFIG = {
            ...mockModule.IXC_CONFIG,
            CDY: {
                ...mockModule.IXC_CONFIG.CDY,
                BASEURL: 'https://ixc.example.com/webservice/v1/'
            }
        };

        expect(() => validateConfig()).toThrow(/URL não deve terminar com barra/);
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

        expect(() => validateConfig()).toThrow(/Porta deve estar entre 1 e 65535/);
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
            ttl: 200
        };

        expect(() => validateConfig()).toThrow(/Number must be greater than or equal to 300/);
    });

    test('deve rejeitar TTL de worker muito alto', () => {
        mockModule.WORKER_CONFIG = {
            ...mockModule.WORKER_CONFIG,
            ttl: 90000
        };

        expect(() => validateConfig()).toThrow(/Number must be less than or equal to 86400/);
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