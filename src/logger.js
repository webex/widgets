import {createLogger, format, transports} from 'winston';

const activeTransports = [];

if (process.env.NODE_ENV !== 'production') {
  activeTransports.push(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

const logger = createLogger({
  transports: activeTransports,
});

export default logger;
