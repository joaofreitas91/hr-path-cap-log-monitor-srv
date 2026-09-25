Crie um protótipo navegável de alta fidelidade do **Log Monitor Cockpit**, uma aplicação administrativa para gerenciar integrações, usuários, grupos de acesso e acompanhar logs de execução de integrações.

## Estilo visual
- Siga o **SAP Fiori 3 / Horizon** (tema `sap_horizon`): tipografia "72", densidade compacta, controles com aparência de SAPUI5 (sap.m / sap.f / sap.tnt). O protótipo será implementado depois em **SAPUI5 freestyle (XML views)**, então use apenas padrões que existam no UI5: ToolPage + SideNavigation, DynamicPage, sap.m.Table, Dialog, ObjectPage, ObjectStatus, cards.
- Idioma da interface: **português (Brasil)**.
- Status de execução com cores semânticas: **SUCCESS** = verde (Success), **ERROR** = vermelho (Error), **WARNING** = laranja (Warning), **RUNNING** = azul (Information).
- Desktop primeiro, mas responsivo (tablet/phone).

## Estrutura geral (shell)
- Layout `sap.tnt.ToolPage`: header com título "Log Monitor Cockpit" e avatar do usuário logado (administrador); **menu lateral à esquerda** (`SideNavigation`, recolhível) com os itens, nesta ordem e com ícones:
  1. **Dashboard** (ícone `sap-icon://business-objects-experience` ou similar)
  2. **Integrações** (`sap-icon://connected`)
  3. **Usuários** (`sap-icon://person-placeholder`)
  4. **Grupos de Acesso** (`sap-icon://group`)
- O item ativo fica destacado; telas de detalhe mantêm o item pai selecionado e mostram breadcrumb (ex.: Integrações › SAP SF → Folha).

## Modelo de dados (use estes campos exatamente)
- **Integration**: `description` (obrigatório, até 255), `source` (obrigatório, até 100), `target` (obrigatório, até 100), `createdAt`, `modifiedAt`.
- **IntegrationField** (pertence a uma Integration): `fieldName` (obrigatório, chave técnica da propriedade no payload JSON), `label` (obrigatório), `description` (opcional), `isFilterable` (booleano), `isSortable` (booleano).
- **IntegrationLog** (pertence a uma Integration): `executedAt` (data/hora), `status` (RUNNING | SUCCESS | ERROR | WARNING), `payload` (texto JSON — pode ser um objeto ou um array de objetos).
- **User**: `name` (obrigatório), `email` (obrigatório).
- **Group** (Grupo de Acesso): `description` (obrigatório), `iasUserGroup` (opcional — nome do grupo correspondente no SAP IAS).
- Vínculos N:N: **User ↔ Group** e **Integration ↔ Group**. Um usuário só enxerga no relatório os logs das integrações dos grupos a que pertence.

Use dados fictícios realistas (integrações como "SuccessFactors → Folha ADP", "S/4HANA → Salesforce", "Ponto Eletrônico → SuccessFactors"; e-mails @hrpath.com.br; payloads JSON com campos como `employeeId`, `companyCode`, `message`).

## Telas

### 1. Dashboard
- Página com título "Dashboard" e um filtro de **período** no topo (DateRangeSelection, padrão: últimos 7 dias) e um filtro opcional por integração.
- **Linha de métricas lado a lado (2 cards de mesma altura):**
  - **Logs por status** — gráfico de rosca (donut) com as 4 categorias nas cores semânticas + total no centro; abaixo, legenda com contagem e %.
  - **Logs por integração** — gráfico de barras horizontais empilhadas por status (uma barra por integração, ordenadas pelo total desc., top 10).
- Opcional acima dos cards: faixa de KPIs numéricos (Total de execuções, Sucesso, Erros, Avisos, Em execução).
- **Tabela "Últimos logs de erro"** abaixo dos cards: colunas Integração (descrição + "source → target" em texto secundário), Data/Hora de execução, Status (ObjectStatus vermelho), e uma última coluna com um botão **"Detalhe"** (ícone `sap-icon://detail-view`). Ordenada por data desc., 10–20 linhas, com "Mais" (growing).
  - **Não há navegação** para outra página ao clicar na linha. O botão "Detalhe" abre um **Dialog** mostrando: cabeçalho com integração, data/hora e status; e o **payload JSON formatado** (indentado, monoespaçado, somente leitura, com rolagem e botão "Copiar"). Se o payload for um array, mostrar o JSON inteiro formatado. Botão "Fechar".

