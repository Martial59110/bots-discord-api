import { Params } from 'nestjs-pino';
import { loggerConfig as prodConfig } from './logger.prod.config';
import { loggerConfig as devConfig } from './logger.dev.config';

let loggerConfig: Params;

if (process.env.NODE_ENV === 'production') {
  // Charger la configuration de production
  loggerConfig = prodConfig;
} else {
  // Charger la configuration de développement
  loggerConfig = devConfig;
}

export { loggerConfig };