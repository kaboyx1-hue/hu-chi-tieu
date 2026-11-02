// May chu cua Hu Chi Tieu: luu so vao Google Sheet cua chinh script nay.
// Khong co mat khau trong file nay. Khoa rieng duoc giu trong Script Properties.

const BANG = {
  gd: { ten: 'GIAO_DICH', cot: ['id', 'ngay', 'loai', 'hu', 'tien', 'ghi', 'sua', 'xoa', 'rev'], chu: ['id', 'ngay', 'loai', 'hu', 'ghi'] },
  hu: { ten: 'HU', cot: ['id', 'ten', 'icon', 'tt', 'sua', 'xoa', 'rev'], chu: ['id', 'ten', 'icon'] },
  hm: { ten: 'HAN_MUC', cot: ['id', 'hu', 'tu', 'tien', 'sua', 'xoa', 'rev'], chu: ['id', 'hu', 'tu'] },
};
const TOI_DA_MOI_LAN = 500;

function doGet() {
  return ContentService.createTextOutput('Hu Chi Tieu dang chay.');
}

function doPost(e) {
  try {
    return tra_(xuLy_(JSON.parse(e.postData.contents)));
  } catch (loi) {
    return tra_({ ok: false, loi: String(loi && loi.message || loi) });
  }
}

function tra_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function xuLy_(goi) {
  const khoa = goi && goi.k;
  if (typeof khoa !== 'string' || !/^[\w-]{32,128}$/.test(khoa)) return { ok: false, loi: 'khoa' };

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const kho = PropertiesService.getScriptProperties();
    const daCo = kho.getProperty('KHOA');
    if (!daCo) kho.setProperty('KHOA', khoa); // link rieng dau tien mo so; ai khac khong biet dia chi nay
    else if (daCo !== khoa) return { ok: false, loi: 'khoa' };

    // Mat ma: link rieng thoi chua du, phai co "the" duoc cap sau khi nhap dung mat ma.
    const pin = kho.getProperty('PIN');
    if (goi.hoiPin) return { ok: true, coPin: !!pin };
    if (goi.datPin !== undefined) {
      if (pin) return { ok: false, loi: 'da co mat ma' };
      if (!pinHopLe_(goi.datPin)) return { ok: false, loi: 'mat ma phai du 6 so' };
      return { ok: true, the: luuPin_(kho, goi.datPin) };
    }
    if (goi.pin !== undefined) return thuPin_(kho, goi.pin, pin);
    if (pin && goi.the !== theCua_(pin)) return { ok: false, loi: 'pin' };
    if (goi.pinMoi !== undefined) {
      if (!pinHopLe_(goi.pinMoi)) return { ok: false, loi: 'mat ma phai du 6 so' };
      const cu = thuPin_(kho, goi.pinCu, pin);
      return cu.ok ? { ok: true, the: luuPin_(kho, goi.pinMoi) } : cu;
    }

    const thay = Array.isArray(goi.thay) ? goi.thay : [];
    if (thay.length > TOI_DA_MOI_LAN) return { ok: false, loi: 'qua nhieu ban ghi' };
    const tu = Number(goi.tu) || 0;
    let rev = Number(kho.getProperty('REV')) || 0;

    // Khong co gi moi thi khoi doc Sheet, moi may tu dong hoi 1 phut 1 lan.
    if (!thay.length && tu === rev) return { ok: true, ds: [], tu: rev, boQua: [] };

    const boQua = [];
    const theoBang = {};
    for (const m of thay) {
      if (!hopLe_(m)) { boQua.push(m && m.r && m.r.id); continue; }
      (theoBang[m.b] = theoBang[m.b] || []).push(m.r);
    }

    const ds = [];
    for (const b of Object.keys(BANG)) {
      const sh = bangCua_(b);
      const cot = BANG[b].cot;
      const hang = doc_(sh, b);
      const viTri = {};
      hang.forEach((r, i) => { viTri[r.id] = i; });

      for (const r of theoBang[b] || []) {
        const i = viTri[r.id];
        if (i !== undefined && hang[i].sua > r.sua) continue; // ban tren Sheet moi hon
        const moi = Object.assign({}, r, { rev: ++rev });
        const dong = cot.map(c => giaTriO_(b, c, moi[c]));
        if (i !== undefined) {
          sh.getRange(i + 2, 1, 1, cot.length).setValues([dong]);
          hang[i] = moi;
        } else {
          nhoiHang_(sh, b, hang.length + 2);
          sh.getRange(hang.length + 2, 1, 1, cot.length).setValues([dong]);
          viTri[r.id] = hang.length;
          hang.push(moi);
        }
      }
      for (const r of hang) if (r.rev > tu) ds.push({ b, r });
    }

    kho.setProperty('REV', String(rev));
    return { ok: true, ds, tu: rev, boQua };
  } finally {
    lock.releaseLock();
  }
}

const pinHopLe_ = p => typeof p === 'string' && /^\d{6}$/.test(p);

function bam_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}
const theCua_ = pin => bam_(pin + ':the');

// Chi luu ban bam kem muoi, khong luu mat ma. Doi mat ma thi moi the cu het hieu luc.
function luuPin_(kho, p) {
  const muoi = Utilities.getUuid();
  const pin = muoi + '.' + bam_(muoi + ':' + p);
  kho.setProperty('PIN', pin);
  kho.setProperty('PIN_SAI', '0');
  kho.setProperty('PIN_DOI', '0');
  return theCua_(pin);
}

