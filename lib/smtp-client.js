import tls from 'node:tls';
import net from 'node:net';

function extractEmail(str) {
  if (!str) return '';
  const match = /<([^>]+)>/.exec(str);
  if (match) return match[1].trim();
  return str.replace(/["']/g, '').trim();
}

export async function sendSmtp({
  host = 'smtp.gmail.com',
  port = 465,
  user,
  pass,
  from,
  to,
  subject,
  html,
  text
}) {
  if (!user || !pass) {
    throw new Error('SMTP user and pass must be provided');
  }

  if([host,user,from,to,subject].some(value=>/[\r\n]/.test(String(value||''))))throw new Error('SMTP headers must not contain line breaks');
  const fromAddress = from || user;
  const envelopeFrom = extractEmail(from || user);
  const envelopeTo = extractEmail(to);

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port: Number(port),
        servername: host,
        rejectUnauthorized: true,
        timeout: 4000,
      },
      () => {}
    );

    let stage = 0;
    let buffer = '';

    socket.setEncoding('utf8');

    function send(cmd) {
      socket.write(cmd + '\r\n');
    }

    socket.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;
        const code = Number(line.slice(0, 3));
        const isLast = line[3] !== '-';

        if (!isLast) continue;

        if (stage === 0 && code === 220) {
          stage = 1;
          send('EHLO localhost');
        } else if (stage === 1 && code === 250) {
          stage = 2;
          send('AUTH LOGIN');
        } else if (stage === 2 && code === 334) {
          stage = 3;
          send(Buffer.from(user).toString('base64'));
        } else if (stage === 3 && code === 334) {
          stage = 4;
          const cleanPass = pass.replace(/\s+/g, '');
          send(Buffer.from(cleanPass).toString('base64'));
        } else if (stage === 4 && code === 235) {
          stage = 5;
          send(`MAIL FROM:<${envelopeFrom}>`);
        } else if (stage === 5 && code === 250) {
          stage = 6;
          send(`RCPT TO:<${envelopeTo}>`);
        } else if (stage === 6 && code === 250) {
          stage = 7;
          send('DATA');
        } else if (stage === 7 && code === 354) {
          stage = 8;
          const mime = [
            `From: ${fromAddress}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: '+(html?'text/html':'text/plain')+'; charset=UTF-8',
            '',
            String(html||text||'').replace(/(^|\n)\./g,'$1..'),
            '.',
          ].join('\r\n');
          send(mime);
        } else if (stage === 8 && code === 250) {
          stage = 9;
          send('QUIT');
          socket.end();
          resolve({ success: true, message: 'Email delivered via SMTP' });
        } else if (code >= 400) {
          socket.destroy();
          reject(new Error(`SMTP error ${code}: ${line}`));
        }
      }
    });

    socket.on('error', err => {
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SMTP socket timeout'));
    });
  });
}
