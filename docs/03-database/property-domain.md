# Property Domain

## Concepto

Una propiedad representa un inmueble físico.

La comercialización de una propiedad se modela mediante PropertyListing.

Los precios se modelan mediante PropertyPrice.

---

## Modelo

```txt
Property
│
├── PropertyListing
│      │
│      └── PropertyPrice
│
├── PropertyImage
│
└── PropertyFeature
```

---

## Property

Representa:

* Casa
* Departamento
* PH
* Oficina
* Local
* Terreno
* Galpón

Contiene únicamente información física.

Ejemplos:

* Metros cuadrados.
* Ambientes.
* Dormitorios.
* Baños.
* Cocheras.
* Orientación.
* Antigüedad.

---

## PropertyListing

Representa la publicación comercial.

Ejemplos:

* Venta
* Alquiler
* Alquiler temporario

Una propiedad puede tener múltiples publicaciones.

---

## PropertyPrice

Permite múltiples precios por publicación.

Ejemplo:

Venta

* USD 200.000

Temporario

* ARS 1.400.000
* USD 1.000

Uno de los precios puede marcarse como principal.

---

## PropertyImage

Almacena imágenes de la propiedad.

El sistema debe ser compatible con:

* Cloudflare R2
* Supabase Storage
* AWS S3

---

## PropertyFeature

Características configurables.

Categorías:

* GENERAL
* SERVICES
* ROOMS
* AMENITIES
