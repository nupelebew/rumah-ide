"""Buat Content Planner Rumah Ide (.xlsx) yang cocok dengan aplikasi & skrip Google Sheets.

Jalankan: python scripts/planner/make_planner.py public/planner/Content_Planner_Rumah_Ide.xlsx  (butuh openpyxl)
"""
import sys
from datetime import date
from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = sys.argv[1]
FIRST, LAST = 5, 504  # 500 baris konten

INK, PAPER, ACCENT, MUTED, LINE = '1D1B18', 'F3EEE4', 'D23E1F', '8A8275', 'D8CFBF'

STATUS = [
    ('Konsep', 'EDE7DC'),
    ('Referensi', 'E3E7F4'),
    ('Video Contoh', 'E6DEF3'),
    ('Syuting', 'FBE3C8'),
    ('Editing', 'F8D9CF'),
    ('Siap Upload', 'D6E8D2'),
    ('Sudah Upload', 'A9D5A0'),
    ('On Hold', 'E0E0E0'),
    ('Reschedule', 'F3E3BD'),
    ('Revisi', 'F6C9C0'),
]
PILLAR = ['Engagement', 'Education', 'Social Proof', 'Brand Knowledge', 'Promotion', 'Story Telling', 'Personal Branding', 'Katalog', 'KOL Brief', 'Produk', 'Pengumuman', 'Behind The Scene']
JENIS = ['Instagram Reels', 'Instagram Story', 'Instagram Carousel Feed', 'Instagram Single Feed', 'TikTok Video', 'TikTok Story', 'TikTok Ads', 'YouTube Video', 'YouTube Shorts']
PIC = ['PIC 1', 'PIC 2', 'PIC 3', 'PIC 4', 'PIC 5']
AKUN = ['Akun 1', 'Akun 2', 'Akun 3', 'Akun 4', 'Akun 5']

COLS = [
    # (judul, lebar)
    ('Akun', 16),
    ('Status Postingan', 17),
    ('PIC Utama', 13),
    ('Tgl Upload', 13),
    ('Pillar', 18),
    ('Jenis', 22),
    ('Judul Konten', 36),
    ('Isi Copywriting', 46),
    ('Deadline Script', 15),
    ('Catatan Script', 40),
    ('Klien', 18),
    ('Hasil', 26),
    ('Link Google Drive', 30),
    ('Link Postingan', 30),
    ('ID Rumah Ide', 12),
]
ID_COL = len(COLS)
LAST_LETTER = get_column_letter(ID_COL)

thin = Side(style='thin', color=LINE)
border = Border(left=thin, right=thin, top=thin, bottom=thin)
head_font = Font(name='Arial', bold=True, color='FFFFFF', size=10)
head_fill = PatternFill('solid', fgColor=INK)
title_font = Font(name='Arial', bold=True, size=16, color=INK)
note_font = Font(name='Arial', italic=True, size=9, color=MUTED)
body_font = Font(name='Arial', size=10, color=INK)
input_font = Font(name='Arial', size=10, color='1F4E9E')  # teks biru = bisa diganti

wb = Workbook()

# ---------------- Master ----------------
ms = wb.active
ms.title = 'Master'
master_cols = [('Status', [s for s, _ in STATUS]), ('Pillar', PILLAR), ('Jenis', JENIS), ('PIC', PIC), ('Akun', AKUN)]
for c, (name, values) in enumerate(master_cols, 1):
    h = ms.cell(row=1, column=c, value=name)
    h.font, h.fill, h.alignment = head_font, head_fill, Alignment(horizontal='left', vertical='center')
    for r, v in enumerate(values, 2):
        cell = ms.cell(row=r, column=c, value=v)
        cell.font = input_font if name in ('PIC', 'Akun') else body_font
        cell.border = border
    ms.column_dimensions[get_column_letter(c)].width = 22
ms.cell(row=1, column=7, value='Catatan').font = Font(name='Arial', bold=True, size=10)
notes = [
    'Teks biru (PIC dan Akun) ganti dengan nama sebenarnya, mis. @namaakun.',
    'Status mengikuti 5 langkah proyek di aplikasi Rumah Ide. Urutan jangan diubah.',
    'Pillar & Jenis boleh ditambah di bawah daftarnya (sampai baris 30).',
    'Kolom ID Rumah Ide (paling kanan) diisi otomatis oleh aplikasi. Jangan diubah.',
]
for i, n in enumerate(notes, 2):
    ms.cell(row=i, column=7, value=n).font = note_font
