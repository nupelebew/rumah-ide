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
 * Kolom dicari berdasarkan JUDUL di baris 4, jadi urutan kolom boleh berbeda.
 * URL aplikasi web berfungsi seperti kunci: siapa pun yang memegangnya bisa menambah baris. Jangan dibagikan.
 */

var PLANNER = 'Planner'
var MASTER = 'Master'
var HEADER_ROW = 4
var FIRST_ROW = 5

// nama field dari aplikasi → judul kolom di sheet Planner
var HEADERS = {
  akun: 'Akun',
  status: 'Status Postingan',
  pic: 'PIC Utama',
  tglUpload: 'Tgl Upload',
  pillar: 'Pillar',
  jenis: 'Jenis',
  judul: 'Judul Konten',
  copywriting: 'Isi Copywriting',
  deadlineScript: 'Deadline Script',
  catatan: 'Catatan Script',
  klien: 'Klien',
  id: 'ID Rumah Ide',
}
var DATE_FIELDS = { tglUpload: true, deadlineScript: true }

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
    var cols = columns_(sh)
    var rows = body.rows || []
    var results = rows.map(function (r) {
      return body.action === 'delete' ? remove_(sh, cols, r.id) : upsert_(sh, cols, r)
    })
    return json_({ ok: true, results: results, master: masterLists_() })
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

/** Peta field → nomor kolom (dari judul di baris 4). Kolom ID dibuat kalau belum ada. */
function columns_(sh) {
  var width = Math.max(sh.getLastColumn(), 1)
  var heads = sh.getRange(HEADER_ROW, 1, 1, width).getValues()[0].map(function (h) {
    return String(h).trim().toLowerCase()
  })
  var cols = {}
  for (var f in HEADERS) {
    var i = heads.indexOf(HEADERS[f].toLowerCase())
    if (i >= 0) cols[f] = i + 1
  }
  if (!cols.id) {
    var last = 0
    heads.forEach(function (h, i) { if (h) last = i + 1 })
    cols.id = last + 1
    sh.getRange(HEADER_ROW, cols.id).setValue(HEADERS.id).setFontColor('#999999')
  }
  cols.width = Math.max.apply(null, Object.keys(cols).map(function (k) { return cols[k] }))
  return cols
}

function upsert_(sh, cols, r) {
  if (!r || !r.id) return { ok: false, error: 'tanpa id' }
  var row = findRow_(sh, cols, r.id) || emptyRow_(sh, cols)
  for (var f in HEADERS) {
    if (!cols[f]) continue // kolom tidak ada di sheet ini → lewati
    var v = r[f] == null ? '' : r[f]
    sh.getRange(row, cols[f]).setValue(DATE_FIELDS[f] ? date_(v) : v)
  }
  return { ok: true, id: r.id, row: row }
}

function remove_(sh, cols, id) {
  var row = findRow_(sh, cols, id)
  if (row) {
    for (var f in HEADERS) if (cols[f]) sh.getRange(row, cols[f]).clearContent()
  }
  return { ok: true, id: id, row: row || null }
}

function findRow_(sh, cols, id) {
  var last = sh.getLastRow()
  if (last < FIRST_ROW) return null
  var ids = sh.getRange(FIRST_ROW, cols.id, last - FIRST_ROW + 1, 1).getValues()
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return FIRST_ROW + i
  return null
}

/** Baris kosong pertama. Baris contoh bawaan ("Contoh: …") boleh ditimpa. */
function emptyRow_(sh, cols) {
  var last = Math.max(sh.getLastRow(), FIRST_ROW)
  var data = sh.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, cols.width).getValues()
  for (var i = 0; i < data.length; i++) {
    var r = data[i]
    var judul = cols.judul ? String(r[cols.judul - 1]) : ''
    var isExample = judul.indexOf('Contoh') === 0 && !r[cols.id - 1]
    var isEmpty = Object.keys(HEADERS).every(function (f) {
      return !cols[f] || r[cols[f] - 1] === '' || r[cols[f] - 1] === null
    })
    if (isEmpty || isExample) return FIRST_ROW + i
  }
  return last + 1
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
