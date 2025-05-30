import fs from 'fs';

import { ConfigManagerCertPassphrase } from './services/config-manager-cert-passphrase';
import { ConfigManagerV2 } from './services/config-manager-v2';

export const getHttpsOptions = () => {
  // Skip HTTPS when running on Coolify or in dev mode
  if (process.env.COOLIFY === 'true' || process.env.DEV === 'true') {
    return undefined;
  }

  try {
    const certPath = addSlashToPath(
      ConfigManagerV2.getInstance().get('server.certificatePath') || './certs/',
    );

    // Check if certificate files exist
    const certFiles = ['server_key.pem', 'server_cert.pem', 'ca_cert.pem'];
    const missingFiles = certFiles.filter(
      (file) => !fs.existsSync(certPath + file)
    );

    if (missingFiles.length > 0) {
      console.warn(`SSL certificates not found: ${missingFiles.join(', ')}. Falling back to HTTP mode.`);
      return undefined;
    }

    return {
      key: fs.readFileSync(certPath + 'server_key.pem'),
      cert: fs.readFileSync(certPath + 'server_cert.pem'),
      ca: [fs.readFileSync(certPath + 'ca_cert.pem')],
      passphrase: ConfigManagerCertPassphrase.readPassphrase(),
      requestCert: true,
      rejectUnauthorized: true,
    };
  } catch (error) {
    console.warn('Error loading SSL certificates:', error.message);
    return undefined;
  }
};

const addSlashToPath = (path: string) => {
  if (!path.endsWith('/')) {
    path += '/';
  }
  return path;
};
