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

const diagCode = `const items = $input.all();
const results = [];
for (const item of items) {
  const audioB64 = item.json.base64 || item.json.data || '';
  const mimeType = item.json.mimetype || 'audio/ogg';
  const originalItem = $('¿Es audio?').first().json;
  const config = originalItem.config;

  if (!audioB64) {
    results.push({ json: { ...originalItem, messageText: '[DEBUG: base64 vacío — keys=' + Object.keys(item.json).join(',') + ']', isAudio: false } });
    continue;
  }

  let transcription = '[fallback]';
  try {
    const buffer = Buffer.from(audioB64, 'base64');
    const ext = mimeType.includes('mp4') ? 'mp4' : 'ogg';
    const whisperResp = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      headers: { 'Authorization': 'Bearer ' + config.OPENAI_API_KEY },
      formData: {
        model: 'whisper-1',
        language: 'es',
        file: { value: buffer, options: { filename: 'audio.' + ext, contentType: mimeType.split(';')[0].trim() } }
      }
    });
    const wParsed = typeof whisperResp === 'string' ? JSON.parse(whisperResp) : whisperResp;
    transcription = wParsed.text || '[Audio sin contenido]';
  } catch(e) {
    transcription = '[DEBUG: b64len=' + audioB64.length + ' err=' + e.message + ']';
  }

  results.push({ json: { ...originalItem, messageText: transcription, isAudio: false } });
}
return results;`;

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');
  const n = wf.nodes.find(n => n.id === 'n_transcribe');
  if (!n) {
    console.log('ERROR: n_transcribe not found. Nodes:', wf.nodes.map(x => x.id + '/' + x.name).join(', '));
    return;
  }

  delete n.parameters.mode;
  n.parameters.jsCode = diagCode;

  const payload = {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings || {}, staticData: wf.staticData || null
  };
  const { status } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);
  console.log(status === 200
    ? 'OK — diagnóstico activado. Envía un audio de WhatsApp y dime el mensaje exacto que recibes.'
    : 'ERROR: ' + status);
}

main().catch(console.error);
