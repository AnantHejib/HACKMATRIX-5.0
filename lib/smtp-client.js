import nodemailer from 'nodemailer';

function createSmtpTransport({ host, port = 465, user, pass, from, to, subject }) {
  if (!host || !user || !pass || !from) throw new Error('SMTP is not configured');
  if ([host, user, from, to, subject].some(value => /[\r\n]/.test(String(value || '')))) throw new Error('Invalid SMTP header');
  if (![465, 587].includes(Number(port))) throw new Error('SMTP_PORT must be 465 (TLS) or 587 (STARTTLS)');
  return nodemailer.createTransport({
    host, port: Number(port), secure: Number(port) === 465, requireTLS: true,
    auth: { user, pass }, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
    disableFileAccess: true, disableUrlAccess: true,
  });
}

// Checks TLS and SMTP authentication without sending any email.
export async function verifySmtp(settings) {
  const transport=createSmtpTransport(settings);
  try { await transport.verify();return {success:true}; }
  finally {transport.close();}
}

export async function sendSmtp({ host, port = 465, user, pass, from, to, subject, html, text }) {
  const transport=createSmtpTransport({host,port,user,pass,from,to,subject});
  try {
    const result = await transport.sendMail({ from, to, subject, html, text });
    if (!result.accepted?.length || result.rejected?.length) throw new Error('SMTP rejected recipient');
    return { success: true };
  } finally { transport.close(); }
}
