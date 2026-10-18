import cds from '@sap/cds';
import nodemailer from 'nodemailer';

const LOG = cds.log('notifications');

// undefined while unresolved, null once we know no SMTP server is configured
let oTransporter;

// The SMTP settings are environment variables: a gitignored .env locally (cds reads it),
// `cf set-env` in Cloud Foundry. They never belong in package.json, which is in the repository.
const smtpSettings = () => ({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD
});

export const sender = () => cds.env.notifications?.from;

export const mailer = () => {
    if (oTransporter !== undefined) return oTransporter;

    const { host, port, secure, user, password } = smtpSettings();
    if (!host) {
        LOG.info('SMTP is not configured, notification e-mails are skipped');
        return (oTransporter = null);
    }

    oTransporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure,
        ...(user ? { auth: { user, pass: password } } : {}),
        pool: true,
        maxConnections: 3,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000
    });
    LOG.info(`SMTP transport ready for ${host}:${port}`);
    return oTransporter;
};
