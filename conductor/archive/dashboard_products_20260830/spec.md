# Spec: Dashboard de Produtos e Variantes

Este track foca na implementação da interface de visualização de produtos, hierarquia de variantes e gestão de sessões fotográficas.

## Requisitos

- Consumo da API do Sanity (loaders nativos React Router).
- Listagem hierárquica (Produto Pai -> Variantes).
- Associação de Sessão Fotográfica (Pai ou Variante).
- Tabela com: SKU, Nome, Estado (Sem Fotos, Em Sessão, Em Upload, Concluído, Erro), Qtd Imagens, Miniaturas.
- Filtros em tempo real.
