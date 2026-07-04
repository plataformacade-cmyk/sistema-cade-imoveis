# OPE-248 - Estado de lint/build

Data: 2026-07-04

## Estado validado

- `npm.cmd run build`: verde.
- `npm.cmd run lint`: verde, com warnings.
- `npm.cmd run secrets:check`: verde para secrets obrigatórios.

## Correções aplicadas

- Corrigidos erros React 19 `react-hooks/set-state-in-effect` em dialogs que fechavam imediatamente após sucesso de Server Action.
- Corrigido `hooks/use-mobile.ts` para inicializar o estado pela viewport sem `setState` síncrono dentro de `useEffect`.
- Marcados argumentos intencionalmente não usados em `excluirConta`.

## Exceções temporárias documentadas

O lint ainda reporta warnings `@next/next/no-img-element` em páginas públicas de blog e sobre:

- `app/blog/[slug]/page.tsx`
- `app/blog/_components.tsx`
- `app/blog/page.tsx`
- `app/sobre/page.tsx`

Esses warnings não quebram o comando (`exit code 0`). A troca para `next/image` deve ser tratada em task própria ou ajuste futuro de performance, porque exige revisar dimensões, domínios/URLs externas e comportamento visual das imagens geradas/importadas do blog.

## Critério atual

Para novas tasks, o mínimo obrigatório é:

- `npm.cmd run build` verde;
- `npm.cmd run lint` sem erros;
- warnings novos devem ser justificados ou corrigidos no mesmo escopo.
