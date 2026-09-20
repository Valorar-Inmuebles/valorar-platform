# Principios de UI

## Fuentes de verdad visuales

Audita el estado real antes de implementar:

- primitives compartidas en packages/ui/src y su inventario en packages/ui/README.md;
- tokens del Admin en apps/admin/app/globals.css;
- shells y patrones compartidos en apps/admin/components;
- pantalla vecina aprobada del mismo tipo.

El inventario actual incluye Button, Card, Badge, Input, FormField, Select, Textarea, Switch, DatePicker, CurrencyInput, Toast, Modal, ConfirmModal y SidePanel. Admin aporta patrones como PageShell, PageHeader, skeletons, estados vacíos y composiciones operativas. Verifica el inventario en cada gate: no asumas que permanece estático.

Si una capacidad como combobox buscable, menú de acciones, paginación, stepper o tabla reutilizable no existe, trátala como gap del UI Kit. Define primero si se repite y merece una primitive compartida; no simules su existencia ni escondas una solución local bajo un nombre genérico.

## Jerarquía y lenguaje visual

- Usa tokens existentes para fondo, superficie, texto, muted, borde, primary, destructive y colores de marca.
- No hardcodees colores o tipografías cuando exista un token equivalente.
- Prioriza una acción primaria por contexto y reduce competencia entre acciones secundarias.
- Organiza información relacionada en secciones o cards; evita contenedores anidados sin propósito.
- Mantén densidad suficiente para trabajo administrativo sin sacrificar lectura ni tamaño de interacción.
- Usa iconos para reforzar significado, no para decorar o reemplazar labels necesarios.
- Conserva layouts responsivos por prioridad: contenido esencial primero, acciones accesibles y sin overflow horizontal accidental.

## Mockups aprobados

Un mockup aprobado fija layout, jerarquía y patrones principales. Antes de codificar:

1. identifica primitives y composiciones existentes capaces de reproducirlo;
2. registra gaps reales del UI Kit;
3. separa datos de ejemplo de requisitos funcionales;
4. confirma estados y comportamiento responsive no visibles en la captura.

No reinterpretar libremente el mockup no significa copiar píxeles o datos ficticios. Si una diferencia técnica menor resulta necesaria, conserva la intención visual y documéntala en el cierre.

## Copy y estados

- Labels, acciones, ayudas y mensajes pertenecen a la UI en español.
- Mapea enums y códigos a nombres comprensibles en una única capa de presentación.
- Loading debe preservar contexto; error debe explicar recuperación; empty debe orientar la siguiente acción.
- Disabled debe expresar una dependencia real y, cuando no sea obvia, explicar qué falta.
