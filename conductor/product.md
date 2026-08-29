# Initial Concept

# Aplicação de Gestão de Fotografia para Estúdio E-commerce (React Router + Sanity + Cloudinary)

Cria uma aplicação web full-stack utilizando React Router v8 (Framework Mode com Vite), TypeScript estrito e Tailwind CSS para gerir o fluxo de fotografia de produtos de um estúdio de e-commerce.

O objetivo é automatizar o processo de captura, associação, upload e gestão de imagens de produtos, integrando um fluxo físico de fotografia baseado numa Nikon D5 (ou outra câmara compatível com tethering), armazenamento de imagens no Cloudinary e gestão de catálogo no Sanity.

---

## 1. Arquitetura do Sistema

O sistema deve ser composto por dois processos independentes e desacoplados:

### A. Aplicação Web (Interface e Painel de Controlo)
Responsável por:
- Dashboard de produtos e variantes.
- Configurações globais e locais.
- Gestão do ciclo de vida das sessões fotográficas (Iniciar, Pausar, Terminar).
- Monitorização do estado do sistema e visualização de logs via Server-Sent Events (SSE) em tempo real.
- Feedback de progresso de uploads.

Tecnologias: React Router v7 Framework Mode, Vite, TypeScript, Tailwind CSS, Server-Sent Events (SSE), Zod para validação.

### B. Worker de Monitorização (Background Daemon)
Processo Node.js independente executado localmente no Mac, responsável por:
- Monitorizar a pasta local através de 'chokidar'.
- Processar e validar novas imagens JPEG vindas da câmara.
- Efetuar uploads assíncronos para o Cloudinary e atualizar o Sanity.
- Registar logs estruturados na base de dados intermédia.
- O Worker deve continuar funcional e resiliente mesmo que a aplicação web seja reiniciada ou fechada.

---

## 2. Fluxo Operacional

1. O operador pesquisa e seleciona um produto ou variante na aplicação.
2. O operador clica em "Iniciar Sessão Fotográfica". O sistema regista uma sessão ativa.
3. A câmara Nikon D5 dispara e descarrega automaticamente novas imagens JPEG na pasta monitorizada (via Nikon NX Tether).
4. O Worker deteta os novos ficheiros JPEGs estáveis em disco.
5. As imagens são associadas automaticamente à sessão ativa no SQLite.
6. O Worker altera o nome do ficheiro para o padrão indexado do SKU e faz o upload para o Cloudinary.
7. O Worker faz o push do novo objeto de imagem para o array do produto correspondente no Sanity.
8. A interface web recebe atualizações visuais em tempo real por SSE (logs e progresso).
9. A sessão é encerrada manualmente pelo operador.

---

## 3. Gestão de Configurações e Estado

### Integrações e Segurança
Cria uma área de Configurações onde as chaves e credenciais sensíveis são geridas exclusivamente no servidor através de variáveis de ambiente (.env) ou ficheiros de configuração locais protegidos, nunca sendo expostas ou armazenadas no browser:
- Sanity PIM: Project ID, Dataset e Token de Escrita (Server-only).
- Cloudinary: Cloud Name, API Key (Server-only) e API Secret (Server-only).

### Configurações Locais do Estúdio
Campos na UI para definir e salvar no servidor:
- Caminho absoluto da pasta monitorizada (ex: /Estúdio/NovasFotos).
- Pasta de quarentena para isolar ficheiros com erro.
- Política de limpeza automática (eliminar ficheiro local após upload de sucesso).
- Limite máximo de tentativas (retries) de upload por imagem.

### Monitorização de Estado (Status Health Check)
Apresentar indicadores visuais na UI:
- Sanity (Ligado / Desligado)
- Cloudinary (Ligado / Desligado)
- Worker de Monitorização (Ativo / Inativo)
- Pasta Monitorizada (Disponível / Indisponível)

---

## 4. Modelos de Dados e Persistência (Schema SQLite)

