# Google Sheets → Google Docs Report Generator

Automação desenvolvida em Google Apps Script para gerar relatórios automaticamente a partir de dados, métricas e gráficos presentes em planilhas do Google Sheets.

A solução utiliza uma planilha de configuração para identificar quais informações devem ser exportadas e substitui placeholders em um documento Google Docs, eliminando atividades manuais de copiar e colar gráficos e indicadores.

---

## Visão Geral

O projeto foi criado para automatizar a geração de relatórios recorrentes.

Através de uma aba de configuração, é possível definir:

- Gráficos a serem exportados
- Células que serão utilizadas como indicadores
- Placeholders de destino no documento
- Tamanho das imagens
- Regras de validação

Durante a execução, o sistema verifica se os dados estão disponíveis e atualiza automaticamente o documento final.

---

## Problema Resolvido

Em processos de acompanhamento e reporting é comum:

- Abrir diversas abas manualmente
- Copiar gráficos
- Copiar indicadores
- Colar informações em documentos
- Ajustar imagens
- Revisar conteúdo repetitivo

A automação elimina essas etapas, reduzindo erros operacionais e tempo de execução.

---

## Funcionalidades

### Exportação de Gráficos

- Localização de gráficos por ID
- Captura automática da imagem
- Inserção em Google Docs
- Ajuste proporcional de tamanho

### Exportação de Indicadores

- Leitura de células configuradas
- Preservação da formatação exibida
- Atualização automática de placeholders

### Validação de Conteúdo

Antes da exportação o sistema verifica:

- Existência das abas
- Existência dos gráficos
- Existência das células configuradas
- Presença de dados válidos

Itens sem dados são automaticamente ignorados.

### Configuração Centralizada

Toda a parametrização é realizada em uma aba dedicada.

Exemplo:

| aba | tipo | identificador | placeholder |
|------|------|------|------|
| Dashboard | gráfico | 123456 | {{grafico_receita}} |
| Indicadores | célula | B4 | {{receita_total}} |

Sem necessidade de alterar o código.

---

## Fluxo da Aplicação

```text
Google Sheets
       │
       ▼
Leitura da Configuração
       │
       ▼
Validação dos Dados
       │
       ▼
Captura de Gráficos
       │
       ▼
Leitura de Indicadores
       │
       ▼
Substituição de Placeholders
       │
       ▼
Google Docs Atualizado
```

---

## Tecnologias Utilizadas

| Tecnologia | Finalidade |
|------------|------------|
| Google Apps Script | Automação |
| Google Sheets | Fonte de dados |
| Google Docs | Documento final |
| Google Drive | Armazenamento |
| JavaScript | Regras de negócio |

---

## Estrutura da Configuração

A aba `_config_graficos` controla todo o comportamento da automação.

| Campo | Descrição |
|---------|------------|
| aba | Origem dos dados |
| tipo | gráfico ou célula |
| identificador | ID do gráfico ou referência da célula |
| placeholder | marcador no documento |
| referencia | célula de validação |
| tamanho | largura da imagem |
| ativo | status calculado automaticamente |

---

## Diferenciais

- Configuração sem alterar código
- Exportação automática de gráficos
- Integração entre Sheets e Docs
- Validação automática dos dados
- Tratamento de erros
- Estrutura reutilizável para diferentes relatórios

---

## Possíveis Evoluções

- [ ] Exportação para PDF
- [ ] Envio automático por e-mail
- [ ] Agendamento periódico
- [ ] Histórico de execuções
- [ ] Dashboard de monitoramento

---

## Exemplo de Uso

1. Configurar os itens na aba de parâmetros
2. Inserir os placeholders no Google Docs
3. Executar a automação
4. Gerar o relatório atualizado automaticamente

---

## Autor

**Fábio Oliveira**

Ciências Contábeis – FIPECAFI

Google Apps Script • Automação • Dados • Processos
