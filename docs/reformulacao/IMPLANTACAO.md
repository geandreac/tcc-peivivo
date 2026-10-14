# Implantação no Supabase (nuvem) — passo a passo, sem Docker

**Para:** Geandre e Jean · **Data:** 08/10/2026 · **Pré-requisito:** R1–R3 e o R2 mesclados (PRs #98 → #103).
## 0. Estado conferido em 14/10/2026 (projeto `tcc-peivivo`, ref `xjjuugpybbxifwfxjigu`, São Paulo, plano gratuito)
Em 14/10 toda a pilha (PRs #98–#108) foi integrada em `development` (`e79747d`) e `main` (`22a4632`); a Vercel publicou `main` em produção.

| Passo | Situação |
|---|---|
| 1–2 Projeto e CLI ligada | ✅ |
| 3 Migrations 0001–0009 | ✅ 0001–0007 em 12/10 (15 tabelas, todas com RLS; `privado` fora da API; anônimo recebe 42501); **0008 (endurecimento, D-46) e 0009 (aviso de proposta resolvido) aplicadas em 14/10** com `db push` após `db:validar` |
| 3 cron RN05 | ✅ `pei-vivo-expirar-validacoes` às 3h |
| 4 Email ligado, TOTP ligado, confirmar e-mail ligado | ✅ |
| 4 Allow new users to sign up | ✅ **desligado** em 14/10 (estava ligado: qualquer um criava conta) |
| 4 Senha mínima | ✅ **10** em 14/10 (era 6); *Secure password change* ligado |
| 4 Site URL / Redirect URLs | ✅ Site URL `https://tcc-peivivo.vercel.app`; redirect `https://tcc-peivivo.vercel.app/**` (cobre `/definir-senha` e `/redefinir-senha`) |
| 4 Sessões 12 h / 8 h, senhas vazadas | ⚠️ só no plano Pro (o painel bloqueia) → limitação declarada; o app encerra saúde/coordenação em 30 min |
| 4 SMTP próprio e modelo de convite em português | ⚠️ pendente: o painel só edita modelos com SMTP próprio; os e-mails saem em inglês |
| 5 EFs `gerar-material`, `fechar-ciclo`, `convidar` + `ORIGEM_APP` | ✅ **republicadas em 14/10** (versão 2, com `--use-api`, cópia Deno em dia); sem token respondem 401 |
| 6 Primeira escola | ✅ 14/10: escola **"Escola Piloto PEI Vivo"**, coordenação **"Coordenação Piloto"** (`geandre51@gmail.com`). O 1º convite saiu antes de corrigir a Site URL; foi reenviado como link de recuperação (ver §6) |
| 7 App web | ✅ publicado na Vercel (`https://tcc-peivivo.vercel.app`, deploy automático de `main`); `apps/web/.env.local` local com a chave anon |

Tudo aqui roda **sem Docker**. Onde a CLI normalmente usaria Docker (deploy das Edge Functions), usamos `--use-api`, que empacota no servidor (verificado na documentação da CLI em 08/10/2026).

> **Segredos:** a `service_role` e a senha do banco **nunca** vão para o repositório, para o `.env` do app nem para o navegador. Use só no terminal, como variável de ambiente.

## 1. Criar o projeto
1. Em supabase.com → *New project*, região **South America (São Paulo)**, plano gratuito. Guarde a senha do banco num gerenciador de senhas.
2. Anote o **Project ref** (o código na URL do painel), a **URL** e a chave **anon** (*Project Settings → API*).

## 2. Ligar a CLI ao projeto
```bash
npx supabase login                       # abre o navegador
npx supabase link --project-ref SEU_REF   # pede a senha do banco
```

## 3. Banco: migrations (sem seed)
```bash
npm run db:validar                        # garante localmente (PGlite) antes de subir
npx supabase db push                      # aplica 0001…0009 no projeto
```
**Não** rode o `seed.sql` na nuvem: ele é para desenvolvimento e CI.

Depois, confira no *SQL Editor*:
```sql
select jobname, schedule from cron.job;   -- deve listar pei-vivo-expirar-validacoes (RN05)
```
Se vier vazio, a 0005 avisou que o `pg_cron` não pôde ser ligado pela migration. Ligue a extensão em *Database → Extensions → pg_cron* e rode:
```sql
select cron.schedule('pei-vivo-expirar-validacoes', '0 3 * * *', 'select public.fn_expirar_validacoes()');
```

## 4. Autenticação (painel: *Authentication*)
O `supabase/config.toml` vale para o ambiente local e o CI. **Não** rode `config push` com ele: o arquivo declara `site_url = localhost` e sobrescreveria a nuvem. `config push` só envia o que o arquivo declara; para usá-lo, monte um `config.toml` à parte só com as chaves de `[auth]` da nuvem e rode antes `npx supabase config diff --workdir <pasta>`. Em 14/10 o push não chegou a aplicar nada (as chaves de *Sessions* são só do plano Pro; provável causa), e a configuração foi feita no painel. Confira sempre com `config diff` depois:

| Onde | Valor | Motivo |
|---|---|---|
| *Sign In / Providers → Email* | **ligado** | Sem isso ninguém entra (defeito encontrado no CI em 08/10) |
| *Sign In / Providers → Allow new users to sign up* | **desligado** | D-32: conta só por convite |
| *Sign In / Providers → Confirm email* | ligado | O convite já confirma o e-mail |
| *Multi-Factor → TOTP* | **habilitado** | D-32: obrigatório para saúde e coordenação (o banco exige aal2) |
| *URL Configuration → Site URL* | endereço público do app | Links de convite e de recuperação |
| *URL Configuration → Redirect URLs* | `https://SEU-APP/definir-senha`, `https://SEU-APP/redefinir-senha` | idem |
| *Policies → Password* | mínimo **10** | D-32 / WCAG 3.3.8 (sem regra de composição) |
| *Sessions* | time-box 12 h; inatividade 8 h | D-32 (a tela encerra em 30 min para saúde/coordenação) |
| *SMTP Settings* | SMTP próprio (ex.: o do e-mail institucional) | O SMTP padrão do Supabase tem limite baixo de envio por hora: os convites do piloto podem parar |
| *Email Templates → Invite* | texto em português explicando o PEI Vivo | Primeira impressão da família |

## 5. Edge Functions (sem Docker)
```bash
node scripts/sincronizar-funcoes.mjs --verificar      # a cópia Deno precisa estar em dia
npx supabase secrets set ORIGEM_APP=https://SEU-APP   # CORS e link do convite
npx supabase functions deploy --use-api               # gerar-material, fechar-ciclo, convidar
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas pelo Supabase nas funções; não as defina à mão. A IA continua desligada (sem `IA_HABILITADA`).

## 6. Primeira escola e primeiro coordenador
Rode na máquina de vocês, com a chave só no comando (o PowerShell tem sintaxe diferente; abaixo, Git Bash):
```bash
SUPABASE_URL=https://SEU_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/implantar-escola.mjs --escola "Nome da escola do piloto" \
  --email coordenacao@escola.exemplo --nome "Nome da coordenadora" --site https://SEU-APP
```
A coordenação recebe o e-mail, cria a senha, aceita os termos e cadastra o aplicativo autenticador no primeiro acesso. Daí em diante, **tudo é pelo app**: cadastrar estudantes, convidar família, docentes e profissionais (tela *Vínculos*).

**Configure a §4 (Site URL e Redirect URLs) antes de rodar o script**, ou o link do convite aponta para a Site URL antiga. **Reenviar convite:** o Supabase recusa um segundo convite para um e-mail já cadastrado (`422 already registered`), e o script só registra o acesso, sem mandar e-mail. Para reenviar, mande um link de recuperação para a mesma tela (com a service role, só no terminal):
```js
await sb.auth.resetPasswordForEmail(email, { redirectTo: "https://SEU-APP/definir-senha?convite=1" });
```
O e-mail chega com o assunto de redefinição de senha (em inglês, sem SMTP próprio), mas abre a mesma tela "Aceitar convite", com senha e termos. O SMTP padrão permite poucos e-mails por hora.

## 7. App web
Crie `apps/web/.env.local` (ignorado pelo git):
```
VITE_API=supabase
VITE_SUPABASE_URL=https://SEU_REF.supabase.co
VITE_SUPABASE_ANON_KEY=cole-a-chave-anon
```
`npm run dev` → o app passa a pedir e-mail e senha. Sem essas variáveis, ele volta a ser a **demonstração** com dados fictícios. As duas versões convivem, o que é útil na banca.

O app está publicado na **Vercel** (`https://tcc-peivivo.vercel.app`), com deploy automático a cada push em `main`. O host precisa servir a SPA com fallback para `index.html` e permitir os cabeçalhos de segurança/CSP (R5.5).

## 8. Conferência pós-implantação (10 minutos)
1. Entrar como coordenação → cadastrar o TOTP → ver o painel da escola.
2. Cadastrar um estudante **fictício** → convidar um responsável **fictício** (e-mail de teste de vocês).
3. Como responsável: aceitar o convite → autorizar → abrir *Privacidade*.
4. Convidar uma docente fictícia → vincular → observar → fechar ciclo → gerar → aprovar.
5. Tentar abrir a nota clínica como docente pela URL → deve aparecer "Acesso negado".

**Nunca** use dados reais de estudante antes de: termo revisado pela orientadora, SMTP próprio e o piloto aprovado pela escola.