Utiliza o SQLite para persistência local intermédia através de uma biblioteca como 'better-sqlite3' ou um ORM leve. O schema deve conter:
- 'sessions': ID da Sessão, SKU, VarianteID, Data Início, Data Fim, Operador, Estado.
- 'upload_queue': ID da Imagem, Caminho Local, Estado (Pendente, Em Upload, Concluído, Falhou), Tentativas, Erro Mensagem.
- 'system_logs': ID, Timestamp, Nível (info, error), Mensagem, SessãoID.

### Estrutura de Imagens no Sanity (Array de Objetos)
Em vez de uma única string de URL, o campo no Sanity deve ser um array estruturado mapeado assim:
```ts
images: Array<{
  url: string;
  publicId: string;
  filename: string;
  position: number;
  uploadedAt: string;
}>
```
A UI deve permitir listar, ordenar as posições, remover ou substituir imagens dentro deste array do produto.

---

## 5. Dashboard de Produtos e Variantes

Consumir a API do Sanity através de loaders nativos do React Router v7.
- Listar produtos com suporte a hierarquia de variantes (ex: Produto Principal "TSHIRT001" com variantes "Preto", "Branco", "Azul").
- Permitir associar a Sessão Fotográfica ao produto pai ou diretamente a uma variante específica.
- Cada linha da tabela deve mostrar: SKU, Nome, Estado Fotográfico (Sem Fotografias, Em Sessão, Em Upload, Concluído, Erro), Número de imagens atuais, Última atualização e Miniaturas.
- Filtros em tempo real por SKU, Nome e Estado Fotográfico.

---

## 6. Resiliência do Worker de Monitorização

O Worker deve implementar os seguintes mecanismos industriais de tolerância a falhas:
- Configuração do Chokidar com 'awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }' para garantir que o upload só começa quando a Nikon D5 tiver terminado de gravar o ficheiro JPEG por completo no Mac.
- Fila de processamento sequencial para não sobrecarregar a largura de banda.
- Mecanismo de Retry automático com recuo exponencial em caso de falha de rede ao comunicar com o Cloudinary ou Sanity.
- Quarentena automática: Se o limite de retries for atingido, mover o ficheiro físico para a pasta de quarentena e marcar o estado na fila como "Falhou" com o respetivo log.
- Botão na UI para "Reprocessar Falhas" manualmente após a correção do problema.

---

## 7. Diretivas de Geração de Código

Fornece a implementação completa with as seguintes componentes estruturadas de forma limpa e modular:

1. Estrutura Completa de Diretórios (Separando as rotas da app/ e o código do worker/).
2. Configurações Globais: 'vite.config.ts', 'tailwind.config.js', 'tsconfig.json' (TypeScript estrito).
3. Ficheiro de Schema do SQLite e Modelos de Interfaces TypeScript.
4. Serviços de Infraestrutura: 'sanity.server.ts' (usando @sanity/client) e 'cloudinary.server.ts' (usando o SDK oficial do cloudinary).
5. Rotas do React Router v7:
   - Loader/Action da rota principal do Dashboard com os filtros e gestão de sessões.
   - Loader/Action da rota de Configurações com validação Zod.
   - Endpoint de Recurso SSE ('/routes/api.logs.ts') para fazer o streaming dos novos registos do SQLite para a interface do browser.
6. Código do Worker: Script do Chokidar autónomo com a lógica da fila de upload, renomeação sequencial (ex: SKU_001.jpg, SKU_002.jpg) e movimentação para quarentena ou eliminação física.
7. Componentes de UI em Tailwind CSS para a listagem e para o painel lateral de Logs em tempo real com scroll automático.
8. Um exemplo básico de teste unitário ou de integração para o processador do worker.

---

# Product Guide - Aplicação de Gestão de Fotografia para Estúdio E-commerce

## 1. Visão Geral e Objetivos
A **Aplicação de Gestão de Fotografia para Estúdio E-commerce** é uma solução full-stack integrada concebida para automatizar e otimizar o fluxo de trabalho de captura e catálogo de imagens de produtos num estúdio de e-commerce.

