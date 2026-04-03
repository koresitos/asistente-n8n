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

// runOnceForAllItems con this.helpers — mismo patrón que n3 y n4
const newCode = `const items = $input.all();
const results = [];
for (const item of items) {
  const config = item.json.config;
  let transcription = '[Audio sin contenido]';
  try {
    // 1. Descargar audio desde Evolution API
    const audioResp = await this.helpers.httpRequest({
      method: 'POST',
      url: config.EVOLUTION_API_URL + '/chat/getBase64FromMediaMessage/' + config.EVOLUTION_INSTANCE,
      headers: { apikey: config.EVOLUTION_API_KEY },
      json: true,
      body: { message: { key: item.json.rawKey, message: item.json.rawMessage }, convertToMp4: false }
    });
    const audioB64 = audioResp.base64 || audioResp.data || '';
    const mimeType = audioResp.mimetype || 'audio/ogg';

    if (audioB64) {
      // 2. Transcribir con Whisper
      const buffer = Buffer.from(audioB64, 'base64');
      const ext = mimeType.includes('mp4') ? 'mp4' : 'ogg';
      const whisperResp = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.openai.com/v1/audio/transcriptions',
        headers: { Authorization: 'Bearer ' + config.OPENAI_API_KEY },
        formData: {
          model: 'whisper-1',
          language: 'es',
          file: { value: buffer, options: { filename: 'audio.' + ext, contentType: mimeType.split(';')[0].trim() } }
        }
      });
      const wParsed = typeof whisperResp === 'string' ? JSON.parse(whisperResp) : whisperResp;
      transcription = wParsed.text || '[Audio sin contenido]';
    }
  } catch(e) {
    transcription = '[El cliente envió un audio. Respóndele con un mensaje cálido y pídele que repita su mensaje por texto.]';
  }
  results.push({ json: { ...item.json, messageText: transcription, isAudio: false } });
}
return results;`;

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');

  const n = wf.nodes.find(n => n.id === 'n_transcribe');
  if (!n) { console.log('ERROR: n_transcribe not found'); return; }

  n.parameters.jsCode = newCode;

  const payload = {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings || {}, staticData: wf.staticData || null
  };

  const { status, body: result } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);

  if (status === 200) {
    const updated = result.nodes.find(n => n.id === 'n_transcribe');
    const code = updated.parameters.jsCode;
    console.log('OK — n_transcribe updated');
    console.log('Uses this.helpers:', code.includes('this.helpers.httpRequest'));
    console.log('Uses $input.all():', code.includes('$input.all()'));
    console.log('No $helpers:', !code.includes('$helpers'));
  } else {
    console.log('ERROR:', status, JSON.stringify(result).substring(0, 400));
  }
}

main().catch(console.error);
