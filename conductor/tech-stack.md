# Stack de Tecnologia - Gestão de Fotografia para Estúdio E-commerce

Este documento descreve as tecnologias selecionadas para o desenvolvimento da aplicação web e do worker de monitorização de background.

## 1. Linguagens e Ambientes de Execução
*   **Runtime:** Node.js (versão >= 18 LTS) para a aplicação web e para o worker local.
*   **Linguagem Principal:** TypeScript em modo estrito (`strict: true`) tanto na aplicação frontend/backend do React Router como no worker de monitorização, para garantir segurança de tipos de ponta a ponta.
*   **Módulo de Execução:** ESM (ECMAScript Modules) nativo em todo o projeto.

## 2. Aplicação Web (Painel de Controlo)
*   **Framework Web:** **React Router v8 (ou v7 Framework Mode)** utilizando Vite como bundler. Este modo unifica o roteamento, loaders de dados do lado do servidor e as actions de mutação num único processo elegante.
*   **Framework CSS:** Tailwind CSS para estilização rápida, responsiva e focada na visibilidade em ambientes de estúdio (suporte nativo a Dark Mode).
*   **Comunicação em Tempo Real:** Server-Sent Events (SSE) nativos para o streaming unidirecional de logs e progresso de uploads da base de dados local para a interface web.
*   **Validação de Dados:** `zod` para validação robusta de esquemas no servidor e cliente (especialmente para as definições de estúdio e inputs da UI).

## 3. Worker de Monitorização (Background Daemon)
*   **Processamento de Background:** Script autónomo Node.js/TypeScript executado localmente.
*   **Monitorização do Sistema de Ficheiros:** `chokidar` para monitorizar alterações de ficheiros em tempo real, configurado com suporte para aguardar estabilização de escrita (`awaitWriteFinish`).
*   **Orquestrador de Filas:** Fila sequencial na memória ou persistida no SQLite para coordenar uploads sequenciais assíncronos.

## 4. Base de Dados Local Intermédia
*   **Motor:** SQLite (através da biblioteca `better-sqlite3`), proporcionando persistência local robusta, de alta performance e síncrona.
*   **Esquemas e Tabelas:**
    *   `sessions` (SKU, Variante, estado da sessão)
    *   `upload_queue` (lista de imagens detetadas, estado do upload, erros, retries)
    *   `system_logs` (logs estruturados partilhados com a UI por SSE)

## 5. Serviços e APIs Externas (Integradores)
*   **Sanity PIM (Product Information Management):** Ligação através do `@sanity/client` para ler dados de produtos/variantes e fazer push assíncrono de objetos de imagens para o catálogo.
*   **Cloudinary SDK:** SDK oficial do Cloudinary para Node.js para gestão, upload seguro e otimização de entrega das imagens físicas.
