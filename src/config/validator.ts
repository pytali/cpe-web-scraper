import { z } from 'zod';
import { IXC_CONFIG, TR069_CONFIG, DEVICE_CONFIG, WORKER_CONFIG } from './index.ts';

// Regex para validar o formato do token IXC (XX:hash)
const tokenRegex = /^\d+:[a-f0-9]{64}$/;
// Regex para validar URLs sem barra no final
const urlRegex = /^https?:\/\/[^\s/]+(?:\/[^\s/]+)*$/;

// Schema para configuração IXC
const IXCProviderSchema = z.object({
    TOKEN: z.string().regex(tokenRegex, 'Token deve estar no formato XX:hash'),
    BASEURL: z.string().regex(urlRegex, 'URL não deve terminar com barra')
});

const IXCConfigSchema = z.object({
    CDY: IXCProviderSchema,
    BD: IXCProviderSchema,
    BR364: IXCProviderSchema
});

// Schema para configuração TR-069
const TR069ConfigSchema = z.object({
    url: z.string().url(),
    username: z.string().min(1),
    password: z.string().min(8),
    connectionRequestUsername: z.string().min(1),
    connectionRequestPassword: z.string().min(8),
    periodicInformInterval: z.string().regex(/^\d+$/)

});

// Schema para configuração de dispositivos
const DeviceConfigSchema = z.object({
    port: z.string()
        .regex(/^\d+$/, 'Porta deve ser um número')
        .transform(val => parseInt(val, 10))
        .refine(val => val >= 1 && val <= 65535, 'Porta deve estar entre 1 e 65535'),
    loginUser: z.array(z.string()).min(1),
    loginPassword: z.array(z.string()).min(1)
});

// Schema para configuração de workers
const WorkerConfigSchema = z.object({
    batchSize: z.number().int().min(1).max(200),
    poolSize: z.number().int().min(1).max(10)
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
        throw new Error('Erro de validação nas configurações:\n' + errors.join('\n'));
    }

    return {
        IXC_CONFIG: IXCConfigSchema.parse(IXC_CONFIG),
        TR069_CONFIG: TR069ConfigSchema.parse(TR069_CONFIG),
        DEVICE_CONFIG: DeviceConfigSchema.parse(DEVICE_CONFIG),
        WORKER_CONFIG: WorkerConfigSchema.parse(WORKER_CONFIG)
    };
} 