// Sai 5 lan khoa 15 phut, moi 5 lan sai tiep thoi gian khoa gap doi, toi da 1 ngay.
function thuPin_(kho, p, pin) {
  if (!pin) return { ok: false, loi: 'chua co mat ma' };
  const bayGio = Date.now();
  const doi = Number(kho.getProperty('PIN_DOI')) || 0;
  if (bayGio < doi) return { ok: false, loi: 'khoaPin', doi: doi - bayGio };

  const [muoi, bam] = pin.split('.');
  if (pinHopLe_(p) && bam_(muoi + ':' + p) === bam) {
    kho.setProperty('PIN_SAI', '0');
    return { ok: true, the: theCua_(pin) };
  }
  const sai = (Number(kho.getProperty('PIN_SAI')) || 0) + 1;
  kho.setProperty('PIN_SAI', String(sai));
  if (sai % 5) return { ok: false, loi: 'saiPin', conLai: 5 - sai % 5 };
  const lau = Math.min(86400000, 900000 * 2 ** (sai / 5 - 1));
  kho.setProperty('PIN_DOI', String(bayGio + lau));
  return { ok: false, loi: 'khoaPin', doi: lau };
}

// Dinh dang chu thuan khong du: Sheets that van tinh "=1+1" thanh 2 va nuot dau ' o dau.
// Them mot dau ' phia truoc thi Sheets giu nguyen van va khong luu dau nay.
function giaTriO_(b, c, v) {
  if (v === undefined) return '';
  return BANG[b].chu.includes(c) && /^[=+\-@']/.test(v) ? "'" + v : v;
}

function hopLe_(m) {
  const r = m && m.r;
  if (!r || !BANG[m.b] || typeof r.id !== 'string' || !/^[\w-]{1,48}$/.test(r.id)) return false;
  if (!(Number.isFinite(r.sua) && r.sua > 0) || (r.xoa !== 0 && r.xoa !== 1)) return false;
  const chu = (s, dai) => typeof s === 'string' && s.length <= dai;
  const tien = n => Number.isInteger(n) && n >= 0 && n < 1e12;

  if (m.b === 'gd') {
    return (r.loai === 'chi' || r.loai === 'thu') && ngayThat_(r.ngay) && tien(r.tien) && r.tien > 0 &&
      chu(r.hu, 48) && chu(r.ghi, 200);
  }
  if (m.b === 'hu') return chu(r.ten, 40) && r.ten.length > 0 && chu(r.icon, 16) && Number.isFinite(r.tt);
  return chu(r.hu, 48) && r.hu.length > 0 && /^\d{4}-(0[1-9]|1[0-2])$/.test(r.tu) && tien(r.tien);
}

function ngayThat_(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function bangCua_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { ten, cot, chu } = BANG[b];
  let sh = ss.getSheetByName(ten);
  if (sh) return sh;

  // Dung lai trang trong mac dinh cua file moi, khong de thua "Sheet1".
  const dau = ss.getSheets()[0];
  const laTrangMacDinh = dau.getLastRow() === 0 && !Object.values(BANG).some(x => x.ten === dau.getName());
  if (laTrangMacDinh) { sh = dau; sh.setName(ten); }
  else sh = ss.insertSheet(ten);

  sh.getRange(1, 1, 1, cot.length).setValues([cot]).setFontWeight('bold');
  sh.setFrozenRows(1);
  // Dinh dang chu thuan: Sheets khong tu doi "2026-11-01" thanh ngay.
  dinhDangChu_(sh, b, 1, sh.getMaxRows());
  return sh;
}

function dinhDangChu_(sh, b, tuHang, soHang) {
  const { cot, chu } = BANG[b];
  for (const c of chu) sh.getRange(tuHang, cot.indexOf(c) + 1, soHang, 1).setNumberFormat('@');
}

// File Sheet moi chi co 1000 hang, ghi qua do se bao loi.
function nhoiHang_(sh, b, hang) {
  const max = sh.getMaxRows();
  if (hang <= max) return;
  sh.insertRowsAfter(max, 1000);
  dinhDangChu_(sh, b, max + 1, 1000);
}

function doc_(sh, b) {
  const { cot, chu } = BANG[b];
  const dong = sh.getLastRow() - 1;
  if (dong < 1) return [];
  return sh.getRange(2, 1, dong, cot.length).getValues().map(v => {
    const r = {};
    cot.forEach((c, i) => { r[c] = chu.includes(c) ? String(v[i]) : Number(v[i]) || 0; });
    return r;
  });
}

// Quen mat ma: chay ham nay trong trinh soan thao, so van con nguyen, mo app se dat mat ma moi.
function xoaPin() {
  const kho = PropertiesService.getScriptProperties();
  ['PIN', 'PIN_SAI', 'PIN_DOI'].forEach(k => kho.deleteProperty(k));
  Logger.log('Da xoa mat ma.');
}

// Chay 1 lan trong trinh soan thao de cap quyen cho script doc ghi Sheet nay.
function capQuyen() {
  Object.keys(BANG).forEach(bangCua_);
  Logger.log('Xong. Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
}
