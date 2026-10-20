/**
 * Rumah Ide → Content Planner (Google Sheets)
 *
 * Cara pasang (sekali saja):
 * 1. Buka spreadsheet planner di Google Sheets → menu Ekstensi → Apps Script.
 * 2. Hapus semua isi, tempel seluruh kode ini, lalu Simpan.
 * 3. Terapkan → Deployment baru → jenis "Aplikasi web".
 *    Jalankan sebagai: Saya. Yang memiliki akses: Siapa saja. → Terapkan → izinkan akses.
 * 4. Salin "URL aplikasi web" lalu tempel di Rumah Ide → Pengaturan → Spreadsheet.
 *
 * URL itu berfungsi seperti kunci: siapa pun yang memegangnya bisa menambah baris. Jangan dibagikan.
 */

var PLANNER = 'Planner'
var MASTER = 'Master'
var HEADER_ROW = 4
var FIRST_ROW = 5
var ID_COL = 11 // kolom K, tempat ID proyek Rumah Ide (supaya baris yang sama diperbarui, bukan dobel)

function doGet() {
  return json_({ ok: true, master: masterLists_() })
}

function doPost(e) {
  var body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
  var lock = LockService.getDocumentLock()
  lock.waitLock(20000)
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(PLANNER)
    if (!sh) return json_({ ok: false, error: 'Sheet "' + PLANNER + '" tidak ditemukan' })
    ensureIdHeader_(sh)
    var rows = body.rows || []
    var results = rows.map(function (r) {
      return body.action === 'delete' ? remove_(sh, r.id) : upsert_(sh, r)
    })
    return json_({ ok: true, results: results, master: masterLists_() })
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

function upsert_(sh, r) {
  if (!r || !r.id) return { ok: false, error: 'tanpa id' }
  var row = findRow_(sh, r.id) || emptyRow_(sh)
  var values = [[r.akun || '', r.status || '', r.pic || '', date_(r.tglUpload), r.pillar || '', r.jenis || '', r.judul || '', r.copywriting || '', date_(r.deadlineScript), r.catatan || '', r.id]]
  sh.getRange(row, 1, 1, ID_COL).setValues(values)
  return { ok: true, id: r.id, row: row }
}

function remove_(sh, id) {
  var row = findRow_(sh, id)
  if (row) sh.getRange(row, 1, 1, ID_COL).clearContent()
  return { ok: true, id: id, row: row || null }
}

function findRow_(sh, id) {
  var last = sh.getLastRow()
  if (last < FIRST_ROW) return null
  var ids = sh.getRange(FIRST_ROW, ID_COL, last - FIRST_ROW + 1, 1).getValues()
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return FIRST_ROW + i
  return null
}

/** Baris kosong pertama. Baris contoh bawaan ("Contoh: …") boleh ditimpa. */
function emptyRow_(sh) {
  var last = Math.max(sh.getLastRow(), FIRST_ROW)
  var data = sh.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, ID_COL).getValues()
  for (var i = 0; i < data.length; i++) {
    var r = data[i]
    var isExample = String(r[6]).indexOf('Contoh') === 0 && !r[ID_COL - 1]
    var isEmpty = r.slice(0, ID_COL).every(function (v) { return v === '' || v === null })
    if (isEmpty || isExample) return FIRST_ROW + i
  }
  return last + 1
}

function ensureIdHeader_(sh) {
  var cell = sh.getRange(HEADER_ROW, ID_COL)
  if (!cell.getValue()) {
    cell.setValue('ID Rumah Ide').setFontColor('#999999')
  }
}

function masterLists_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(MASTER)
  if (!sh) return null
  var last = Math.max(sh.getLastRow(), 2)
  var cols = sh.getRange(2, 1, last - 1, 5).getValues()
  function col(i) {
    return cols.map(function (r) { return String(r[i]).trim() }).filter(function (v) { return v })
  }
  return { status: col(0), pillar: col(1), jenis: col(2), pic: col(3), akun: col(4) }
}

function date_(s) {
  if (!s) return ''
  var p = String(s).split('-')
  return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : s
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