### 2. Usuários (tela-modelo de CRUD — Integrações e Grupos seguem este mesmo padrão)
- DynamicPage com título "Usuários".
- **Barra da tabela**: título com contador — "Usuários (42)" — que atualiza conforme o filtro; à direita um **SearchField** simples (busca por nome ou e-mail) e duas ações: **"Adicionar"** (botão primário, ícone `add`) e **"Excluir"** (ícone `delete`, habilitado somente com ≥1 linha selecionada).
- **Tabela multi-seleção** (checkbox por linha + selecionar tudo): colunas Nome, E-mail, Grupos (quantidade ou tokens), Modificado em, e uma coluna de ações com botão **"Editar"** (ícone `edit`) por linha.
- **"Adicionar"** abre um **Dialog** "Novo usuário" com o form: Nome*, E-mail* (validação de formato). Botões "Salvar" (primário) e "Cancelar". Mostrar estado de validação (campo obrigatório vazio em vermelho com mensagem).
- **"Editar"** abre o **mesmo Dialog**, com título "Editar usuário" e os campos preenchidos.
- **"Excluir"** abre um diálogo de confirmação ("Excluir 3 usuários selecionados? Eles também serão removidos dos grupos a que pertencem.") e, após confirmar, um MessageToast "3 usuários excluídos".
- Mostre também o estado vazio da tabela ("Nenhum usuário encontrado") e o estado de busca sem resultados.

### 3. Integrações
- Mesmo padrão da tela de Usuários: título "Integrações (N)", SearchField (busca por descrição, source ou target), ações Adicionar/Excluir, tabela multi-seleção com botão Editar por linha, mesmo Dialog para criar/editar.
- Colunas: Descrição, Source, Target, Campos (quantidade de IntegrationFields), Grupos (quantidade), Modificado em, Editar.
- Form do Dialog: Descrição*, Source*, Target*.
- Confirmação de exclusão com aviso forte: **excluir uma integração exclui também todos os seus logs e campos**.
- **Diferença**: clicar na linha (tipo Navigation, com seta `>`) navega para a **tela de Detalhe da Integração**.

#### 3.1 Detalhe da Integração
- ObjectPage (ou DynamicPage) com cabeçalho: Descrição como título, Source → Target, criado/modificado em; ação "Editar" no cabeçalho que abre o mesmo Dialog da lista; botão voltar/breadcrumb.
- Seção **"Campos do payload" (Integration Fields)**: tabela com o mesmo padrão CRUD (título com contador, Adicionar, Excluir com multi-seleção, Editar por linha, Dialog para criar/editar).
  - Colunas: Nome técnico (`fieldName`), Rótulo (`label`), Descrição, Filtrável (ícone/checkbox somente leitura), Ordenável (idem), Editar.
  - Dialog: Nome técnico*, Rótulo*, Descrição, switches "Filtrável" e "Ordenável" com texto de ajuda ("Filtrável: aparece como filtro no Log Monitor"; "Ordenável: permite ordenar a coluna no Log Monitor").
- (Opcional, somente leitura) seção "Grupos com acesso" listando os grupos vinculados a essa integração.

### 4. Grupos de Acesso
- Mesmo padrão da tela de Usuários: título "Grupos de Acesso (N)", SearchField (descrição ou grupo IAS), Adicionar/Excluir, multi-seleção, Editar por linha, mesmo Dialog.
- Colunas: Descrição, Grupo IAS, Usuários (qtd.), Integrações (qtd.), Modificado em, Editar.
- Form do Dialog: Descrição*, Grupo IAS (opcional, com texto de ajuda).
- **Diferença**: clicar na linha navega para o **Detalhe do Grupo**.

#### 4.1 Detalhe do Grupo
- Cabeçalho com Descrição, Grupo IAS e contadores; ação "Editar".
- Duas seções (abas no ObjectPage ou IconTabBar): **"Usuários"** e **"Integrações"**.
  - Cada seção tem uma tabela multi-seleção com título + contador, SearchField, ação **"Vincular"** e ação **"Desvincular"** (habilitada com seleção).
  - **"Vincular usuário"** abre um `SelectDialog`/`TableSelectDialog` multi-seleção com busca, listando apenas usuários **ainda não vinculados** ao grupo (Nome, E-mail).
  - **"Vincular integração"** idem, listando integrações não vinculadas (Descrição, Source → Target).
  - Desvincular pede confirmação e deixa claro que apenas remove o vínculo (não exclui o usuário/integração).

## Entregáveis do protótipo
- Todas as telas acima navegáveis a partir do menu lateral, incluindo os Dialogs (criar, editar, confirmar exclusão, detalhe do payload, vincular) e os estados vazio/erro de validação.
- Mantenha consistência total entre as três telas de CRUD (mesma barra, mesmas posições de botões, mesmo Dialog) — elas serão implementadas com o mesmo padrão de código.
