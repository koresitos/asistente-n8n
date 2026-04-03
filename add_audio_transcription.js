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

// Nodo IF: ¿Es audio?
const n_audio_if = {
  id: 'n_audio_if',
  name: '¿Es audio?',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.3,
  position: [1232, 272],
  parameters: {
    conditions: {
      options: { version: 2, caseSensitive: true, typeValidation: 'strict' },
      conditions: [{
        id: 'c1',
        leftValue: '={{ String($json.isAudio) }}',
        rightValue: 'true',
        operator: { type: 'string', operation: 'equals' }
      }],
      combinator: 'and'
    },
    options: {}
  }
};

// Nodo Code: Transcribir Audio
const transcribeCode = `const config = $json.config;
let transcription = '[Audio sin contenido]';
try {
  // 1. Descargar audio desde Evolution API
  const audioResp = await $helpers.httpRequest({
    method: 'POST',
    url: config.EVOLUTION_API_URL + '/chat/getBase64FromMediaMessage/' + config.EVOLUTION_INSTANCE,
    headers: { apikey: config.EVOLUTION_API_KEY },
    json: true,
    body: { message: { key: $json.rawKey, message: $json.rawMessage }, convertToMp4: false }
  });
  const audioB64 = audioResp.base64 || '';
  const mimeType = audioResp.mimetype || 'audio/ogg';

  if (audioB64) {
    // 2. Transcribir con Whisper
    const buffer = Buffer.from(audioB64, 'base64');
    const ext = mimeType.includes('mp4') ? 'mp4' : 'ogg';
    const whisperResp = await $helpers.httpRequest({
      method: 'POST',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      headers: { 'Authorization': 'Bearer ' + config.OPENAI_API_KEY },
      formData: {
        model: 'whisper-1',
        language: 'es',
        file: { value: buffer, options: { filename: 'audio.' + ext, contentType: mimeType.split(';')[0].trim() } }
      }
    });
    transcription = whisperResp.text || '[Audio sin contenido]';
  }
} catch(e) {
  transcription = '[El cliente envió un audio. Respóndele con un mensaje cálido y pídele que repita su mensaje por texto.]';
}

return { json: { ...$json, messageText: transcription, isAudio: false } };`;

const n_transcribe = {
  id: 'n_transcribe',
  name: 'Transcribir Audio',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [1472, 160],
  parameters: {
    mode: 'runOnceForEachItem',
    jsCode: transcribeCode
  }
};

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');

  // Verificar que no existan ya
  if (wf.nodes.find(n => n.id === 'n_audio_if')) {
    console.log('n_audio_if already exists — skipping');
    return;
  }

  // Agregar nuevos nodos
  wf.nodes.push(n_audio_if);
  wf.nodes.push(n_transcribe);

  // Actualizar connections
  const conn = wf.connections;

  // Quitar n4 → n7 (main[0][0])
  if (conn.n4 && conn.n4.main && conn.n4.main[0]) {
    conn.n4.main[0] = conn.n4.main[0].filter(c => c.node !== 'n7');
  }

  // n4 → n_audio_if
  if (!conn.n4) conn.n4 = { main: [[]] };
  if (!conn.n4.main[0]) conn.n4.main[0] = [];
  conn.n4.main[0].push({ node: 'n_audio_if', type: 'main', index: 0 });

  // n_audio_if[0] TRUE → n_transcribe
  conn.n_audio_if = {
    main: [
      [{ node: 'n_transcribe', type: 'main', index: 0 }],  // TRUE
      [{ node: 'n7', type: 'main', index: 0 }]             // FALSE
    ]
  };

  // n_transcribe → n7
  conn.n_transcribe = {
    main: [[{ node: 'n7', type: 'main', index: 0 }]]
  };

  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    staticData: wf.staticData || null
  };

  const { status, body: result } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);

  if (status === 200) {
    const hasIf = result.nodes.find(n => n.id === 'n_audio_if');
    const hasCode = result.nodes.find(n => n.id === 'n_transcribe');
    const n4conn = result.connections.n4?.main?.[0];
    console.log('OK — workflow updated');
    console.log('n_audio_if added:', !!hasIf);
    console.log('n_transcribe added:', !!hasCode);
    console.log('n4 connections:', JSON.stringify(n4conn));
    console.log('n_audio_if connections:', JSON.stringify(result.connections.n_audio_if));
  } else {
    console.log('ERROR:', status, JSON.stringify(result).substring(0, 600));
  }
}

main().catch(console.error);
