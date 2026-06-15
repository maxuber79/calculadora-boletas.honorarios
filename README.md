# Calculadora de Boletas de Honorarios

Herramienta web para calcular el **bruto** o **líquido** de una Boleta de Honorarios (Chile), considerando la retención de impuesto según la Ley 21.133.

## Funcionalidades

- Calcula **Líquido → Bruto** o **Bruto → Líquido**
- Tasas de retención históricas 2024–2030 (SII)
- Tasa personalizada
- División en dos boletas con porcentaje configurable
- Monto adicional libre de impuesto
- Persistencia del estado en localStorage

## Tasas de retención

| Año | Tasa |
|-----|------|
| 2024 | 13.75% |
| 2025 | 14.50% |
| 2026 | 15.25% |
| 2027 | 16.00% |
| 2028+ | 17.00% |

Fuente: [SII — Ley 21.133](https://www.sii.cl/destacados/boletas_honorarios/aumento_gradual.html)

## Uso

Abre `index.html` en cualquier navegador o sírvelo con un servidor estático:

```bash
npx serve .
```

## Tests

Abrir `tests.html` en el navegador para ejecutar los tests unitarios (QUnit).

## Licencia

MIT
