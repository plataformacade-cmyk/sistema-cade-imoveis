# OPE-255 - Avaliacao Fenix para consulta CPF/CNPJ

Data da avaliacao: 2026-07-04.

## Objetivo

Avaliar se vale integrar Fenix/Fenyx para consultas de CPF/CNPJ, vinculos empresariais e buscas imobiliarias no fluxo juridico/cartorial do Cade Imoveis, especialmente para complementar a OPE-228.

## Fontes consultadas

- Fenix Consultas: https://fenixconsultas.com.br/
- Sistema Fenix Consultas: https://sistema.fenixconsultas.com.br/
- FenyxBr Busca de Imoveis: https://www.fenyxbr.com.br/produto/fenyx-busca-de-imoveis
- FenyxBr Captacao Imobiliaria: https://www.fenyxbr.com.br/produto/fenyx-captacao-imobiliaria
- Serpro Consulta CND: https://apicenter.estaleiro.serpro.gov.br/documentacao/consulta-cnd/pt/introducao/
- CPF.CNPJ API: https://www.cpfcnpj.com.br/dev/
- CNPJ.ws: https://www.cnpj.ws/

## Achados

1. `Fenix Consultas` parece ser uma plataforma de consultas avulsas/creditos, com chamadas de CPF, CNPJ, restricoes, protestos, imoveis e veiculos. A pagina publica menciona consultas a partir de R$ 2,60 e produto de pesquisa de imoveis em SP por R$ 40,00, mas nao expõe contrato publico de API, SLA, escopos tecnicos, webhook ou documentacao de integracao.
2. `FenyxBr` parece ser outro fornecedor/produto focado em busca/captacao imobiliaria. A pagina de busca de imoveis informa que a pesquisa exige CPF/CNPJ do proprietario, estado, cidade e cartorios. Nao foi encontrada documentacao publica de API.
3. Para CND federal, existe caminho oficial via Serpro Consulta CND, com API REST para consultar certidoes negativas de debito federais de PF, PJ e imovel rural.
4. Para enriquecimento CNPJ, existem alternativas API-first como CNPJ.ws e CPF.CNPJ API, com documentacao publica. Isso nao substitui due diligence juridica, mas reduz risco tecnico de dependencia sem API.

## Dados potencialmente retornados

Com base nas paginas publicas, os blocos provaveis sao:

- CPF/CNPJ: restricoes, pendencias, dividas, protestos e score, dependendo do pacote contratado.
- Imoveis: busca de bens relacionados a CPF/CNPJ por cartorio/localidade, com prazo assíncrono em alguns casos.
- Empresas: dados cadastrais, situacao, possivel quadro societario e certidoes, dependendo da fonte.

Esses dados podem ser sensiveis ou de alto impacto para decisao comercial/juridica. Nao devem ser exibidos a usuarios finais sem justificativa, minimizacao e trilha de auditoria.

## LGPD e base legal

Requisitos antes de qualquer integracao automatica:

- Confirmar controlador/operador e assinar DPA ou clausula contratual equivalente.
- Validar origem licita das bases, atualizacao, retencao e direito de auditoria.
- Definir base legal por uso: execucao de contrato/medidas pre-contratuais, exercicio regular de direitos e prevencao a fraude podem ser discutidas com juridico, mas precisam ser documentadas por caso.
- Registrar finalidade no termo de comprador/proprietario/prestador quando a consulta afetar o usuario.
- Minimizar armazenamento: guardar status, protocolo, fonte, data e resumo operacional; evitar armazenar resposta bruta extensa.
- Criar log de quem solicitou, por qual negocio, qual documento foi consultado e qual decisao operacional resultou.

## Uso recomendado no Cade

V1 manual/operacional:

- Manter a OPE-228 como fonte primaria: vendedor declara empresas e anexa certidoes.
- Permitir que admin/corretor registre resultado de consulta externa como evidencia manual no negocio, com fonte, protocolo e data.
- Nao expor o resultado bruto para comprador/proprietario; mostrar apenas pendencia ou liberado quando juridicamente adequado.

V2 automatizada, somente apos contrato/API:

- Criar `consultas_externas` com `negocio_id`, `documento_tipo`, `documento_hash`, `fornecedor`, `consulta_tipo`, `status`, `protocolo`, `resultado_resumo`, `solicitado_por`, `criado_em`, `expira_em`.
- Integrar via job server-side, nunca no client.
- Redigir RLS para admin/corretor ativo; participantes comuns nao leem resultado bruto.
- Reprocessar apenas mediante nova autorizacao/finalidade.

## Decisao go/no-go

Decisao: **no-go para integracao automatica imediata com Fenix/Fenyx**.

Motivos:

- Nao foi encontrada documentacao publica de API para o fornecedor citado.
- Nao ha evidencias publicas suficientes de contrato tecnico, SLA, formato de resposta, ambiente sandbox, DPA/LGPD e escopos de dados.
- O fluxo atual ja cobre coleta manual de CNPJ/certidoes pela OPE-228, reduzindo urgencia tecnica.

Decisao complementar: **go para discovery comercial/juridico**.

Proximo passo:

1. Confirmar com o time qual fornecedor exato: Fenix Consultas ou FenyxBr.
2. Solicitar documentacao de API, tabela de precos, bases consultadas, DPA/LGPD, sandbox e modelo de contrato.
3. Comparar com alternativas oficiais/API-first: Serpro Consulta CND, CNPJ.ws e CPF.CNPJ API.
4. Se aprovado pelo juridico, criar uma nova task de implementacao tecnica de `consultas_externas`.

## Criterio de aceite da OPE-255

- Custo publico mapeado quando disponivel: Fenix Consultas informa consultas a partir de R$ 2,60 e pesquisa de imoveis SP por R$ 40,00.
- Dados retornados mapeados em nivel de categoria.
- Riscos LGPD/base legal documentados.
- Uso no fluxo de vendedor/empresa aberta definido como manual agora e automatizado apenas em V2.
- Decisao go/no-go registrada.
