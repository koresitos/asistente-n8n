const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYzQ1OGMxYS05MzliLTQzNDUtOTFkZi1jNWIzNjE1ODE0ZmQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNmE1NjI0OWMtOTYzOS00NDc3LWI0NzUtNjA3YWZlYjlhNTU0IiwiaWF0IjoxNzcxMzcyNDc1fQ.5S-1bcZW1dygY4E6hLGgvYRJupkp2QqhNvuVOC3edTk';
const HOST = 'proyecto-prueba1-n8n.jzw5jm.easypanel.host';
const WORKFLOW_ID = '6ylMMPFQwEEpUOw1';

// ── JS Code strings (using template literals so $ signs are safe) ──

const jsCode_n3 = `const items = $input.all();
const filtered = items.filter(i => i.json.Estado === 'Generar');
if (filtered.length === 0) return [];
return filtered.map((item, idx) => ({
  json: {
    ...item.json,
    ID: 'POST-' + Date.now() + '-' + idx,
    Fecha_Generacion: new Date().toISOString()
  }
}));`;

const jsCode_brand = `const items = $input.all();
const brand = {
  empresa: "Xore",
  tagline: "Impulsa tu negocio con IA",
  descripcion: "Empresa mexicana de automatización con IA: chatbots, workflows inteligentes y optimización de procesos para negocios.",
  tono: "Profesional, directo, confiable. Sin hipérboles ni lenguaje informal.",
  paleta: "Solo escala de grises: negro, gris carbón (#636363), gris medio (#999), blanco. NUNCA colores vibrantes.",
  estilo_visual: "Minimalista, monocromático. Fondo gris carbón oscuro o negro. Texto blanco. Espacio negativo abundante. Formas geométricas limpias.",
  referencias_estilo: "respond.io, Notion, Linear — minimalismo B2B tech"
};
return items.map(item => ({ json: { ...item.json, brand } }));`;

const sysMsg_n4 = `Eres el redactor de contenido de Xore (xore.com.mx), empresa mexicana de automatización con inteligencia artificial — chatbots, workflows inteligentes y optimización de procesos para negocios.

## Voz y tono
- Profesional y directo. Sin exclamaciones ni lenguaje cheerful.
- Confiable y experto, nunca genérico.
- Cercano para el mercado mexicano B2B.
- Tagline: "Impulsa tu negocio con IA"

## Formato del caption
- Idioma: español
- Longitud: 3 a 5 oraciones concisas, sin relleno
- Emojis: máximo 1 o 2, solo si refuerzan el mensaje. Preferir ninguno en temas técnicos.
- Estructura: insight o problema directo → propuesta de valor de Xore → CTA corto
- Hashtags: 3 a 4, mezclando español e inglés: #AutomatizaciónIA #Chatbots #TransformaciónDigital #Xore (variar por tema)
- EVITAR: "¿Sabías que...?", "En el mundo actual", "La IA está revolucionando", cualquier cliché de marketing genérico`;

const userMsg_n4 = `={{ 'Crea un caption para una publicación sobre: ' + $json.Tema }}`;

const dallePrompt = `={{ "Imagen minimalista en escala de grises para post de redes sociales B2B sobre: " + $('Brand Config Xore').item.json.Tema + ". ESTILO OBLIGATORIO: Fondo gris carbón oscuro (#636363) o negro. Elementos en blanco y grises. SIN colores vibrantes, sin azules, rojos, verdes ni cualquier color saturado. Paleta exclusiva: negro, gris oscuro, gris medio, blanco. Abundante espacio negativo. Formas geométricas simples, líneas limpias. Estética de marca tech profesional comparable a Notion, Linear, respond.io. Empresa: Xore — automatización IA para negocios. Formato cuadrado 1:1. Sin texto en la imagen. Alta calidad." }}`;

