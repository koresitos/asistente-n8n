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

// Nodo 1: Preparar Binario — convierte base64 → binary property de n8n
const n_audio_binary = {
  id: 'n_audio_binary',
  name: 'Preparar Binario',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [1620, 160],
  parameters: {
    jsCode: `const items = $input.all();
const results = [];
for (const item of items) {
  const audioB64 = item.json.base64 || item.json.data || '';
  const mimeType = (item.json.mimetype || 'audio/ogg').split(';')[0].trim();
  const ext = mimeType.includes('mp4') ? 'mp4' : 'ogg';
  const buffer = Buffer.from(audioB64, 'base64');
  const binaryData = await this.helpers.prepareBinaryData(buffer, 'audio.' + ext, mimeType);
  results.push({ json: item.json, binary: { audio: binaryData } });
}
return results;`
  }
};

// Nodo 2: Transcribir Whisper — HTTP Request a OpenAI
const n_whisper_http = {
  id: 'n_whisper_http',
  name: 'Transcribir Whisper',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1768, 160],
  parameters: {
    method: 'POST',
    url: 'https://api.openai.com/v1/audio/transcriptions',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: "=Bearer {{ $('Config Mochas Place').first().json.config.OPENAI_API_KEY }}" }
      ]
    },
    sendBody: true,
    contentType: 'multipart-form-data',
    bodyParameters: {
      parameters: [
        { parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'audio' },
        { parameterType: 'formData', name: 'model', value: 'whisper-1' },
        { parameterType: 'formData', name: 'language', value: 'es' }
      ]
    }
  }
};

// n_transcribe actualizado: solo formatea — lee $json.text de Whisper
const transcribeCode = `const items = $input.all();
const results = [];
for (const item of items) {
  const transcription = item.json.text || '[El cliente envió un audio. Respóndele con un mensaje cálido y pídele que repita su mensaje por texto.]';
  const originalItem = $('¿Es audio?').first().json;
  results.push({ json: { ...originalItem, messageText: transcription, isAudio: false } });
}
return results;`;

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');

  // 1. Agregar/actualizar n_audio_binary
  const existingBinary = wf.nodes.find(n => n.id === 'n_audio_binary');
  if (existingBinary) {
    Object.assign(existingBinary, n_audio_binary);
    console.log('Updated n_audio_binary');
  } else {
    wf.nodes.push(n_audio_binary);
    console.log('Added n_audio_binary');
  }

  // 2. Agregar/actualizar n_whisper_http
  const existingWhisper = wf.nodes.find(n => n.id === 'n_whisper_http');
  if (existingWhisper) {
    Object.assign(existingWhisper, n_whisper_http);
    console.log('Updated n_whisper_http');
  } else {
    wf.nodes.push(n_whisper_http);
    console.log('Added n_whisper_http');
  }

  // 3. Actualizar n_transcribe (posición + código simplificado)
  const n_transcribe = wf.nodes.find(n => n.id === 'n_transcribe');
  if (!n_transcribe) { console.log('ERROR: n_transcribe not found'); return; }
  delete n_transcribe.parameters.mode;
  n_transcribe.parameters.jsCode = transcribeCode;
  n_transcribe.position = [1916, 160];
  console.log('Updated n_transcribe');

  // 4. Actualizar conexiones del tramo de audio
  const conn = wf.connections;

  // Descargar Audio → Preparar Binario (quitar cualquier conexión directa a Transcribir Audio)
  conn['Descargar Audio'] = { main: [[{ node: 'Preparar Binario', type: 'main', index: 0 }]] };

  // Preparar Binario → Transcribir Whisper
  conn['Preparar Binario'] = { main: [[{ node: 'Transcribir Whisper', type: 'main', index: 0 }]] };

  // Transcribir Whisper → Transcribir Audio (n_transcribe)
  conn['Transcribir Whisper'] = { main: [[{ node: 'Transcribir Audio', type: 'main', index: 0 }]] };

  console.log('Connections updated');

  const payload = {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings || {}, staticData: wf.staticData || null
  };

  const { status, body: result } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);

  if (status === 200) {
    console.log('OK — workflow actualizado');
    const nodeNames = result.nodes.map(n => n.name);
    console.log('Nodos con "audio":', nodeNames.filter(n => n.toLowerCase().includes('audio') || n.toLowerCase().includes('whisper') || n.toLowerCase().includes('binario')));
    console.log('Conn Descargar Audio:', JSON.stringify(result.connections['Descargar Audio']));
    console.log('Conn Preparar Binario:', JSON.stringify(result.connections['Preparar Binario']));
    console.log('Conn Transcribir Whisper:', JSON.stringify(result.connections['Transcribir Whisper']));
  } else {
    console.log('ERROR:', status, JSON.stringify(result).substring(0, 500));
  }
}

main().catch(console.error);
