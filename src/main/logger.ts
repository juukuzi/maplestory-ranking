import * as winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

const logger = winston.createLogger({
    level: 'debug',
    transports: [
        new winston.transports.Console(),
        new LoggingWinston()
    ]
});

export default logger;
