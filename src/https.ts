import fs from 'fs';

import { ConfigManagerCertPassphrase } from './services/config-manager-cert-passphrase';
import { ConfigManagerV2 } from './services/config-manager-v2';

export const getHttpsOptions = () => {
  // Skip HTTPS when running on Coolify or in dev mode
  if (process.env.COOLIFY === 'true' || process.env.DEV === 'true') {
    return undefined;
  }

  const certPath = addSlashToPath(
    ConfigManagerV2.getInstance().get('server.certificatePath'),
  );

  return {
    key: fs.readFileSync(certPath + 'server_key.pem'),
    cert: fs.readFileSync(certPath + 'server_cert.pem'),
    ca: [fs.readFileSync(certPath + 'ca_cert.pem')],
    passphrase: ConfigManagerCertPassphrase.readPassphrase(),
    requestCert: true,
    rejectUnauthorized: true,
  };
};

const addSlashToPath = (path: string) => {
  if (!path.endsWith('/')) {
    path += '/';
  }
  return path;
};
