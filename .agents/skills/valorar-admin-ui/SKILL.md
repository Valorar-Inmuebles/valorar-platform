---
name: valorar-admin-ui
description: Implementa y revisa interfaces de apps/admin en valorar-platform. Úsala para pantallas, formularios, tablas, dashboards, SidePanels, filtros, implementación desde mockups y UAT visual del Admin; no para UI pública ni trabajo exclusivamente de API o base de datos.
---

# Valorar Admin UI

Complementa $valorar-engineering con criterios de interfaz para apps/admin. La documentación funcional canónica define comportamiento, datos y permisos; esta skill define cómo expresarlos en la experiencia administrativa.

## Antes de implementar

1. Confirma el gate y lee sólo la documentación funcional, rutas y mockups que lo gobiernan.
2. Inspecciona la pantalla vecina, packages/ui y los componentes compartidos de Admin antes de diseñar.
3. Mapea el requerimiento a primitives existentes. Si falta una capacidad reutilizable, registra el gap y evalúa resolverlo primero en el UI Kit; evita CSS y componentes one-off.
4. Si hay mockup aprobado, úsalo como criterio visual de aceptación. No copies sus datos ficticios ni contradigas la funcionalidad canónica.

## Reglas permanentes

- UI Kit first: reutiliza componentes y tokens antes de crear otros. No uses controles HTML/browser crudos cuando existe o corresponde una primitive del sistema.
- Conserva el lenguaje visual de Valorar: verde institucional, fondos claros, cards limpias, bordes y sombras discretos, separación legible e iconografía moderada. No importes reglas visuales de otros productos.
- Usa español para labels y copy. Traduce estados de dominio; nunca muestres enums técnicos directamente.
- Mantén jerarquía clara, densidad administrativa equilibrada, responsive y navegación por teclado.
- Modela explícitamente loading, submitting, empty, error y disabled. Usa Toast para feedback inmediato y ConfirmModal para operaciones destructivas.
- No agregues librerías UI sin una necesidad concreta y una revisión del stack existente.
- Usa datos y APIs reales. No dupliques reglas del backend ni alteres su representación por aplicar máscaras o formatos.

## Composición

- Elige página, cards, wizard o SidePanel según la complejidad y el contexto; evita formularios monolíticos y páginas completas comprimidas en paneles.
- Para patrones de campos, borradores, wizard y paneles lee [references/forms-and-sidepanels.md](references/forms-and-sidepanels.md).
- Para listados, filtros, acciones, paginación y dashboards lee [references/tables-and-filters.md](references/tables-and-filters.md).
- Para jerarquía, tokens, primitives y traducción de mockups lee [references/ui-principles.md](references/ui-principles.md).

## Cierre visual

Antes de afirmar fidelidad visual, sigue [references/visual-uat.md](references/visual-uat.md). Inspecciona las rutas modificadas en desktop y un viewport angosto razonable cuando el entorno lo permita. Si no hay navegador o no puede levantarse el Admin de forma segura, repórtalo y limita explícitamente la conclusión.

## Detente y reporta

Detente antes de decidir cuando un mockup contradiga documentación canónica, permisos, datos reales o comportamiento aprobado. Documenta cualquier diferencia técnica menor necesaria. No inventes funcionalidad para completar una composición visual.
