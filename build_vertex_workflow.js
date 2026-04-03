const fs = require('fs');

const jsCode_filtrar = `const items = $input.all();
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

// The privateKey in n8n env vars stores \\n as literal two chars; split('\\\\n').join('\\n') converts them to real newlines
const jsCode_auth_jwt = `const items = $input.all();

const clientEmail = $env.VERTEX_CLIENT_EMAIL;
let privateKey = $env.VERTEX_PRIVATE_KEY;
privateKey = privateKey.split('\\\\n').join('\\n');

const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: clientEmail,
  scope: 'https://www.googleapis.com/auth/cloud-platform',
  aud: 'https://oauth2.googleapis.com/token',
  exp: now + 3600,
  iat: now
};

function base64url(obj) {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_');
}

const header = { alg: 'RS256', typ: 'JWT' };
const signingInput = base64url(header) + '.' + base64url(payload);

const crypto = require('crypto');
const sign = crypto.createSign('RSA-SHA256');
sign.update(signingInput);
const signature = sign.sign(privateKey, 'base64')
  .replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_');

const jwt = signingInput + '.' + signature;

const tokenResponse = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://oauth2.googleapis.com/token',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: \`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=\${jwt}\`
});

return items.map(item => ({ json: { ...item.json, accessToken: tokenResponse.access_token } }));`;

const jsCode_ensamblar = `const dalleItems = $input.all();
return dalleItems.map((item, i) => {
  const original = $('Filtrar y Asignar ID').all()[i].json;
  const captionNode = $('GPT-4 Caption').all()[i].json;
  const caption = captionNode.content || captionNode.message?.content || '';
  const imageBase64 = (item.json.predictions && item.json.predictions[0] && item.json.predictions[0].bytesBase64Encoded) || '';
  return {
    json: {
      ID: original.ID,
      Tema: original.Tema,
      Caption: caption,
      dalleUrl: imageBase64,
      Fecha_Generacion: original.Fecha_Generacion
    }
  };
});`;

const jsCode_preparar = `const items = $input.all();
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

const caption_system = `Eres el redactor de contenido de Xore (xore.com.mx), empresa mexicana de automatización con inteligencia artificial — chatbots, workflows inteligentes y optimización de procesos para negocios.

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

const visual_system = `Eres un director creativo especializado en diseño gráfico minimalista para redes sociales B2B tech.
Tu tarea: transformar un tema de negocio en una descripción visual concreta para generar una imagen con IA.

REGLAS DE DISEÑO (marca Xore — siempre aplicar):
- Fondo negro puro o gris carbón muy oscuro
- Paleta ESTRICTA: solo negro, gris oscuro, gris claro, blanco. CERO colores
- Estilo: ilustración digital 2D plana, minimalista, NO renders 3D ni fotorrealismo
- Máximo 2-3 elementos visuales principales, mucho espacio vacío
- Si incluye texto: máximo 6 palabras cortas, tipografía bold sans-serif blanca, legible
- Sin decoraciones innecesarias

