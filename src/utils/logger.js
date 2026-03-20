import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/bot.log'),
            format: logFormat
        })
    ]
});

try {
    const fs = await import('fs');
    if (!fs.existsSync(path.join(__dirname, '../../logs'))) {
        fs.mkdirSync(path.join(__dirname, '../../logs'), { recursive: true });
    }
} catch (e) {}
