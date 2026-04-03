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

// HTTP Request node — descarga el audio de Evolution API (mismo patrón que n12)
const n_download_audio = {
  id: 'n_download_audio',
  name: 'Descargar Audio',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1472, 160],
  parameters: {
    method: 'POST',
    url: "={{ $('Config Mochas Place').first().json.config.EVOLUTION_API_URL + '/chat/getBase64FromMediaMessage/' + $('Config Mochas Place').first().json.config.EVOLUTION_INSTANCE }}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'apikey', value: "={{ $('Config Mochas Place').first().json.config.EVOLUTION_API_KEY }}" }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ {"message": {"key": $json.rawKey, "message": $json.rawMessage}, "convertToMp4": false} }}'
  }
};

// Code node — solo Whisper, lee base64 del nodo anterior y contexto de "¿Es audio?"
const transcribeCode = `const items = $input.all();
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
      // fallback amable ya asignado
    }
  }

  results.push({ json: { ...originalItem, messageText: transcription, isAudio: false } });
}
return results;`;

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');

  // Agregar n_download_audio si no existe
  if (!wf.nodes.find(n => n.id === 'n_download_audio')) {
    wf.nodes.push(n_download_audio);
    console.log('Added n_download_audio node');
  } else {
    console.log('n_download_audio already exists — updating');
    const n = wf.nodes.find(n => n.id === 'n_download_audio');
    Object.assign(n, n_download_audio);
  }

  // Actualizar n_transcribe: nuevo jsCode + posición + sin mode
  const n_transcribe = wf.nodes.find(n => n.id === 'n_transcribe');
  if (!n_transcribe) { console.log('ERROR: n_transcribe not found'); return; }
  delete n_transcribe.parameters.mode;
  n_transcribe.parameters.jsCode = transcribeCode;
  n_transcribe.position = [1620, 160];

  // Actualizar connections
  const conn = wf.connections;

  // n_audio_if[0]: quitar n_transcribe, agregar n_download_audio
  if (conn['¿Es audio?'] && conn['¿Es audio?'].main && conn['¿Es audio?'].main[0]) {
    conn['¿Es audio?'].main[0] = conn['¿Es audio?'].main[0].filter(c => c.node !== 'Transcribir Audio' && c.node !== 'n_transcribe');
    conn['¿Es audio?'].main[0].push({ node: 'Descargar Audio', type: 'main', index: 0 });
  } else if (conn['n_audio_if'] && conn['n_audio_if'].main && conn['n_audio_if'].main[0]) {
    conn['n_audio_if'].main[0] = conn['n_audio_if'].main[0].filter(c => c.node !== 'Transcribir Audio' && c.node !== 'n_transcribe');
    conn['n_audio_if'].main[0].push({ node: 'Descargar Audio', type: 'main', index: 0 });
  }

  // n_download_audio → n_transcribe
  conn['Descargar Audio'] = { main: [[{ node: 'Transcribir Audio', type: 'main', index: 0 }]] };

  const payload = {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings || {}, staticData: wf.staticData || null
  };

  const { status, body: result } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);

  if (status === 200) {
    const hasDownload = result.nodes.find(n => n.id === 'n_download_audio');
    const hasTranscribe = result.nodes.find(n => n.id === 'n_transcribe');
    console.log('OK — workflow updated');
    console.log('n_download_audio present:', !!hasDownload);
    console.log('n_transcribe mode:', hasTranscribe?.parameters?.mode || 'default (all-items)');
    console.log('n_transcribe uses $input.all():', hasTranscribe?.parameters?.jsCode?.includes('$input.all()'));
    const audioIfConn = result.connections['¿Es audio?'] || result.connections['n_audio_if'];
    console.log('audio_if[0] connections:', JSON.stringify(audioIfConn?.main?.[0]));
    console.log('Descargar Audio connections:', JSON.stringify(result.connections['Descargar Audio']));
  } else {
    console.log('ERROR:', status, JSON.stringify(result).substring(0, 500));
  }
}

main().catch(console.error);
