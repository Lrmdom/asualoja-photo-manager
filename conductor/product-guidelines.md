# Diretrizes do Produto - Estúdio de Fotografia E-commerce

Este documento descreve as diretrizes de experiência de utilizador (UX), interface de utilizador (UI), escrita/tonalidade e padrões técnicos para a aplicação de gestão de fotografia.

## 1. Diretrizes de Experiência de Utilizador (UX)
*   **Foco no Operador Física:** O operador estará num ambiente de estúdio, muitas vezes a alguma distância do ecrã e com as mãos ocupadas com a câmara Nikon D5. Por isso:
    *   **Indicadores de Estado Ultra-Visíveis:** Os estados de "Ligado" (verde), "Em Sessão" (azul pulsação), "Erro" (vermelho) e "Inativo" (cinzento) devem ser identificáveis à distância.
    *   **Feedback Sonoro ou Altamente Visual:** Mudanças críticas de estado (ex: "Upload Concluído" ou "Erro na Quarentena") devem ter animações ou alertas visuais muito evidentes.
    *   **Minimização de Cliques:** O fluxo principal deve requerer apenas a seleção do produto no início e o fecho da sessão no fim. Todo o processo intermédio (disparo → transferência → upload → catalogação) deve ser 100% mãos-livres.

## 2. Interface de Utilizador (UI) e Estética
*   **Design Escuro/Dark Mode Amigável para Estúdio:** Os estúdios de fotografia costumam ser ambientes com iluminação controlada. Um design escuro (com contrastes elevados para texto) previne a fadiga ocular.
*   **Real-time Stream Console:** O painel de logs de sistema deve assemelhar-se a uma consola/terminal de desenvolvimento elegante, com scroll automático para novos logs, permitindo ao fotógrafo confirmar se a foto disparada foi registada e processada pelo Worker em tempo real.
*   **Miniaturas Visuais Responsivas:** As miniaturas de imagens carregadas com sucesso na sessão ativa devem ser exibidas em grelhas fluidas com indicadores de posição (1, 2, 3...) bem legíveis.

## 3. Idioma e Escrita (Tone of Voice)
*   **Língua Principal:** Português (Portugal), mantendo os termos técnicos universais (e.g., *SKU*, *logs*, *uploads*, *worker*, *payload*).
*   **Estilo:** Profissional, conciso, direto e utilitário. Evitar textos longos ou floreados.
    *   *Exemplo de Alerta:* "Upload do ficheiro SKU_001.jpg falhou após 3 tentativas. Ficheiro movido para a Quarentena."

## 4. Gestão de Erros e Resiliência
*   **Falha Silenciosa Não Permitida:** Qualquer falha no processador ou de rede deve ser registada instantaneamente na base de dados SQLite local e comunicada imediatamente à interface web por Server-Sent Events (SSE).
*   **Independência de Processos:** A UI web é o painel de controlo, mas o Worker de Monitorização local é a espinha dorsal. Se a UI for recarregada ou fechada, o Worker deve continuar a processar a fila local em background de forma autónoma.
