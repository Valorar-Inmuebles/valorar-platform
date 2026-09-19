# Informe de gate

Usa este formato compacto al finalizar una implementación o revisión técnica. Omite secciones vacías y resume validaciones exitosas; conserva detalle para errores, datos modificados y desviaciones.

```text
GATE
Branch:
Initial HEAD:
Final HEAD:

CHANGES
...

DATABASE
...

VALIDATION
Tests:
Typecheck:
Lint:
Build:

DEVIATIONS
...

GIT
Commit:
Status:

NEXT GATE
Not started.
```

Registra migración/status/checksum y datos afectados cuando aplique. Si no hubo base de datos, indica `Not affected` en una línea. No pegues logs completos exitosos ni expliques código trivial.
