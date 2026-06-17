/**
 * Exporta gráficos e células do Sheets para Google Docs via placeholders.
 *
 * ABA DE CONFIGURAÇÃO: "_config_graficos"
 * Colunas: aba | tipo | identificador | placeholder | referencia | tamanho | ativo
 *
 * - referencia (E): célula a verificar. Vazia = usa B2 (padrão)
 * - tamanho (F): largura do gráfico em pt. Vazia = 580 (padrão)
 * - ativo (G): TRUE/FALSE preenchido automaticamente pelo script
 */

const CONFIG_SHEET_NAME = "_config_graficos";
const DOC_NAME_PATTERN = /Relatorio|Relatório/i;
const DEFAULT_IMAGE_WIDTH_PT = 580;
const EMPTY_VALUE = "-";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Menu - Scripts")
    .addItem("Atualizar Evolução Patrimonial", "confirmarAtualizacao")
    .addSeparator()
    .addItem("Obter ID de Gráfico", "obterIdGrafico")
    .addItem("Validar e Exportar Gráficos", "validarEExportarGraficos")
    .addToUi();
}

/**
 * Abre dialog para obter ID do gráfico de uma aba específica
 */
function obterIdGrafico() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const nomesAbas = ss.getSheets().map((s) => s.getName());
  const prompt = ui.prompt(
    "📍 Obter ID de Gráfico",
    "Digite o nome da aba onde está o gráfico:\n\nAbas disponíveis:\n" +
      nomesAbas.join(", "),
    ui.ButtonSet.OK_CANCEL,
  );

  if (prompt.getSelectedButton() === ui.Button.CANCEL) {
    return;
  }

  const nomeAba = prompt.getResponseText().trim();
  const sheet = ss.getSheetByName(nomeAba);

  if (!sheet) {
    ui.alert('❌ Aba "' + nomeAba + '" não encontrada.');
    return;
  }

  const charts = sheet.getCharts();
  if (charts.length === 0) {
    ui.alert('❌ Nenhum gráfico encontrado na aba "' + nomeAba + '".');
    return;
  }

  let output = '📊 Gráficos encontrados em "' + nomeAba + '":\n\n';
  charts.forEach((chart, idx) => {
    const title = chart.getOptions().get("title") || "(sem título)";
    output +=
      idx +
      1 +
      ". ID: " +
      chart.getChartId() +
      "\n   Título: " +
      title +
      "\n\n";
  });

  ui.alert(output);
}

/**
 * Valida status dos gráficos E exporta para o Doc em uma única execução
 */
