import winston from 'winston';
import { format } from 'winston';
const { combine, timestamp, printf } = format;

/**
 * Custom format for log messages.
 * Includes timestamp, level, and message.
 */
const customFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

/**
 * Winston logger configuration.
 * - Logs to console and file
 * - Uses custom format with timestamp
 * - Saves errors to error.log
 * - Saves all logs to combined.log
 */
export const logger = winston.createLogger({
    format: combine(
        timestamp(),
        customFormat
    ),
    transports: [
        // Console output with all levels
        new winston.transports.Console({
            level: 'debug'
        }),
        // File output for errors only
        new winston.transports.File({
            filename: 'error.log',
            level: 'error'
        }),
        // File output for all logs
        new winston.transports.File({
            filename: 'combined.log'
        })
    ]
});