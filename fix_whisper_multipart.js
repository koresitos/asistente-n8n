const https = require('https');
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYzQ1OGMxYS05MzliLTQzNDUtOTFkZi1jNWIzNjE1ODE0ZmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmE1NjI0OWMtOTYzOS00NDc3LWI0NzUtNjA3YWZlYjlhNTU0IiwiaWF0IjoxNzcxMzcyNDc1fQ.5S-1bcZW1dygY4E6hLGgvYRJupkp2QqhNvuVOC3edTk';
const HOST = 'proyecto-prueba1-n8n.jzw5jm.easypanel.host';

function apiReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: HOST, path, method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const r = https.request(opts, res => {
      let buf = ''; res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(buf) }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

// Multipart manual con Buffer — sin Blob, sin FormData
const newCode = `const items = $input.all();
const results = [];
for (const item of items) {
  const audioB64 = item.json.base64 || item.json.data || '';
  const mimeType = item.json.mimetype || 'audio/ogg';
  const originalItem = $('¿Es audio?').first().json;
  const config = originalItem.config;

  let transcription = '[El cliente envió un audio. Respóndele con un mensaje cálido y pídele que repita su mensaje por texto.]';

  if (audioB64) {
    try {
      const buffer = Buffer.from(audioB64, 'base64');
      const ext = mimeType.includes('mp4') ? 'mp4' : 'ogg';
      const contentType = mimeType.split(';')[0].trim();
      const boundary = '----WA' + Date.now().toString(36);
      const CRLF = '\\r\\n';

      const body = Buffer.concat([
        Buffer.from('--' + boundary + CRLF + 'Content-Disposition: form-data; name="model"' + CRLF + CRLF + 'whisper-1' + CRLF),
        Buffer.from('--' + boundary + CRLF + 'Content-Disposition: form-data; name="language"' + CRLF + CRLF + 'es' + CRLF),
        Buffer.from('--' + boundary + CRLF + 'Content-Disposition: form-data; name="file"; filename="audio.' + ext + '"' + CRLF + 'Content-Type: ' + contentType + CRLF + CRLF),
        buffer,
        Buffer.from(CRLF + '--' + boundary + '--' + CRLF)
      ]);

      const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + config.OPENAI_API_KEY,
          'Content-Type': 'multipart/form-data; boundary=' + boundary
        },
        body: body
      });
      const wJson = await whisperResp.json();
      transcription = wJson.text || '[Audio sin contenido]';
    } catch(e) {
      transcription = '[DEBUG multipart: ' + e.message + ']';
    }
  }

  results.push({ json: { ...originalItem, messageText: transcription, isAudio: false } });
}
return results;`;

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');
  const n = wf.nodes.find(n => n.id === 'n_transcribe');
  if (!n) { console.log('ERROR: n_transcribe not found'); return; }

  delete n.parameters.mode;
  n.parameters.jsCode = newCode;

  const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {}, staticData: wf.staticData || null };
  const { status } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);
  console.log(status === 200 ? 'OK — multipart manual activado. Envía un audio.' : 'ERROR: ' + status);
}

main().catch(console.error);
