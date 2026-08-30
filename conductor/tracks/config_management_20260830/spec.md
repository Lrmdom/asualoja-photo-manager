# Spec: Gestão de Configurações e Estado

Este track foca na implementação da gestão de configurações sensíveis, configurações locais do estúdio e sistema de health check para a aplicação.

## Requisitos

### Integrações e Segurança
- Gestão de credenciais (Sanity, Cloudinary) exclusivamente no servidor (.env).
- Proibição de exposição de segredos no browser.

### Configurações Locais do Estúdio (UI + Server)
- Caminho pasta monitorizada.
- Pasta quarentena.
- Política limpeza.
- Limite retries.

### Monitorização de Estado (Health Check)
- UI Indicadores (Sanity, Cloudinary, Worker, Pasta).
