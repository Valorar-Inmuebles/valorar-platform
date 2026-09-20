# Formularios y SidePanels

## Formularios

- Mantén labels visibles; no uses texto de ejemplo dentro del campo como reemplazo.
- Coloca errores junto al campo y ayudas sólo cuando agreguen información.
- Refleja dependencias con disabled, min, max y opciones disponibles; evita validaciones sorpresivas al final.
- Usa DatePicker y CurrencyInput del sistema. Aplica máscaras y presentación local sin cambiar el valor que espera la API.
- Para colecciones grandes usa búsqueda server-side y un control buscable/paginado; no cargues toda la colección en un Select.
- Permite guardar borradores incompletos cuando el dominio lo admita. Distingue esa acción de continuar, activar o completar.
- Conserva valores y errores útiles tras una respuesta fallida.

Divide formularios extensos por objetivos conceptuales. Usa cards o secciones para edición no lineal y wizard cuando exista una secuencia real:

- stepper claro;
- un objetivo por paso;
- navegación hacia atrás sin pérdida;
- validación del paso separada de Guardar borrador;
- copy orientado a la tarea, sin exponer entidades, enums o estructura técnica del backend.

## SidePanels

Usa SidePanel para altas o ediciones contextuales y acotadas —por ejemplo, una persona, una obligación, un cumplimiento o una configuración breve— cuando salir de la pantalla rompa el flujo.

Cada panel debe tener:

- título y contexto suficientes;
- SidePanelContent scrollable cuando corresponda;
- acciones consistentes en SidePanelFooter;
- cierre seguro, incluido estado con cambios sin guardar cuando aplique;
- loading, submitting y error explícitos;
- foco inicial razonable, focus trap y retorno de foco provistos o verificados en la primitive.

No conviertas un panel en una página completa comprimida. Si requiere navegación interna extensa, múltiples objetivos independientes o demasiados niveles, usa una ruta dedicada.

## Feedback y acciones

- Usa Toast para confirmar acciones inmediatas o informar errores recuperables.
- Usa ConfirmModal para operaciones destructivas o difíciles de revertir.
- Deshabilita acciones durante submit y evita dobles envíos.
- Mantén la acción primaria estable entre formularios equivalentes.
