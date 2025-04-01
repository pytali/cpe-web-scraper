import { z } from 'zod';
import { IXC_CONFIG, TR069_CONFIG, DEVICE_CONFIG, WORKER_CONFIG } from './index.ts';

// Regex to validate IXC token format (XX:hash)
const tokenRegex = /^\d+:[a-f0-9]{64}$/;
// Regex to validate URLs without trailing slash
const urlRegex = /^https?:\/\/[^\s/]+(?:\/[^\s/]+)*$/;

// Schema for IXC configuration
const IXCProviderSchema = z.object({
    TOKEN: z.string().regex(tokenRegex, 'Token must be in format XX:hash'),
    BASEURL: z.string().regex(urlRegex, 'URL must not end with a slash')
});

const IXCConfigSchema = z.object({
    CDY: IXCProviderSchema,
    BD: IXCProviderSchema,
    BR364: IXCProviderSchema
});

// Schema for TR-069 configuration
const TR069ConfigSchema = z.object({
    url: z.string().url(),
    username: z.string().min(1),
    password: z.string().min(8),
    connectionRequestUsername: z.string().min(1),
    connectionRequestPassword: z.string().min(8),
    periodicInformInterval: z.string().regex(/^\d+$/)
});

// Schema for device configuration
const DeviceConfigSchema = z.object({
    port: z.string()
        .regex(/^\d+$/, 'Port must be a number')
        .transform(val => parseInt(val, 10))
        .refine(val => val >= 1 && val <= 65535, 'Port must be between 1 and 65535'),
    loginUser: z.array(z.string()).min(1),
    loginPassword: z.array(z.string()).min(1)
});

// Schema for worker configuration
const WorkerConfigSchema = z.object({
    batchSize: z.number().int().min(1).max(200),
    poolSize: z.number().int().min(1).max(10),
    ttl: z.number().int().min(20).max(120),
    gracefulShutdownTimeout: z.number().int().min(30).max(300)
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