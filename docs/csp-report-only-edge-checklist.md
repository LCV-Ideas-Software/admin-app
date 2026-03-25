# CSP Report-Only no Edge (Cloudflare) — Checklist rápido

Objetivo: eliminar ruído de console quando o browser recebe `Content-Security-Policy-Report-Only` inválido no edge (ex.: `script-src 'none'` / `connect-src 'none'`) enquanto o app já publica CSP correto em `public/_headers`.

## Sintoma típico

- Console mostra violações em **Report-Only** para scripts/assets locais (`/assets/*.js`) e chamadas internas (`/api/*`).
- Mensagens citam fallback para `script-src` por ausência de `script-src-elem`.
- O app funciona, mas o log fica poluído e mascara incidentes reais.

## Pré-condição

- `admin-app/public/_headers` contém CSP estável de runtime (incluindo `script-src`, `script-src-elem` e `connect-src`).

## Passo a passo (Cloudflare Dashboard)

1. Abra a zone do domínio publicado (`admin.lcv.app.br` / `lcv.app.br`).
2. Acesse **Rules → Transform Rules → Modify Response Header**.
3. Procure regras ativas que façam `Set`/`Add` de:
   - `Content-Security-Policy-Report-Only`
   - `Content-Security-Policy`
4. Se houver valor com `script-src 'none'` ou `connect-src 'none'`:
   - desative a regra, ou
   - substitua pelo mesmo baseline do app.
5. Verifique também:
   - **Rules → Snippets** (ou Worker na rota) para `response.headers.set('Content-Security-Policy-Report-Only', ...)`.
   - qualquer política de segurança gerenciada que injete CSP-RO genérico.

## Baseline recomendado (alinhado ao admin-app)

- `default-src 'self'`
- `script-src 'self' https://static.cloudflareinsights.com 'unsafe-inline'`
- `script-src-elem 'self' https://static.cloudflareinsights.com 'unsafe-inline'`
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: https:`
- `font-src 'self'`
- `connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com`
- `object-src 'none'`
- `base-uri 'self'`
- `frame-ancestors 'none'`
- `form-action 'self'`
- `upgrade-insecure-requests`

## Validação pós-ajuste

1. Abrir o app autenticado por Cloudflare Access.
2. DevTools → Network → documento principal.
3. Confirmar headers de resposta:
   - sem CSP-RO com `none`, ou
   - CSP-RO alinhado ao baseline.
4. Hard reload (`Ctrl+Shift+R`).
5. Console sem novos eventos `script-src/connect-src 'none'`.

## Observações operacionais

- Em cenários Cloudflare Access, o header pode ser injetado por regra de edge mesmo com `_headers` correto no app.
- O diagnóstico correto é sempre feito no **response header efetivo** recebido pelo navegador.
