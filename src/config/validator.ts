import { z } from 'zod';
import { IXC_CONFIG, TR069_CONFIG, DEVICE_CONFIG, WORKER_CONFIG } from './index.ts';

// Regex to validate IXC token format (XX:hash)
const tokenRegex = /^\d+:[a-f0-9]{64}$/;
// Regex to validate URLs without trailing slash
const urlRegex = /^https?:\/\/[^\s/]+(?:\/[^\s/]+)*$/;

// Schema for IXC configuration
const IXCProviderSchema = z.object({
    TOKEN: z.string().regex(tokenRegex, 'Token deve estar no formato XX:hash'),
    BASEURL: z.string().regex(urlRegex, 'URL não deve terminar com barra')
});

const IXCConfigSchema = z.object({
    CDY: IXCProviderSchema,
    BD: IXCProviderSchema,
    BR364: IXCProviderSchema
});

// Schema for TR-069 configuration
const TR069ConfigSchema = z.object({
    url: z.string().url('URL inválida'),
    username: z.string().min(1, 'Usuário não pode estar vazio'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    connectionRequestUsername: z.string().min(1, 'Usuário de conexão não pode estar vazio'),
    connectionRequestPassword: z.string().min(8, 'Senha de conexão deve ter pelo menos 8 caracteres'),
    periodicInformInterval: z.string().regex(/^\d+$/, 'Intervalo deve ser um número')
});

// Schema for device configuration
const DeviceConfigSchema = z.object({
    port: z.string()
        .regex(/^\d+$/, 'Porta deve ser um número')
        .transform(val => parseInt(val, 10))
        .refine(val => val >= 1 && val <= 65535, 'Porta deve estar entre 1 e 65535'),
    loginUser: z.array(z.string()).min(1, 'Lista de usuários não pode estar vazia'),
    loginPassword: z.array(z.string()).min(1, 'Lista de senhas não pode estar vazia')
});

// Schema for worker configuration
const WorkerConfigSchema = z.object({
    batchSize: z.number().int().min(1, 'Tamanho do lote deve ser pelo menos 1').max(200, 'Tamanho do lote não pode ser maior que 200'),
    poolSize: z.number().int().min(1, 'Tamanho do pool deve ser pelo menos 1').max(10, 'Tamanho do pool não pode ser maior que 10'),
    ttl: z.number().int().min(300, 'TTL deve ser pelo menos 300 segundos').max(86400, 'TTL não pode ser maior que 86400 segundos'),
    gracefulShutdownTimeout: z.number().int().min(30, 'Timeout de graceful shutdown deve ser pelo menos 30 segundos').max(300, 'Timeout de graceful shutdown não pode ser maior que 300 segundos')
});

export type ValidatedIXCConfig = z.infer<typeof IXCConfigSchema>;
export type ValidatedTR069Config = z.infer<typeof TR069ConfigSchema>;
export type ValidatedDeviceConfig = z.infer<typeof DeviceConfigSchema>;
export type ValidatedWorkerConfig = z.infer<typeof WorkerConfigSchema>;

export function validateConfig() {
    const errors: string[] = [];

    try {
        IXCConfigSchema.parse(IXC_CONFIG);
    } catch (e) {
        if (e instanceof z.ZodError) {
            errors.push(...e.errors.map(err => `IXC_CONFIG: ${err.path.join('.')} - ${err.message}`));
        }
    }

    try {
        TR069ConfigSchema.parse(TR069_CONFIG);
    } catch (e) {
        if (e instanceof z.ZodError) {
            errors.push(...e.errors.map(err => `TR069_CONFIG: ${err.path.join('.')} - ${err.message}`));
        }
    }

    try {
        DeviceConfigSchema.parse(DEVICE_CONFIG);
    } catch (e) {
        if (e instanceof z.ZodError) {
            errors.push(...e.errors.map(err => `DEVICE_CONFIG: ${err.path.join('.')} - ${err.message}`));
        }
    }

    try {
        WorkerConfigSchema.parse(WORKER_CONFIG);
    } catch (e) {
        if (e instanceof z.ZodError) {
            errors.push(...e.errors.map(err => `WORKER_CONFIG: ${err.path.join('.')} - ${err.message}`));
        }
    }

    if (errors.length > 0) {
        throw new Error('Configuration validation error:\n' + errors.join('\n'));
    }

    return {
        IXC_CONFIG: IXCConfigSchema.parse(IXC_CONFIG),
        TR069_CONFIG: TR069ConfigSchema.parse(TR069_CONFIG),
        DEVICE_CONFIG: DeviceConfigSchema.parse(DEVICE_CONFIG),
        WORKER_CONFIG: WorkerConfigSchema.parse(WORKER_CONFIG)
    };
} 