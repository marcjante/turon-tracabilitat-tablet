// La llibreria exceljs és pesada — es carrega només quan es prem el
// botó de descàrrega (code-splitting), no en el bundle inicial.

export async function baixarExcel(fulls, nomFitxer) {
  const { default: ExcelJS } = await import('exceljs')

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Turon — Traçabilitat'
  wb.created = new Date()

  for (const full of fulls) {
    const ws = wb.addWorksheet(full.nom.slice(0, 31))
    ws.columns = full.columnes
    ws.addRows(full.files)
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: full.columnes.length } }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFitxer
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
