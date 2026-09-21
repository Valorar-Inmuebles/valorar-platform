# @repo/ui

Componentes UI genéricos compartidos entre `apps/admin` y `apps/web`.

Sin lógica de negocio, sin layout de dashboard y sin dependencias de dominio inmobiliario.

## Requisitos

- React 19
- Tailwind CSS v4 en la app consumidora
- La app debe incluir `@source` hacia `packages/ui/src` en su `globals.css`

## Importación

Cada componente se importa por subpath:

```tsx
import { Button } from "@repo/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/card";
```

## Exportaciones

### `@repo/ui/button`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `Button` | componente | Botón con variantes, tamaños, loading e iconos |
| `ButtonProps` | type | Props del botón |
| `ButtonVariant` | type | `primary` \| `secondary` \| `ghost` \| `outline-primary` \| `outline-secondary` |
| `ButtonSize` | type | `sm` \| `md` \| `lg` |

### `@repo/ui/card`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `Card` | componente | Contenedor con borde |
| `CardHeader` | componente | Encabezado con borde inferior |
| `CardTitle` | componente | Título del card |
| `CardContent` | componente | Cuerpo con padding |
| `CardHeaderActions` | componente | Grupo de acciones en el header |
| `CardFooter` | componente | Pie con borde superior |
| `CardList` | componente | Lista dividida dentro del card |
| `CardListItem` | componente | Ítem de lista con hover |
| `CardProps` | type | Props del contenedor |

### `@repo/ui/badge`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `Badge` | componente | Etiqueta de estado |
| `BadgeProps` | type | Props del badge |
| `BadgeVariant` | type | `success` \| `warning` \| `danger` \| `neutral` \| `info` |

Prop `tooltip` opcional: usa el atributo HTML `title` nativo.

### `@repo/ui/input`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `Input` | componente | Campo de texto con iconos, estados y loading |
| `InputProps` | type | Props del input |
| `InputState` | type | `default` \| `error` \| `success` |

Integra con `FormField` vía contexto (`useFormFieldCtx`).

### `@repo/ui/form-field`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `FormField` | componente | Wrapper con contexto de id y estado |
| `Label` | componente | Etiqueta vinculada al campo |
| `HelperText` | componente | Texto de ayuda |
| `ErrorMessage` | componente | Mensaje de error con icono |
| `useField` | hook | Estado local + validación básica |
| `useFormFieldCtx` | hook | Acceso al contexto del campo |
| `FieldState` | type | `default` \| `error` \| `success` |
| `ValidationRules` | type | Reglas de `useField` |

### `@repo/ui/select`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `Select` | componente | Select custom con teclado y portal |
| `SelectProps` | type | Props del select |
| `SelectOption` | type | `{ value, label, disabled? }` |

Integra con `FormField` vía contexto.

### `@repo/ui/toast`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `ToastProvider` | componente | Provider + contenedor de toasts |
| `useToast` | hook | API `{ toast.success, toast.error, ... }` |
| `ToastVariant` | type | `success` \| `error` \| `info` \| `warning` |
| `ToastOptions` | type | `{ title?, duration? }` |
| `ToastApi` | type | Métodos del hook |

Montar `ToastProvider` en el layout raíz de la app consumidora.

### `@repo/ui/modal`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `Modal` | componente | Diálogo modal con portal |
| `ModalHeader` | componente | Encabezado con botón cerrar |
| `ModalTitle` | componente | Título |
| `ModalContent` | componente | Cuerpo scrollable |
| `ModalFooter` | componente | Pie con acciones |
| `ConfirmModal` | componente | Modal de confirmación destructiva |
| `ModalSize` | type | `sm` \| `md` \| `lg` \| `xl` \| `full` |

### `@repo/ui/side-panel`

| Export | Tipo | Descripción |
| ------ | ---- | ----------- |
| `SidePanel` | componente | Panel lateral deslizable |
| `SidePanelHeader` | componente | Encabezado con botón cerrar |
| `SidePanelTitle` | componente | Título (aria-labelledby) |
| `SidePanelDescription` | componente | Descripción (aria-describedby) |
| `SidePanelContent` | componente | Cuerpo scrollable |
| `SidePanelFooter` | componente | Pie con acciones |
| `SidePanelWidth` | type | `sm` \| `md` \| `lg` \| `xl` |

### Entradas especializadas

| Subpath | Export principal | Uso |
| ------- | ---------------- | --- |
| @repo/ui/date-picker | DatePicker | Fecha date-only con entrada DD/MM/AAAA, calendario, límites min/max y teclado |
| @repo/ui/currency-input | CurrencyInput | Importe es-AR con valor raw separado y hasta dos decimales mediante allowDecimals |
| @repo/ui/search-combobox | SearchCombobox | Búsqueda async con debounce, cancelación, estados y descripción secundaria |

DatePicker conserva strings ISO YYYY-MM-DD. CurrencyInput es agnóstico de moneda, sirve para ARS/USD y mantiene la política existente de importes no negativos.

### Navegación y acciones

| Subpath | Exports | Uso |
| ------- | ------- | --- |
| @repo/ui/tabs | Tabs, TabPanel | Tabs controlados con badge, tono de atención, disabled y teclado |
| @repo/ui/dropdown-menu | DropdownMenu | Acciones secundarias con items disabled/destructive y teclado |
| @repo/ui/pagination | Pagination | Paginación server-side friendly |
| @repo/ui/stepper | Stepper | Progreso responsive con navegación opcional |

### Listados administrativos

| Subpath | Exports | Uso |
| ------- | ------- | --- |
| @repo/ui/admin-table | AdminTable y subcomponentes | Tabla compuesta con sorting y estados, sin fetching |
| @repo/ui/filter-bar | FilterBar, FilterChip | Buscador, filtros, acciones y chips removibles |

Las colecciones grandes deben consultar API server-side. Las primitives sólo presentan estado y callbacks; no incorporan lógica de dominio.

Las tablas que forman una única superficie con una Card usan
`AdminTable variant="integrated"` dentro de un `CardContent` sin padding. La
Card contenedora debe usar `overflow-hidden` para respetar sus esquinas; el
header y el footer conservan las primitives normales de Card.

## Ejemplo compuesto

```tsx
"use client";

import { FormField, Label, ErrorMessage } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { Select } from "@repo/ui/select";
import { Button } from "@repo/ui/button";

export function ExampleForm() {
  return (
    <FormField state="error">
      <Label required>Nombre</Label>
      <Input placeholder="Ingresá un nombre" />
      <ErrorMessage>El nombre es obligatorio</ErrorMessage>

      <Label>Tipo</Label>
      <Select
        options={[
          { value: "a", label: "Opción A" },
          { value: "b", label: "Opción B" },
        ]}
      />

      <Button type="submit">Guardar</Button>
    </FormField>
  );
}
```

## Scripts

```bash
npm run lint --workspace=@repo/ui
npm run check-types --workspace=@repo/ui
npm run test --workspace=@repo/ui
```
