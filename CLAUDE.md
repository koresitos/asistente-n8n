# Asistente n8n

## Skills
- Sugerir qué skill podría ayudar cuando sea relevante, pero NO invocarlo hasta que el usuario lo pida.

## Instancia n8n
- Self-hosted Docker en EasyPanel
- URL y API Key configuradas en .mcp.json
- Nombres de nodos y propiedades en inglés tal como aparecen en la plataforma

## Buenas prácticas
- Backup antes de modificar workflows existentes
- Crear desactivado, probar, luego activar
- Error handling en workflows críticos
- Variables de entorno ($env) para credenciales, nunca hardcodear

## Errores conocidos y patrones

### Modificar workflows (CRÍTICO)
- **NUNCA leer ni subir el JSON completo del workflow al chat** — consume contexto innecesariamente
- Para modificar un nodo: usar `n8n_update_partial_workflow` con solo el nodo afectado
- Para modificar conexiones o estructura compleja: usar `n8n_update_full_workflow` pero obteniendo el workflow via `n8n_get_workflow` (MCP, no archivo local)
- `updateNode` REEMPLAZA `parameters` completo, no hace merge → incluir todos los parámetros del nodo al actualizar
- `addConnection` guarda `type:"0"` en vez de `"main"` → usar `n8n_update_full_workflow` para conexiones
- Identificar nodos por `nodeId`, no por `name`
- Archivos locales de workflow (`.json`) solo como backup — nunca como fuente de verdad en el flujo de trabajo

### $env y variables
- `$env.*` bloqueado en Code nodes por sandbox → agregar vars a `N8N_RUNNERS_ALLOW_LIST_ENV_VARS` en EasyPanel
- Set node con `$env.*` falla silenciosamente (retorna `{}`) → leer solo en Code node

### Code nodes
- Usar siempre `runOnceForAllItems` + `$input.all()` — `runOnceForEachItem` falla con webhooks
- `runOnceForAllItems`: usar `this.helpers.httpRequest()` — `runOnceForEachItem`: usar `$helpers.httpRequest()`
- Proxy objects: `JSON.parse(JSON.stringify(obj))` para serializar

### Webhook
- Body en `$json.body`, no en `$json` directo — estructura: `{headers, body, params, query}`

### IF node (v2.3)
- Requiere `conditions.options.version: 2`
- Operadores unarios: `singleValue: true`, sin `rightValue`
- TRUE → output[0], FALSE → output[1]

### AI Agent (v3.1)
- `systemMessage` va en `options.systemMessage`, NO en `parameters` directo
- Config: `promptType:"define"` + `text` + `options:{systemMessage}`

### Google Sheets
- `update` con expresiones falla → usar `appendOrUpdate` con `matchingColumns`
- read (v4.7): requiere `resource:"sheet"`, `operation:"read"`, `range:"A:Z"`

### Memoria conversacional (EasyPanel)
- `memoryBufferWindow` no persiste entre webhooks → usar `$getWorkflowStaticData('global')`
- Clave por usuario: `staticData['hist_' + telefono]`

## Workflows registrados

| ID | Nombre | Estado |
|----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA + Publicación Auto | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA - Lunes 9AM | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |

----|--------|--------|
| `6ylMMPFQwEEpUOw1` | Social Media - 1. Generador de Contenido IA | inactivo |
| `RXgfuybxkvJoIVYf` | Social Media - 2. Publicador Automático | inactivo |
| `fxRyp6etIlFVCjxY` | Asistente WhatsApp — Mocha's Place | **activo** |
| `u9OhPxcYeMiqk1RAFVjQG` | Asistente WhatsApp — Mocha's Place 1.0 | inactivo |
| `g_dopkojL6AfM5SmvZRH_` | Clínica Dental - Recepcionista WhatsApp | inactivo |
| `jsH_fRKUTfdReiJqcot-v` | Clínica Dental - Recordatorios Automáticos | inactivo |
| `uUwqRiTL1vnjIkTe` | Asistente Estética - Principal | inactivo |
| `dnqgQ0Zunlw6jFne` | Asistente Estética - Recordatorios 24h | inactivo |
| `AsGs0e_AZdB_O9aYg67n5` | Email Scrapper | inactivo |
| `O7wrk5Pbw0oVrJsi` | Email Scrapper USA | inactivo |
| `loR9zU0ctD0rFYsfR65tG` | Envio de correos automatico | inactivo |
| `tUrzZ1WELViyBJ6W` | Email Sender USA | inactivo |
| `DDA20bImFAoJSxi-LnUrY` | Generador de Videos Virales + Copies IA | inactivo |
| `_m4cHloVhSHCTcwwawoJS` | Gestor de Redes Sociales | inactivo |
| `hZXD9dIkPfzVLa6B` | Digest de Noticias de IA | inactivo |

---

### pairedItem
- Code nodes que crean items nuevos rompen la cadena → propagar campos clave en todos los returns
- Después de HTTP Request: datos anteriores en `$('Nodo').item.json.campo`, no en `$json`
- HTTP Request y AI nodes sí mantienen pairedItem