const jsCode_n6 = `const dalleItems = $input.all();
return dalleItems.map((item, i) => {
  const original = $('Filtrar y Asignar ID').all()[i].json;
  const captionNode = $('GPT-4 Caption').all()[i].json;
  const caption = captionNode.content || captionNode.message?.content || '';
  const dalleUrl = item.json.url || (item.json.data && item.json.data[0] && item.json.data[0].url) || '';
  return {
    json: {
      ID: original.ID,
      Tema: original.Tema,
      Caption: caption,
      dalleUrl: dalleUrl,
      Fecha_Generacion: original.Fecha_Generacion
    }
  };
});`;

const jsCode_n8 = `const items = $input.all();
return items.map((item, i) => {
  const assembled = $('Ensamblar Datos').all()[i].json;
  const imgbbUrl = item.json.data && item.json.data.url ? item.json.data.url : '';
  return {
    json: {
      ID: assembled.ID,
      Tema: assembled.Tema,
      Caption: assembled.Caption,
      Imagen_URL: imgbbUrl,
      Estado: imgbbUrl ? 'Pendiente' : 'Error',
      Fecha_Generacion: assembled.Fecha_Generacion,
      Notas: imgbbUrl ? '' : 'Error al subir imagen a imgbb'
    }
  };
});`;

// ── Build the full workflow object ──

const workflow = {
  name: 'Social Media - 1. Generador de Contenido IA',
  nodes: [
    {
      parameters: { rule: { interval: [{ field: 'hours' }] } },
      id: 'n1',
      name: 'Cada Hora',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [0, 304]
    },
    {
      parameters: {
        documentId: { __rl: true, value: '1X0d9ACtDpTm1lxk_vRMIbH12ewEtPUCKPkovO_jdZtU', mode: 'id' },
        sheetName: { __rl: true, value: '0', mode: 'id' },
        options: {}
      },
      id: 'n2',
      name: 'Leer Google Sheets',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.7,
      position: [224, 304],
      credentials: { googleSheetsOAuth2Api: { id: 'Hinq1zvIUfOScFkQ', name: 'Google Sheets account 2' } }
    },
    {
      parameters: { jsCode: jsCode_n3 },
      id: 'n3',
      name: 'Filtrar y Asignar ID',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [448, 304]
    },
    {
      parameters: { jsCode: jsCode_brand, mode: 'runOnceForAllItems' },
      id: 'n_brand',
      name: 'Brand Config Xore',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [672, 304]
    },
    {
      parameters: {
        resource: 'chat',
        chatModel: 'gpt-4o',
        prompt: {
          messages: [
            { role: 'system', content: sysMsg_n4 },
            { content: userMsg_n4 }
          ]
        },
        options: { maxTokens: 600 },
        requestOptions: {}
      },
      id: 'n4',
      name: 'GPT-4 Caption',
      type: 'n8n-nodes-base.openAi',
      typeVersion: 1.1,
      position: [896, 304],
      credentials: { openAiApi: { id: 'ygGLz97gkFj8HpaV', name: 'OpenAi account' } }
    },
    {
      parameters: {
        resource: 'image',
        prompt: dallePrompt,
        imageModel: 'dall-e-3',
        responseFormat: 'imageUrl',
        options: {},
        requestOptions: {}
      },
      id: 'n5',
      name: 'DALL-E 3 Imagen',
      type: 'n8n-nodes-base.openAi',
      typeVersion: 1.1,
      position: [1120, 304],
      credentials: { openAiApi: { id: 'ygGLz97gkFj8HpaV', name: 'OpenAi account' } }
    },
    {
      parameters: { jsCode: jsCode_n6 },
      id: 'n6',
      name: 'Ensamblar Datos',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1344, 304]
    },
    {
      parameters: {
        method: 'POST',
        url: 'https://api.imgbb.com/1/upload',
        sendBody: true,
        contentType: 'form-urlencoded',
        bodyParameters: {
          parameters: [
            { name: 'key', value: '=1fe55886f29436e3afc4ef143cfb6c7b' },
            { name: 'image', value: `={{ $json.dalleUrl }}` },
            { name: 'expiration', value: '0' }
          ]
        },
        options: {}
      },
      id: 'n7',
      name: 'Subir a imgbb',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1568, 304]
    },
    {
      parameters: { jsCode: jsCode_n8 },
      id: 'n8',
      name: 'Preparar Update Sheets',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1792, 304]
    },
    {
      parameters: {
        operation: 'appendOrUpdate',
        documentId: { __rl: true, mode: 'id', value: '1X0d9ACtDpTm1lxk_vRMIbH12ewEtPUCKPkovO_jdZtU' },
        sheetName: { __rl: true, value: '0', mode: 'id' },
        columns: {
          mappingMode: 'defineBelow',
          value: {
            Tema: `={{ $json.Tema }}`,
            ID: `={{ $json.ID }}`,
            Caption: `={{ $json.Caption }}`,
            Imagen_URL: `={{ $json.Imagen_URL }}`,
            Estado: `={{ $json.Estado }}`,
            Fecha_Generacion: `={{ $json.Fecha_Generacion }}`,
            Notas: `={{ $json.Notas }}`
          },
          matchingColumns: ['Tema'],
          schema: []
        },
        options: {}
      },
      id: 'n9',
      name: 'Actualizar Sheets',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.7,
      position: [2016, 304],
      credentials: { googleSheetsOAuth2Api: { id: 'Hinq1zvIUfOScFkQ', name: 'Google Sheets account 2' } }
    }
  ],
  connections: {
    'Cada Hora': { main: [[{ node: 'Leer Google Sheets', type: 'main', index: 0 }]] },
    'Leer Google Sheets': { main: [[{ node: 'Filtrar y Asignar ID', type: 'main', index: 0 }]] },
    'Filtrar y Asignar ID': { main: [[{ node: 'Brand Config Xore', type: 'main', index: 0 }]] },
    'Brand Config Xore': {
      main: [[
        { node: 'GPT-4 Caption', type: 'main', index: 0 },
        { node: 'DALL-E 3 Imagen', type: 'main', index: 0 }
      ]]
    },
    'GPT-4 Caption': { main: [[{ node: 'DALL-E 3 Imagen', type: 'main', index: 0 }]] },
    'DALL-E 3 Imagen': { main: [[{ node: 'Ensamblar Datos', type: 'main', index: 0 }]] },
    'Ensamblar Datos': { main: [[{ node: 'Subir a imgbb', type: 'main', index: 0 }]] },
    'Subir a imgbb': { main: [[{ node: 'Preparar Update Sheets', type: 'main', index: 0 }]] },
    'Preparar Update Sheets': { main: [[{ node: 'Actualizar Sheets', type: 'main', index: 0 }]] }
  },
  settings: {
    executionOrder: 'v1',
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'all',
    callerPolicy: 'workflowsFromSameOwner',
    timezone: 'America/Mexico_City'
  },
};

