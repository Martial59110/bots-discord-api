import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    level: 'debug',
    transport: {
      target: 'pino/file',
      options: {
        destination: './logs/app.log',
        mkdir: true
      }
    },
  },
}; 