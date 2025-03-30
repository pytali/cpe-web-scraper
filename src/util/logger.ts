import { createLogger, transports, format } from 'winston';

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: () => {
                let date = new Date();
                return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, -1)
            }
        }),
        format.colorize({ level: true, colors: { info: 'green', error: 'red', warn: 'yellow' }, all: true }),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
    ),

    transports: [
        new transports.Console()
    ],


});

export { logger };