O objetivo principal é eliminar o esforço manual de transferir, renomear, redimensionar e associar fotografias de produtos aos respetivos SKUs no ERP ou PIM. Ao integrar diretamente a câmara física (através de monitorização de pasta local), a base de dados intermédia (SQLite), o armazenamento na cloud (Cloudinary) e a gestão de conteúdo (Sanity PIM), o sistema assegura que, em segundos após o disparo, a imagem final está disponível e associada ao produto correspondente na loja online.

## 2. Personas do Utilizador
*   **Operador/Fotógrafo do Estúdio:** Responsável por selecionar o produto ou variante na interface, iniciar a sessão fotográfica, capturar as imagens usando a câmara física Nikon D5 e monitorizar o progresso dos uploads em tempo real.
*   **Gestor de Conteúdos / Administrador:** Responsável por gerir as configurações de integração do sistema (chaves de API do Sanity e Cloudinary, caminhos de pastas locais) e monitorizar os logs globais de funcionamento do sistema.

## 3. Arquitetura Funcional
O produto opera através de duas componentes principais independentes e resilientes:

### A. Aplicação Web (Painel de Controlo)
*   **Dashboard de Produtos:** Interface para pesquisar e selecionar produtos e variantes diretamente do Sanity.
*   **Controlo de Sessão:** Botões intuitivos para "Iniciar Sessão", "Pausar" ou "Terminar Sessão".
*   **Ecrã de Monitorização:** Exibição de logs em tempo real através de Server-Sent Events (SSE) e indicadores visuais de estado do sistema (Health Checks).
*   **Gestão de Configurações:** Interface protegida do lado do servidor para ajustar credenciais e parâmetros locais do estúdio.

### B. Worker de Monitorização (Background Daemon)
*   Processo autónomo em Node.js executado localmente no computador do estúdio.
*   Utiliza a biblioteca `chokidar` para monitorizar a pasta onde o software da câmara (Nikon NX Tether) deposita as novas imagens JPEG.
*   Valida a estabilidade do ficheiro antes do upload para evitar processamento de imagens parciais.
*   Processa, renomeia sequencialmente (ex: `SKU_001.jpg`), faz o upload para o Cloudinary e atualiza o array de imagens do produto no Sanity de forma assíncrona.

## 4. Fluxos e Casos de Uso Críticos
1.  **Sessão de Captura Standard:**
    *   O Operador pesquisa pelo SKU "TSHIRT001", seleciona a variante "Preto" e clica em "Iniciar Sessão".
    *   O operador tira fotos com a Nikon D5.
    *   O Worker deteta as fotos, renomeia para `TSHIRT001_PRETO_1.jpg`, `TSHIRT001_PRETO_2.jpg`, etc., faz upload para o Cloudinary e sincroniza com o Sanity.
    *   O dashboard do operador atualiza-se via SSE com miniaturas e progresso de cada upload.
    *   O operador encerra a sessão.

2.  **Recuperação de Erros de Rede:**
    *   Se a ligação à internet falhar durante um upload, o Worker aplica uma estratégia de retry exponencial.
    *   Se atingir o limite de tentativas, a imagem é movida para uma pasta de quarentena local e marcada como "Falhou" no SQLite.
    *   O operador vê o estado de erro na UI e pode clicar em "Reprocessar Falhas" após a rede estar restabelecida.

## 5. Critérios de Sucesso e Desempenho
*   **Tempo de Resposta:** Uma fotografia capturada deve aparecer na interface web e ser integrada no Sanity em menos de 10 segundos em condições normais de rede.
*   **Resiliência:** A paragem ou reinício da aplicação web não deve interromper as tarefas em curso do Worker de Monitorização.
*   **Integridade dos Dados:** Zero perda de imagens em caso de falha de rede; garantia de quarentena para ficheiros problemáticos.