function validarEExportarGraficos() {
  const ui = SpreadsheetApp.getUi();

  try {
    const confirmacao = ui.alert(
      "⚠️ Validar e Exportar Gráficos",
      "Isso irá:\n1. Validar existência de gráficos/células\n2. Verificar células de referência\n3. Atualizar coluna G (ativo)\n4. Exportar para o Doc\n\nContinuar?",
      ui.ButtonSet.YES_NO,
    );
    if (confirmacao !== ui.Button.YES) {
      ui.alert("Operação cancelada.");
      return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mainSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!mainSheet) {
      ui.alert('❌ Aba "' + CONFIG_SHEET_NAME + '" não encontrada.');
      return;
    }

    // ETAPA 1: VALIDAR E PREENCHER COLUNA G (ativo)
    const configs = _loadConfig(ss);
    if (configs.length === 0) {
      ui.alert("Nenhuma configuração encontrada.");
      return;
    }

    const statusResultados = [];
    let ativas = 0,
      inativas = 0;
    const avisos = [];

    configs.forEach((config, idx) => {
      const { sheetName, tipo, identificador, referencia } = config;
      let ativo = false;

      const targetSheet = ss.getSheetByName(sheetName);
      if (!targetSheet) {
        avisos.push('Aba "' + sheetName + '" não encontrada');
      } else {
        // Determina qual célula verificar
        const cellToCheck = referencia || "B2";

        try {
          const cellValue = targetSheet.getRange(cellToCheck).getValue();

          if (_isCellEmpty(cellValue)) {
            // Célula de referência vazia = inativo
          } else if (tipo === "grafico") {
            const chart = _findChartById(targetSheet, Number(identificador));
            if (chart && _chartHasData(chart)) {
              ativo = true;
            } else if (!chart) {
              avisos.push(
                '["' +
                  sheetName +
                  '"] Gráfico ID ' +
                  identificador +
                  " não encontrado",
              );
            }
          } else if (tipo === "celula" || tipo === "célula") {
            // Para células, já verificamos o conteúdo acima
            ativo = true;
          }
        } catch (e) {
          avisos.push(
            '["' +
              sheetName +
              '"] Referência "' +
              cellToCheck +
              '" inválida: ' +
              e.message,
          );
        }
      }

      ativo ? ativas++ : inativas++;
      statusResultados.push([ativo]);
    });

    // Escreve status na coluna G (7ª coluna)
    mainSheet
      .getRange(2, 7, statusResultados.length, 1)
      .setValues(statusResultados);

    // ETAPA 2: EXPORTAR
    const doc = _findDocInSameFolder(ss);
    const body = doc.getBody();
    let total = 0;
    let ignorados = 0;
    const errors = [];

    configs.forEach(
      ({ sheetName, tipo, identificador, placeholder, tamanho }, idx) => {
        try {
          // Usa o valor atualizado da coluna G
          const statusAtualizado = statusResultados[idx][0];

          if (!statusAtualizado) {
            _replacePlaceholderWithText(body, placeholder, EMPTY_VALUE);
            ignorados++;
            return;
          }

          const sheet = ss.getSheetByName(sheetName);
          if (!sheet) throw new Error("Aba não encontrada");

          // Determina tamanho: coluna F vazia = 580 (padrão)
          const imageWidth =
            tamanho && tamanho > 0 ? tamanho : DEFAULT_IMAGE_WIDTH_PT;

          if (tipo === "grafico") {
            const chart = _findChartById(sheet, Number(identificador));
            if (chart && _chartHasData(chart)) {
              _replacePlaceholderWithChart(
                body,
                placeholder,
                chart,
                ss.getId(),
                chart.getChartId(),
                imageWidth,
              );
            } else {
              _replacePlaceholderWithText(body, placeholder, EMPTY_VALUE);
            }
          } else if (tipo === "celula" || tipo === "célula") {
            const cell = sheet.getRange(identificador);
            const value = _getFormattedCellValue(cell);
            _replacePlaceholderWithText(
              body,
              placeholder,
              value || EMPTY_VALUE,
            );
          }

          total++;
        } catch (error) {
          errors.push('"' + placeholder + '": ' + error.message);
        }
      },
    );

    doc.saveAndClose();

    let resumo =
      "✅ Validação e Exportação concluídas!\n\n" +
      "• Validados como ativos: " +
      ativas +
      "\n" +
      "• Validados como inativos: " +
      inativas +
      "\n" +
      "• Plotados no Doc: " +
      total +
      "\n" +
      "• Ignorados: " +
      ignorados;

    if (avisos.length > 0) {
      resumo += "\n\n⚠️ Avisos:\n" + avisos.join("\n");
    }
    if (errors.length > 0) {
      resumo += "\n\n❌ Erros:\n" + errors.join("\n");
    }

    ui.alert(resumo);
  } catch (error) {
    Logger.log("Erro: " + error.message);
    ui.alert("❌ Erro: " + error.message);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────

function _isCellEmpty(value) {
  if (value === "" || value === null) return true;
  if (typeof value === "string" && value.startsWith("#")) return true;
  if (value instanceof Error) return true;
  return false;
}

function _getFormattedCellValue(cell) {
  const display = cell.getDisplayValue();
  return display !== "" ? display : null;
}

function _replacePlaceholderWithText(body, placeholder, text) {
  const escaped = placeholder.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
  body.replaceText(escaped, text);
}

function _replacePlaceholderWithChart(
  body,
  placeholder,
  chart,
  ssId,
  chartId,
  imageWidth,
) {
  const chartUrl =
    "https://docs.google.com/spreadsheets/d/" +
    ssId +
    "/embed/oimg?id=" +
    chartId +
    "&oid=" +
    chartId +
    "&disposition=ATTACHMENT&bo=false";

  const response = UrlFetchApp.fetch(chartUrl, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("Falha HTTP " + response.getResponseCode());
  }

  const chartBlob = response.getBlob().setContentType("image/png");
  chartBlob.setName("grafico_" + chartId + ".png");

  const w = chart.getOptions().get("width") || 600;
  const h = chart.getOptions().get("height") || 371;

  const paragraphIndex = _findParagraphIndex(body, placeholder);
  if (paragraphIndex === -1)
    throw new Error('Placeholder não encontrado: "' + placeholder + '"');

  const image = body.insertImage(paragraphIndex, chartBlob);
  image.setWidth(imageWidth);
  image.setHeight(imageWidth * (h / w));
  image.getParent().setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.getChild(paragraphIndex + 1).removeFromParent();
}

function _findParagraphIndex(body, placeholder) {
  for (let i = 0; i < body.getNumChildren(); i++) {
    const el = body.getChild(i);
    if (
      el.getType() === DocumentApp.ElementType.PARAGRAPH &&
      el.asParagraph().getText().trim() === placeholder
    ) {
      return i;
    }
  }
  return -1;
}

function _findChartById(sheet, chartId) {
  return sheet.getCharts().find((c) => c.getChartId() === chartId) || null;
}

function _chartHasData(chart) {
  return chart
    .getRanges()
    .some((range) =>
      range
        .getValues()
        .some((row) =>
          row.some((cell) => cell !== "" && cell !== null && cell !== 0),
        ),
    );
}

function _findDocInSameFolder(ss) {
  const folders = DriveApp.getFileById(ss.getId()).getParents();
  if (!folders.hasNext()) throw new Error("Sheets não está em nenhuma pasta.");
  const folder = folders.next();
  const files = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  while (files.hasNext()) {
    const file = files.next();
    if (DOC_NAME_PATTERN.test(file.getName()))
      return DocumentApp.openById(file.getId());
  }
  throw new Error("Doc não encontrado com padrão: " + DOC_NAME_PATTERN);
}

function _loadConfig(ss) {
  const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet)
    throw new Error('Aba "' + CONFIG_SHEET_NAME + '" não encontrada.');

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toString().trim().toLowerCase());
  const getColumnIndex = (name) => {
    const idx = headers.indexOf(name);
    if (idx === -1) throw new Error("Coluna não encontrada: " + name);
    return idx;
  };

  const [cSheet, cTipo, cIdent, cPh, cRef, cTam, cAtivo] = [
    getColumnIndex("aba"),
    getColumnIndex("tipo"),
    getColumnIndex("identificador"),
    getColumnIndex("placeholder"),
    getColumnIndex("referencia"),
    getColumnIndex("tamanho"),
    getColumnIndex("ativo"),
  ];

  return rows
    .slice(1)
    .filter((r) => r[cSheet] && r[cTipo] && r[cIdent] && r[cPh])
    .map((r) => ({
      sheetName: r[cSheet].toString().trim(),
      tipo: r[cTipo].toString().trim().toLowerCase(),
      identificador: r[cIdent].toString().trim(),
      placeholder: r[cPh].toString().trim(),
      referencia: r[cRef] ? r[cRef].toString().trim() : "",
      tamanho: r[cTam] ? Number(r[cTam]) : 0,
      ativo:
        r[cAtivo] === true || r[cAtivo].toString().toUpperCase() === "TRUE",
    }));
}

function listarGraficos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const output = [];
  ss.getSheets().forEach((sheet) => {
    sheet.getCharts().forEach((chart) => {
      const title = chart.getOptions().get("title") || "(sem título)";
      output.push(
        "Aba: " +
          sheet.getName() +
          " | ID: " +
          chart.getChartId() +
          " | Título: " +
          title,
      );
    });
  });
  const msg = output.length ? output.join("\n") : "Nenhum gráfico encontrado.";
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
}
