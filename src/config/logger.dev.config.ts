import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    customProps: () => ({
      context: 'HTTP',
    }),
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
            levelFirst: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        },
        {
          target: 'pino/file',
          options: {
            destination: './logs/app.log',
            mkdir: true
          }
        }
      ]
    },
    level: 'debug',
    autoLogging: true,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      remove: true
    }
  }
}; 