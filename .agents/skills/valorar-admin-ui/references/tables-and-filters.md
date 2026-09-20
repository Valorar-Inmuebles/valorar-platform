# Tablas, filtros y dashboards

## Listados

Cuando el volumen pueda crecer, implementa búsqueda, filtros, sorting allowlisted y paginación server-side. Mantén ese estado en URL cuando mejore navegación, enlaces o retorno al listado.

- Incluye sólo columnas útiles para decidir o actuar.
- Usa encabezados ordenables con estado e indicador claros.
- Representa estados con Badge y labels de producto, no enums.
- Agrupa acciones secundarias en DropdownMenu cuando exista la primitive; si falta y el patrón se repite, trátalo como gap compartido.
- Muestra filtros activos de forma visible y removible, incluida una acción para limpiar.
- Diseña empty state contextual: diferencia “sin registros” de “sin resultados para estos filtros”.
- Usa paginación estándar con total/contexto suficiente y límites previsibles.
- Evita imágenes decorativas en tablas.

En viewport angosto prioriza columnas, permite composiciones en cards cuando sean más legibles y conserva acceso a acciones. No resuelvas responsive ocultando información crítica sin alternativa.

## Búsqueda y filtros

- Debouncea búsquedas remotas cuando corresponda y cancela respuestas obsoletas.
- No precargues colecciones grandes.
- Mantén filtros, sorting y página coherentes; al cambiar un filtro normalmente vuelve a la primera página.
- Expón loading sin desmontar innecesariamente toda la tabla.
- Diferencia error de red, lista vacía y cero coincidencias.

## Dashboards

Cada card debe responder una pregunta operativa: qué requiere atención, qué venció, qué cambió o qué acción sigue.

- Prioriza excepciones y trabajo pendiente sobre métricas decorativas.
- Evita gráficos sin una decisión asociada.
- No repitas el mismo dato en widgets distintos.
- Ofrece acciones claras hacia el detalle filtrado.
- Usa datos disponibles; no fabriques actividad, tendencias ni comunicaciones.
- Reutiliza las composiciones existentes de Dashboard antes de crear variantes.
