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

Fornece a implementação completa com as seguintes componentes estruturadas de forma limpa e modular:

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
