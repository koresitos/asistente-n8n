const https = require('https');
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYzQ1OGMxYS05MzliLTQzNDUtOTFkZi1jNWIzNjE1ODE0ZmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmE1NjI0OWMtOTYzOS00NDc3LWI0NzUtNjA3YWZlYjlhNTU0IiwiaWF0IjoxNzcxMzcyNDc1fQ.5S-1bcZW1dygY4E6hLGgvYRJupkp2QqhNvuVOC3edTk';
const HOST = 'proyecto-prueba1-n8n.jzw5jm.easypanel.host';
const OPENAI_KEY = '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';
const EVOLUTION_URL = 'https://proyecto-prueba1-evolution-api.jzw5jm.easypanel.host/chat/getBase64FromMediaMessage/Kore';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';

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

const newJsCode = `const items = $input.all();
const results = [];
for (const item of items) {
  const body = item.json.body || item.json;
  const data = body.data || {};
  const key = data.key || {};
  const message = data.message || {};
  const messageType = data.messageType || '';
  const isAudio = messageType === 'audioMessage' || messageType === 'pttMessage';
  let isImage = messageType === 'imageMessage';
  const telefono = (key.remoteJid || '').replace('@s.whatsapp.net', '').replace('@g.us', '');

  if (!telefono) continue;

  const nombreWhatsApp = data.pushName || 'Cliente';
  let messageText = '';
  const rawMessage = JSON.parse(JSON.stringify(message));
  const rawKey = JSON.parse(JSON.stringify(key));

  if (message.conversation) {
    messageText = message.conversation;
  } else if (message.extendedTextMessage && message.extendedTextMessage.text) {
    messageText = message.extendedTextMessage.text;
  } else if (isImage) {
    const caption = (message.imageMessage && message.imageMessage.caption) || '';
    try {
      // 1. Download image base64 from Evolution API
      const b64Resp = await this.helpers.httpRequest({
        method: 'POST',
        url: '${EVOLUTION_URL}',
        headers: { apikey: '${EVOLUTION_KEY}' },
        json: true,
        body: { message: { key: rawKey, message: rawMessage }, convertToMp4: false }
      });
      const base64 = b64Resp.base64 || b64Resp.data || '';
      const mimeType = b64Resp.mimetype || 'image/jpeg';

      if (base64) {
        // 2. Send to GPT-4o Vision
        const visionResp = await this.helpers.httpRequest({
          method: 'POST',
          url: 'https://api.openai.com/v1/chat/completions',
          headers: { 'Authorization': 'Bearer ${OPENAI_KEY}' },
          json: true,
          body: {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: \`data:\${mimeType};base64,\${base64}\` } },
              { type: 'text', text: 'Describe brevemente este diseño o imagen para que una tienda de papelería personalizada entienda qué quiere el cliente. Máximo 2 oraciones en español.' }
            ]}],
            max_tokens: 150
          }
        });
        const description = visionResp.choices?.[0]?.message?.content || '';
        messageText = \`El cliente envió una imagen de referencia\${caption ? \` con el texto: "\${caption}"\` : ''}. Descripción del diseño: \${description}\`;
      } else {
        messageText = caption
          ? \`El cliente envió una imagen con el texto: "\${caption}". Trátalo como referencia de diseño y continúa ayudándole con su pedido.\`
          : 'El cliente envió una imagen de referencia de diseño. Hazle un comentario positivo y continúa ayudándole a armar su pedido.';
      }
    } catch(e) {
      const caption2 = (message.imageMessage && message.imageMessage.caption) || '';
      messageText = caption2
        ? \`El cliente envió una imagen con el texto: "\${caption2}". Trátalo como referencia de diseño y continúa ayudándole con su pedido.\`
        : 'El cliente envió una imagen de referencia de diseño. Hazle un comentario positivo y continúa ayudándole a armar su pedido.';
    }
    isImage = false;
  } else if (message.imageMessage && message.imageMessage.caption) {
    messageText = message.imageMessage.caption;
  }

  const instance = String(body.instance || '');
  results.push({ json: { telefono, nombreWhatsApp, messageText, isAudio, isImage, rawMessage, rawKey, instance } });
}
return results;`;

async function main() {
  const { body: wf } = await apiReq('GET', '/api/v1/workflows/fxRyp6etIlFVCjxY');

  const n3 = wf.nodes.find(n => n.id === 'n3');
  console.log('Updating n3 jsCode with json:true format...');
  n3.parameters.jsCode = newJsCode;

  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    staticData: wf.staticData || null
  };

  const { status, body: result } = await apiReq('PUT', '/api/v1/workflows/fxRyp6etIlFVCjxY', payload);

  if (status === 200) {
    const n3r = result.nodes.find(n => n.id === 'n3');
    const hasJsonTrue = n3r.parameters.jsCode.includes('json: true');
    const hasStringify = n3r.parameters.jsCode.includes('JSON.stringify');
    console.log('OK — n3 updated');
    console.log('Has json:true:', hasJsonTrue);
    console.log('Has JSON.stringify (should be false):', hasStringify);
  } else {
    console.log('ERROR:', status, JSON.stringify(result).substring(0, 600));
  }
}

main().catch(console.error);
