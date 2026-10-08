# Instructions & Project Guidelines: Gestão Financeira Segura

Este documento estabelece as diretrizes obrigatórias de arquitetura, segurança, governança e conformidade LGPD para o desenvolvimento deste projeto.

## 1. Governança e Git Workflow
- Nenhuma alteração de código sem uma Issue associada no GitHub.
- Alterações permitidas exclusivamente via Pull Requests (PRs) direcionados à branch principal.
- Rastreabilidade obrigatória nos PRs (ex: `Closes #12`).

## 2. Design e UX
- Uso obrigatório de estados visuais de `skeleton` e `Suspense` para cargas assíncronas.
- Transições fluidas e microinterações em elementos interativos e modais.
- Feedback visual imediato em ações demoradas (Server Actions, botões em loading).

## 3. Segurança e Supabase RLS
- Ativação obrigatória de Row Level Security (`ENABLE ROW LEVEL SECURITY`) em todas as tabelas.
- Isolamento estrito de tenants validando `auth.uid() = user_id`.
- Proibição absoluta do uso da chave `service_role` no client-side.

## 4. Server Actions e OWASP Top 10
- Validação obrigatória de sessão com `supabase.auth.getUser()` no topo de qualquer Server Action.
- Validação rigorosa de inputs utilizando schemas do Zod.
- Proteção contra SQL Injection e XSS através de queries parametrizadas.

## 5. Compliance LGPD
- Minimização estrita na coleta de dados pessoais.
- Implementação do direito ao esquecimento (exclusão em cascata de dados do usuário).
- Transparência com links para Termos de Uso e Política de Privacidade.

## 6. Blindagem de Rede (next.config.js)
- Aplicação de cabeçalhos de segurança: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `HSTS`, `Referrer-Policy` e `Permissions-Policy`.