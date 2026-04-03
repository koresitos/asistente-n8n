const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf.json', 'utf8'));

// FIX 1: Swap IF Es imagen connections
wf.connections['IF Es imagen'].main = [
  [{ node: 'Procesar Imagen', type: 'main', index: 0 }],
  [{ node: 'Asistente Mocha', type: 'main', index: 0 }]
];

// FIX 2+3: Update Config node systemPrompt
// NOTE: \n in jsCode are literal \n (backslash+n), so we use \n in replace strings
const configNode = wf.nodes.find(n => n.name === 'Config Mochas Place');
let jsCode = configNode.parameters.jsCode;

// -- Fix horario --
const oldHorario = '**Horario**: Lunes a Viernes 9:30am\u20137:00pm | S\u00e1bados 10:00am\u20131:30pm\n**Domingos**: Cerrado';
const newHorario = '**Horario**: Lunes a Viernes 9:30am\u20137:00pm | S\u00e1bados 10:00am\u20131:30pm | Domingos: cerrado\n\nNUNCA confirmes citas, recogidas ni entregas fuera del horario. Si el cliente solicita una hora o d\u00eda fuera del horario de atenci\u00f3n, ind\u00edcale \u00fanicamente: \\"Solo podemos atenderte en nuestro horario: Lunes a Viernes 9:30 AM \u2013 7:00 PM | S\u00e1bados 10:00 AM \u2013 1:30 PM.\\" No sugieras ni negocies otros horarios.';

if (!jsCode.includes(oldHorario)) {
  console.error('ERROR: old horario not found!');
  console.log('Searching for fragment...');
  console.log(JSON.stringify(jsCode.substring(jsCode.indexOf('Horario'), jsCode.indexOf('Horario')+120)));
  process.exit(1);
}
jsCode = jsCode.replace(oldHorario, newHorario);

// -- Fix pedido section --
const oldPedido = 'C\u00f3mo tomar un pedido\nCuando el cliente confirme que quiere hacer un pedido, recopila:\n1. Nombre del cliente\n2. Producto(s) que desea\n3. Cantidad\n4. Personalizaci\u00f3n requerida (dise\u00f1o, texto, colores, etc.)\n5. M\u00e9todo de entrega (env\u00edo Uber o recoger en tienda)\n6. Cualquier nota adicional\n\nSi el cliente env\u00eda una imagen, \u00fatil tratarla como la referencia del dise\u00f1o que desea. Confirma el dise\u00f1o y contin\u00faa recopilando los dem\u00e1s datos del pedido.';
const newPedido = 'C\u00f3mo tomar un pedido\nCuando el cliente confirme que quiere hacer un pedido, recopila en este orden:\n1. Nombre del cliente\n2. Producto(s) que desea\n3. Cantidad\n4. Dise\u00f1o/personalizaci\u00f3n (texto, colores, tema, imagen de referencia enviada, etc.)\n5. **Tama\u00f1o** \u2014 SOLO para productos con dise\u00f1o personalizado (impresiones comestibles, toppers, acr\u00edlicos, cortadores, stencils, gelapaletas, etc.):\n   - C\u00edrculos para cupcakes: tama\u00f1o est\u00e1ndar 4.5 cm. Si el cliente pide otro tama\u00f1o, av\u00edsale: \\"Ese tama\u00f1o lo podemos hacer, pero el corte lo tendr\u00edas que hacer t\u00fa \u2014 nosotros no lo cortamos.\\"\n   - Gelapaletas: tama\u00f1o est\u00e1ndar 4.2 cm. Mismo aviso si pide un tama\u00f1o diferente.\n   - Dem\u00e1s productos con dise\u00f1o personalizado: pregunta el tama\u00f1o espec\u00edfico que necesita.\n   - Productos ya elaborados sin personalizaci\u00f3n (colorante, wrapper est\u00e1ndar, etc.): NO preguntar tama\u00f1o.\n6. M\u00e9todo de entrega (env\u00edo Uber o recoger en tienda)\n7. Notas adicionales\n\nSi el cliente env\u00eda una imagen, tr\u00e1tala como la referencia del dise\u00f1o que desea. Confirma el dise\u00f1o y contin\u00faa recopilando los dem\u00e1s datos del pedido.';

if (!jsCode.includes(oldPedido)) {
  console.error('ERROR: old pedido not found!');
  const idx = jsCode.indexOf('Personaliz');
  console.log(JSON.stringify(jsCode.substring(idx-100, idx+300)));
  process.exit(1);
}
jsCode = jsCode.replace(oldPedido, newPedido);

configNode.parameters.jsCode = jsCode;
fs.writeFileSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf_modified.json', JSON.stringify(wf));

// Verify
const check = JSON.parse(fs.readFileSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf_modified.json', 'utf8'));
const imgConn = check.connections['IF Es imagen'].main;
const newCode = check.nodes.find(n=>n.name==='Config Mochas Place').parameters.jsCode;
console.log('IF Es imagen output[0]:', imgConn[0].map(c => c.node));
console.log('IF Es imagen output[1]:', imgConn[1].map(c => c.node));
console.log('Has horario rule:', newCode.includes('NUNCA confirmes'));
console.log('Has tamano 4.5:', newCode.includes('4.5 cm'));
console.log('Has gelapaletas 4.2:', newCode.includes('4.2 cm'));
console.log('File size:', fs.statSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf_modified.json').size, 'bytes');