ms.column_dimensions['G'].width = 70
ms.freeze_panes = 'A2'

def master_range(col):
    letter = get_column_letter(col)
    return f'Master!${letter}$2:${letter}$30'

# ---------------- Planner ----------------
pl = wb.create_sheet('Planner', 0)
pl['A1'] = 'CONTENT PLANNER · RUMAH IDE'
pl['A1'].font = title_font
pl['A2'] = ('Diisi otomatis dari aplikasi Rumah Ide (bisa juga manual). Kolom Akun, Status, PIC, Pillar, Jenis pakai dropdown dari sheet Master. '
            'Baris 5 adalah contoh, boleh ditimpa. Kolom ID Rumah Ide dipakai aplikasi, jangan diubah.')
pl['A2'].font = note_font
pl['A2'].alignment = Alignment(wrap_text=True, vertical='top')
pl.merge_cells(f'A2:{LAST_LETTER}2')
pl.row_dimensions[2].height = 30

for c, (name, width) in enumerate(COLS, 1):
    cell = pl.cell(row=4, column=c, value=name)
    cell.font, cell.fill, cell.border = head_font, head_fill, border
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    pl.column_dimensions[get_column_letter(c)].width = width
pl[f'{LAST_LETTER}4'].fill = PatternFill('solid', fgColor=MUTED)
pl.row_dimensions[4].height = 28

example = ['Akun 1', 'Konsep', 'PIC 1', date(2026, 10, 26), 'Education', 'Instagram Reels',
           'Contoh: 5 kesalahan pemula saat latihan tenis', 'Contoh: Ketahui 5 kesalahan ini supaya latihanmu tidak sia-sia…',
           date(2026, 10, 23), 'Contoh: hook bola memantul slow-mo, CTA simpan postingan', 'Contoh: Klub Tenis 75',
           'Contoh: Final v2 · 30 dtk · 9:16', '', '', '']
for r in range(FIRST, LAST + 1):
    for c in range(1, len(COLS) + 1):
        cell = pl.cell(row=r, column=c)
        cell.border = border
        cell.font = body_font
        cell.alignment = Alignment(vertical='top', wrap_text=c in (7, 8, 10))
        if c in (4, 9):
            cell.number_format = 'DD MMM YYYY'
    pl.cell(row=r, column=ID_COL).font = Font(name='Arial', size=8, color='B0A898')
    for c in (13, 14):
        pl.cell(row=r, column=c).font = Font(name='Arial', size=10, color='1F4E9E', underline='single')
for c, v in enumerate(example, 1):
    pl.cell(row=FIRST, column=c, value=v)
    if c in (7, 8, 10, 11, 12):
        pl.cell(row=FIRST, column=c).font = Font(name='Arial', size=10, italic=True, color=MUTED)

rng = lambda col: f'{col}{FIRST}:{col}{LAST}'
for col, mcol, title in [('A', 5, 'Akun'), ('B', 1, 'Status'), ('C', 4, 'PIC'), ('E', 2, 'Pillar'), ('F', 3, 'Jenis')]:
    dv = DataValidation(type='list', formula1=master_range(mcol), allow_blank=True, showErrorMessage=False)
    dv.promptTitle, dv.prompt = title, f'Pilih {title.lower()} dari daftar (atur di sheet Master)'
    pl.add_data_validation(dv)
    dv.add(rng(col))
dv_date = DataValidation(type='date', operator='greaterThan', formula1='36526', allow_blank=True, showErrorMessage=True, errorTitle='Tanggal', error='Isi dengan tanggal')
pl.add_data_validation(dv_date)
dv_date.add(rng('D'))
dv_date.add(rng('I'))

# warna per status (seluruh baris tipis + sel status tegas)
for name, color in STATUS:
    pl.conditional_formatting.add(rng('B'), FormulaRule(formula=[f'$B{FIRST}="{name}"'], fill=PatternFill('solid', fgColor=color), font=Font(bold=True, color=INK)))