// ── Send the update via HTTPS PUT ──

const body = JSON.stringify(workflow);

const options = {
  hostname: HOST,
  path: `/api/v1/workflows/${WORKFLOW_ID}`,
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Sending PUT request...');
console.log('Payload size:', body.length, 'bytes');
console.log('Node count:', workflow.nodes.length);
console.log('Connection keys:', Object.keys(workflow.connections).join(', '));

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('\nHTTP Status:', res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 201) {
      const j = JSON.parse(data);
      console.log('SUCCESS! Workflow updated.');
      console.log('Workflow ID:', j.id);
      console.log('Workflow name:', j.name);
      console.log('Node count in response:', j.nodes ? j.nodes.length : 'N/A');
      // Verify Brand Config Xore node exists
      if (j.nodes) {
        const brand = j.nodes.find(n => n.name === 'Brand Config Xore');
        console.log('Brand Config Xore node:', brand ? 'FOUND at position ' + JSON.stringify(brand.position) : 'NOT FOUND');
        const n4 = j.nodes.find(n => n.name === 'GPT-4 Caption');
        console.log('GPT-4 Caption position:', n4 ? JSON.stringify(n4.position) : 'NOT FOUND');
        const n5 = j.nodes.find(n => n.name === 'DALL-E 3 Imagen');
        console.log('DALL-E 3 Imagen position:', n5 ? JSON.stringify(n5.position) : 'NOT FOUND');
      }
    } else {
      console.log('ERROR response:');
      console.log(data.substring(0, 2000));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(body);
req.end();