Responde ÚNICAMENTE con el prompt visual en inglés (máximo 100 palabras), listo para Vertex AI Imagen.
Describe: elemento visual central, composición, paleta, si incluye texto y cuál.`;

const vertex_url = "=https://us-central1-aiplatform.googleapis.com/v1/projects/{{ $env.VERTEX_PROJECT_ID }}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict";

const vertex_body = "={{ JSON.stringify({ instances: [{ prompt: $('GPT Diseñador Visual').item.json.content || $('GPT Diseñador Visual').item.json.message.content }], parameters: { sampleCount: 1, aspectRatio: '1:1' } }) }}";

const workflow = {
  name: "Social Media - 1. Generador de Contenido IA",
  active: false,
  settings: {
    executionOrder: "v1",
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all",
    callerPolicy: "workflowsFromSameOwner",
    availableInMCP: false,
    timeSavedMode: "fixed",
    timezone: "America/Mexico_City",
    binaryMode: "separate"
  },
  staticData: null,
  meta: { templateCredsSetupCompleted: true },
  pinData: {},
  nodes: [
    {
      parameters: { rule: { interval: [{ field: "hours" }] } },
      id: "n1",
      name: "Cada Hora",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [0, 304]
    },
    {
      parameters: {
        documentId: { __rl: true, value: "1X0d9ACtDpTm1lxk_vRMIbH12ewEtPUCKPkovO_jdZtU", mode: "id" },
        sheetName: { __rl: true, value: "0", mode: "id" },
        options: {}
      },
      id: "n2",
      name: "Leer Google Sheets",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.7,
      position: [224, 304],
      credentials: { googleSheetsOAuth2Api: { id: "Hinq1zvIUfOScFkQ", name: "Google Sheets account 2" } }
    },
    {
      parameters: { jsCode: jsCode_filtrar },
      id: "n3",
      name: "Filtrar y Asignar ID",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [448, 304]
    },
    {
      parameters: { jsCode: jsCode_brand, mode: "runOnceForAllItems" },
      id: "n_brand",
      name: "Brand Config Xore",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [672, 304]
    },
    {
      parameters: {
        resource: "chat",
        chatModel: "gpt-4o",
        prompt: {
          messages: [
            { role: "system", content: caption_system },
            { content: "={{ 'Crea un caption para una publicación sobre: ' + $json.Tema }}" }
          ]
        },
        options: { maxTokens: 600 },
        requestOptions: {}
      },
      id: "n4",
      name: "GPT-4 Caption",
      type: "n8n-nodes-base.openAi",
      typeVersion: 1.1,
      position: [896, 304],
      credentials: { openAiApi: { id: "ygGLz97gkFj8HpaV", name: "OpenAi account" } }
    },
    {
      id: "n_visual",
      name: "GPT Diseñador Visual",
      type: "n8n-nodes-base.openAi",
      typeVersion: 1.1,
      position: [1120, 304],
      parameters: {
        resource: "chat",
        chatModel: "gpt-4o-mini",
        prompt: {
          messages: [
            { role: "system", content: visual_system },
            { content: "={{ 'Diseña la imagen para este tema: ' + $json.Tema }}" }
          ]
        },
        options: { maxTokens: 200 },
        requestOptions: {}
      },
      credentials: { openAiApi: { id: "ygGLz97gkFj8HpaV", name: "OpenAi account" } }
    },
    {
      id: "n_auth_jwt",
      name: "Obtener Token Vertex AI",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1344, 304],
      parameters: {
        mode: "runOnceForAllItems",
        jsCode: jsCode_auth_jwt
      }
    },
    {
      id: "n_vertex",
      name: "Vertex AI Imagen 3",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1568, 304],
      parameters: {
        method: "POST",
        url: vertex_url,
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "={{ 'Bearer ' + $json.accessToken }}" },
            { name: "Content-Type", value: "application/json" }
          ]
        },
        sendBody: true,
        contentType: "raw",
        rawContentType: "application/json",
        body: vertex_body,
        options: {}
      }
    },
    {
      parameters: { jsCode: jsCode_ensamblar },
      id: "n6",
      name: "Ensamblar Datos",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1792, 304]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.imgbb.com/1/upload",
        sendBody: true,
        contentType: "form-urlencoded",
        bodyParameters: {
          parameters: [
            { name: "key", value: "=1fe55886f29436e3afc4ef143cfb6c7b" },
            { name: "image", value: "={{ $json.dalleUrl }}" },
            { name: "expiration", value: "0" }
          ]
        },
        options: {}
      },
      id: "n7",
      name: "Subir a imgbb",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [2016, 304]
    },
    {
      parameters: { jsCode: jsCode_preparar },
      id: "n8",
      name: "Preparar Update Sheets",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2240, 304]
    },
    {
      parameters: {
        operation: "appendOrUpdate",
        documentId: { __rl: true, mode: "id", value: "1X0d9ACtDpTm1lxk_vRMIbH12ewEtPUCKPkovO_jdZtU" },
        sheetName: { __rl: true, value: "0", mode: "id" },
        columns: {
          mappingMode: "defineBelow",
          value: {
            Tema: "={{ $json.Tema }}",
            ID: "={{ $json.ID }}",
            Caption: "={{ $json.Caption }}",
            Imagen_URL: "={{ $json.Imagen_URL }}",
            Estado: "={{ $json.Estado }}",
            Fecha_Generacion: "={{ $json.Fecha_Generacion }}",
            Notas: "={{ $json.Notas }}"
          },
          matchingColumns: ["Tema"],
          schema: []
        },
        options: {}
      },
      id: "n9",
      name: "Actualizar Sheets",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.7,
      position: [2464, 304],
      credentials: { googleSheetsOAuth2Api: { id: "Hinq1zvIUfOScFkQ", name: "Google Sheets account 2" } }
    }
  ],
  connections: {
    "Cada Hora": { main: [[{ node: "Leer Google Sheets", type: "main", index: 0 }]] },
    "Leer Google Sheets": { main: [[{ node: "Filtrar y Asignar ID", type: "main", index: 0 }]] },
    "Filtrar y Asignar ID": { main: [[{ node: "Brand Config Xore", type: "main", index: 0 }]] },
    "Brand Config Xore": { main: [[{ node: "GPT-4 Caption", type: "main", index: 0 }]] },
    "GPT-4 Caption": { main: [[{ node: "GPT Diseñador Visual", type: "main", index: 0 }]] },
    "GPT Diseñador Visual": { main: [[{ node: "Obtener Token Vertex AI", type: "main", index: 0 }]] },
    "Obtener Token Vertex AI": { main: [[{ node: "Vertex AI Imagen 3", type: "main", index: 0 }]] },
    "Vertex AI Imagen 3": { main: [[{ node: "Ensamblar Datos", type: "main", index: 0 }]] },
    "Ensamblar Datos": { main: [[{ node: "Subir a imgbb", type: "main", index: 0 }]] },
    "Subir a imgbb": { main: [[{ node: "Preparar Update Sheets", type: "main", index: 0 }]] },
    "Preparar Update Sheets": { main: [[{ node: "Actualizar Sheets", type: "main", index: 0 }]] }
  }
};

const outPath = 'c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/vertex_workflow_update.json';
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('JSON written successfully to:', outPath);
console.log('Nodes count:', workflow.nodes.length);
console.log('JSON size:', JSON.stringify(workflow).length, 'chars');

// Verify auth jwt code split line
const authNode = workflow.nodes.find(n => n.id === 'n_auth_jwt');
const splitLine = authNode.parameters.jsCode.split('\n').find(l => l.includes('split'));
console.log('Auth JWT split line:', splitLine);
