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

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');

  const n = wf.nodes.find(n => n.id === 'n_whisper_http');
  if (!n) { console.log('ERROR: n_whisper_http not found'); return; }

  // Usar credencial de n8n en lugar de header manual
  n.parameters = {
    method: 'POST',
    url: 'https://api.openai.com/v1/audio/transcriptions',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'openAiApi',
    sendBody: true,
    contentType: 'multipart-form-data',
    bodyParameters: {
      parameters: [
        { parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'audio' },
        { parameterType: 'formData', name: 'model', value: 'whisper-1' },
        { parameterType: 'formData', name: 'language', value: 'es' }
      ]
    }
  };

  // Asociar la credencial OpenAI que ya usa el nodo "ChatGPT"
  n.credentials = {
    openAiApi: { id: 'ygGLz97gkFj8HpaV', name: 'OpenAi account' }
  };

  const payload = {
    name: wf.name, nodes: wf.nodes, connections: wf.connections,
    settings: wf.settings || {}, staticData: wf.staticData || null
  };

  const { status, body: result } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);

  if (status === 200) {
    const updated = result.nodes.find(n => n.id === 'n_whisper_http');
    console.log('OK — credencial OpenAI aplicada');
    console.log('authentication:', updated.parameters.authentication);
    console.log('nodeCredentialType:', updated.parameters.nodeCredentialType);
    console.log('credentials:', JSON.stringify(updated.credentials));
  } else {
    console.log('ERROR:', status, JSON.stringify(result).substring(0, 500));
  }
}

main().catch(console.error);