# deadline script lewat & belum siap upload → merah
pl.conditional_formatting.add(rng('I'), FormulaRule(
    formula=[f'AND($I{FIRST}<>"",$I{FIRST}<TODAY(),OR($B{FIRST}="Konsep",$B{FIRST}="Referensi",$B{FIRST}="Video Contoh"))'],
    font=Font(bold=True, color=ACCENT)))

pl.freeze_panes = 'A5'
pl.auto_filter.ref = f'A4:{LAST_LETTER}{LAST}'
pl.sheet_view.zoomScale = 100

# ---------------- Ringkasan ----------------
rs = wb.create_sheet('Ringkasan', 1)
rs['A1'] = 'RINGKASAN PER AKUN'
rs['A1'].font = title_font
rs['A2'] = 'Dihitung otomatis dari sheet Planner. Tidak perlu diisi.'
rs['A2'].font = note_font
rs.cell(row=4, column=1, value='Akun')
for i in range(len(STATUS)):
    rs.cell(row=4, column=2 + i, value=f'=Master!$A${2 + i}')
tot_col = 2 + len(STATUS)
rs.cell(row=4, column=tot_col, value='Total')
for c in range(1, tot_col + 1):
    h = rs.cell(row=4, column=c)
    h.font, h.fill, h.border = head_font, head_fill, border
    h.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    rs.column_dimensions[get_column_letter(c)].width = 13 if c > 1 else 18
rs.row_dimensions[4].height = 30
for i in range(len(AKUN)):
    r = 5 + i
    rs.cell(row=r, column=1, value=f'=Master!$E${2 + i}').font = Font(name='Arial', bold=True, size=10)
    for j in range(len(STATUS)):
        col = get_column_letter(2 + j)
        rs.cell(row=r, column=2 + j, value=f'=COUNTIFS(Planner!$A${FIRST}:$A${LAST},$A{r},Planner!$B${FIRST}:$B${LAST},{col}$4)')
    rs.cell(row=r, column=tot_col, value=f'=SUM(B{r}:{get_column_letter(tot_col - 1)}{r})').font = Font(name='Arial', bold=True, size=10)
tr = 5 + len(AKUN)
rs.cell(row=tr, column=1, value='Total').font = Font(name='Arial', bold=True, size=10)
for c in range(2, tot_col + 1):
    L = get_column_letter(c)
    rs.cell(row=tr, column=c, value=f'=SUM({L}5:{L}{tr - 1})').font = Font(name='Arial', bold=True, size=10)
for r in range(5, tr + 1):
    for c in range(1, tot_col + 1):
        cell = rs.cell(row=r, column=c)
        cell.border = border
        if c > 1:
            cell.alignment = Alignment(horizontal='center')
        if r == tr:
            cell.fill = PatternFill('solid', fgColor=PAPER)

# rekap bulan ini & minggu ini
br = tr + 2
rs.cell(row=br, column=1, value='Jadwal upload').font = Font(name='Arial', bold=True, size=12)
rows = [
    ('Minggu ini', f'=COUNTIFS(Planner!$D${FIRST}:$D${LAST},">="&(TODAY()-WEEKDAY(TODAY(),2)+1),Planner!$D${FIRST}:$D${LAST},"<="&(TODAY()-WEEKDAY(TODAY(),2)+7))'),
    ('Bulan ini', f'=COUNTIFS(Planner!$D${FIRST}:$D${LAST},">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Planner!$D${FIRST}:$D${LAST},"<="&EOMONTH(TODAY(),0))'),
    ('Terlambat (lewat tgl upload, belum diupload)', f'=COUNTIFS(Planner!$D${FIRST}:$D${LAST},"<"&TODAY(),Planner!$B${FIRST}:$B${LAST},"<>Sudah Upload",Planner!$G${FIRST}:$G${LAST},"<>")'),
]
for i, (label, formula) in enumerate(rows, 1):
    rs.cell(row=br + i, column=1, value=label).font = body_font
    v = rs.cell(row=br + i, column=2, value=formula)
    v.font = Font(name='Arial', bold=True, size=11)
    v.alignment = Alignment(horizontal='center')
    for c in (1, 2):
        rs.cell(row=br + i, column=c).border = border
rs.column_dimensions['A'].width = 40

wb.active = 0
wb.save(OUT)
print('tersimpan', OUT)
