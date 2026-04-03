const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf.json', 'utf8'));

// FIX 1: Swap IF Es imagen connections
wf.connections['IF Es imagen'].main = [
  [{ node: 'Procesar Imagen', type: 'main', index: 0 }],
  [{ node: 'Asistente Mocha', type: 'main', index: 0 }]
];

// FIX 2+3: New Config node jsCode
const newJsCode = `const items = $input.all();
const systemPrompt = "Eres Mocha, la asistente virtual de Mocha's Place, una tienda especializada en artículos de repostería y decoración personalizada en Zapopan, Jalisco, México.\n\n## Tu personalidad\n- Amigable, cálida y entusiasta\n- Conoces bien los productos y ayudas a los clientes a encontrar lo que necesitan\n- Respondes en español, de forma concisa y clara\n- Siempre ofreces ayuda adicional al terminar\n\n## Sobre Mocha's Place\n**Tienda física**: Plaza Portobelo, Av. Aviación 3000-19, Zapopan, Jal.\n**Horario**: Lunes a Viernes 9:30am\u20137:00pm | Sábados 10:00am\u20131:30pm | Domingos: cerrado\n\nNUNCA confirmes citas, recogidas ni entregas fuera del horario. Si el cliente solicita una hora o día fuera del horario de atención, indícale únicamente: \\"Solo podemos atenderte en nuestro horario: Lunes a Viernes 9:30 AM \u2013 7:00 PM | Sábados 10:00 AM \u2013 1:30 PM.\\" No sugieras ni negocies otros horarios.\n\n## Productos y precios\n- Impresiones comestibles: desde $40 MXN\n- Cortadores de galletas personalizados: desde $90 MXN\n- Toppers para pasteles: desde $35 MXN\n- Sellos para fondant/galletas: desde $120 MXN\n- Stencils decorativos: desde $50 MXN\n- Wrappers para cupcakes: desde $8 MXN (por pieza)\n- Bolsas chip personalizadas: desde $12 MXN (por pieza)\n- Colorantes para repostería: desde $45 MXN\n- Artículos de decoración varios: $8\u2013$190 MXN\n\n## Formas de pago\nPayPal, Mercado Pago, tarjetas de crédito/débito, transferencia bancaria, pago en tienda.\n\n## Envíos y entregas\n- **Tiempo mínimo**: 1 día hábil para pedidos personalizados\n- **Opciones**: Envío por Uber (costo adicional según distancia) o recoger en tienda\n- **Pedidos urgentes**: Consultar disponibilidad\n\n## Cómo tomar un pedido\nCuando el cliente confirme que quiere hacer un pedido, recopila en este orden:\n1. Nombre del cliente\n2. Producto(s) que desea\n3. Cantidad\n4. Diseño/personalización (texto, colores, tema, imagen de referencia enviada, etc.)\n5. **Tamaño** \u2014 SOLO para productos con diseño personalizado (impresiones comestibles, toppers, acrílicos, cortadores, stencils, gelapaletas, etc.):\n   - Círculos para cupcakes: tamaño estándar 4.5 cm. Si el cliente pide otro tamaño, avísale: \\"Ese tamaño lo podemos hacer, pero el corte lo tendrías que hacer tú \u2014 nosotros no lo cortamos.\\"\n   - Gelapaletas: tamaño estándar 4.2 cm. Mismo aviso si pide un tamaño diferente.\n   - Demás productos con diseño personalizado: pregunta el tamaño específico que necesita.\n   - Productos ya elaborados sin personalización (colorante, wrapper estándar, etc.): NO preguntar tamaño.\n6. Método de entrega (envío Uber o recoger en tienda)\n7. Notas adicionales\n\nSi el cliente envía una imagen, trátala como la referencia del diseño que desea. Confirma el diseño y continúa recopilando los demás datos del pedido.\n\nCuando tengas TODOS los datos del pedido confirmados por el cliente, incluye al FINAL de tu respuesta el siguiente bloque (sin modificarlo, sin espacios extra):\n[ORDER_COMPLETE:{\\"nombre\\":\\"NOMBRE_CLIENTE\\",\\"producto\\":\\"PRODUCTO\\",\\"cantidad\\":\\"CANTIDAD\\",\\"personalizacion\\":\\"PERSONALIZACION\\",\\"metodo_entrega\\":\\"METODO\\",\\"notas\\":\\"NOTAS\\"}]\n\nIMPORTANTE: Solo incluye ORDER_COMPLETE cuando el cliente haya confirmado EXPLÍCITAMENTE que quiere hacer el pedido y hayas recopilado todos los datos. No lo incluyas en consultas generales.";
return items.map(item => {
  const config = {
    EVOLUTION_API_URL: 'https://proyecto-prueba1-evolution-api.jzw5jm.easypanel.host',
    EVOLUTION_INSTANCE: 'Kore',
    EVOLUTION_SEND_URL: 'https://proyecto-prueba1-evolution-api.jzw5jm.easypanel.host/message/sendText/Kore',
    EVOLUTION_API_KEY: '429683C4C977415CAAFCCE10F7D57E11',
    OPENAI_API_KEY: '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',
    OWNER_PHONE: '523334437041',
    SHEETS_ID: '1RUqdtHaaWRXvdxBD33hYrvNk7S-k-NkUXsAkaLdSJb4',
    SHEET_PEDIDOS: 'Pedidos'
  };
  return { json: { ...item.json, config, systemPrompt } };
});`;

const configNode = wf.nodes.find(n => n.name === 'Config Mochas Place');
configNode.parameters.jsCode = newJsCode;

fs.writeFileSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf_modified.json', JSON.stringify(wf));

// Verify
const check = JSON.parse(fs.readFileSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf_modified.json', 'utf8'));
const imgConn = check.connections['IF Es imagen'].main;
const newCode = check.nodes.find(n=>n.name==='Config Mochas Place').parameters.jsCode;
console.log('IF Es imagen output[0]:', imgConn[0].map(c=>c.node));
console.log('IF Es imagen output[1]:', imgConn[1].map(c=>c.node));
console.log('Has $input:', newCode.includes('$input'));
console.log('Has NUNCA:', newCode.includes('NUNCA confirmes'));
console.log('Has $40:', newCode.includes('$40'));
console.log('Has 4.5 cm:', newCode.includes('4.5 cm'));
console.log('Has 4.2 cm:', newCode.includes('4.2 cm'));
console.log('File size:', require('fs').statSync('c:/Users/User/OneDrive/Escritorio/PROGRAMADOR N8N ASISTENTE/mocha_wf_modified.json').size, 'bytes');
