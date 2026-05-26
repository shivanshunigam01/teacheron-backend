import winston from 'winston';
const logger=winston.createLogger({level:'info',format:winston.format.combine(winston.format.timestamp(),winston.format.json()),transports:[new winston.transports.Console()]});
logger.stream={write:(msg)=>logger.info(msg.trim())}; export default logger;
