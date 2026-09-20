# Visual UAT

## Preparación

1. Confirma que el Admin y sus dependencias usan el entorno development seguro correspondiente.
2. Levanta sólo los servicios necesarios para el gate.
3. Abre exclusivamente las rutas modificadas y los mockups aprobados pertinentes.
4. Prepara datos reales representativos sin inventar estados persistidos ni alterar producción.

## Revisión

Comprueba en desktop y un viewport angosto razonable:

- jerarquía, espaciado, alineación y correspondencia con el mockup;
- overflow horizontal/vertical y contenido largo;
- labels, copy en español y traducción de estados;
- fechas, monedas, separadores y valores nulos;
- loading, submitting, empty, error y disabled;
- filtros activos, sorting y paginación;
- modales y SidePanels, incluido scroll y cierre seguro;
- responsive y prioridad de información;
- foco visible, orden de tabulación, Escape y activación por teclado básica.

Verifica al menos un caso normal y los estados límite relevantes del gate. No releas todos los mockups ni recorras módulos no modificados.

## Evidencia y cierre

Registra rutas y viewports inspeccionados, diferencias frente al mockup y limitaciones del entorno. Captura evidencia sólo cuando aporte a la revisión.

No declares fidelidad visual completa si:

- no fue posible abrir un navegador;
- el Admin no pudo levantarse contra un entorno seguro;
- faltaron datos o estados necesarios;
- sólo se revisó el código o una captura estática.

En esos casos informa qué sí fue validado y deja explícito el UAT visual pendiente.
