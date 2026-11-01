const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tinh.js');

const gd = (ngay, loai, tien, hu = 'an', extra = {}) => ({ ngay, loai, tien, hu, xoa: 0, ...extra });
const HUS = [{ id: 'an', ten: 'Ăn', icon: 'x', xoa: 0 }, { id: 'nha', ten: 'Nhà', icon: 'y', xoa: 0 }];

test('ngay theo gio may, khong lech sang hom truoc', () => {
  assert.equal(T.homNay(new Date(2026, 10, 1, 0, 30)), '2026-11-01');
  assert.equal(T.homNay(new Date(2026, 0, 9, 23, 59)), '2026-01-09');
});

test('thang: so ngay va cong tru qua nam', () => {
  assert.equal(T.soNgayThang('2026-02'), 28);
  assert.equal(T.soNgayThang('2028-02'), 29);
  assert.equal(T.soNgayThang('2026-12'), 31);
  assert.equal(T.congThang('2026-12', 1), '2027-01');
  assert.equal(T.congThang('2026-01', -1), '2025-12');
  assert.equal(T.congThang('2026-05', -12), '2025-05');
});

test('doc va hien tien', () => {
  assert.equal(T.docTien('1.250.000'), 1250000);
  assert.equal(T.docTien(''), 0);
  assert.equal(T.docTien(null), 0);
  assert.equal(T.docTien('abc'), 0);
  assert.equal(T.docTien('9999999999999999'), 999999999999);
  assert.equal(T.hienTien(1250000), '1.250.000đ');
  assert.equal(T.hienTien(0), '0đ');
  assert.equal(T.hienTien(-500), '−500đ');
  assert.equal(T.hienSo(999), '999');
});

test('han muc doi thang nay khong lam sai thang cu', () => {
  const hm = [{ hu: 'an', tu: '2026-09', tien: 5, xoa: 0 }, { hu: 'an', tu: '2026-11', tien: 7, xoa: 0 }];
  assert.equal(T.hanMuc(hm, 'an', '2026-08'), 0);
  assert.equal(T.hanMuc(hm, 'an', '2026-10'), 5);
  assert.equal(T.hanMuc(hm, 'an', '2026-11'), 7);
  assert.equal(T.hanMuc(hm, 'an', '2027-03'), 7);
  assert.equal(T.hanMuc(hm, 'nha', '2026-11'), 0);
});

test('bao cao dong tien: du dau, thu, chi, du cuoi', () => {
  const ds = [
    gd('2026-10-05', 'thu', 1000), gd('2026-10-06', 'chi', 300),
    gd('2026-11-01', 'thu', 500), gd('2026-11-02', 'chi', 200), gd('2026-11-02', 'chi', 100, 'nha'),
    gd('2026-12-01', 'chi', 9999),
    gd('2026-11-03', 'chi', 7777, 'an', { xoa: 1 }), // da xoa khong duoc tinh
  ];
  const b = T.baoCao(ds, HUS, [], '2026-11', '2026-11-10');
  assert.equal(b.duDau, 700);
  assert.equal(b.thu, 500);
  assert.equal(b.chi, 300);
  assert.equal(b.conThang, 200);
  assert.equal(b.duCuoi, 900);
  assert.equal(b.theoNgay.length, 30);
  assert.equal(b.theoNgay[1], 300);
  assert.equal(b.theoNgay.reduce((a, c) => a + c, 0), b.chi);
});

test('tong cac hu luon bang tong chi, ke ca hu da xoa va hu la', () => {
  const hus = [...HUS, { id: 'cu', ten: 'Cũ', icon: 'z', xoa: 1 }, { id: 'bo', ten: 'Bỏ', icon: 'w', xoa: 1 }];
  const ds = [gd('2026-11-01', 'chi', 10), gd('2026-11-01', 'chi', 20, 'cu'), gd('2026-11-01', 'chi', 40, 'khongco')];
  const b = T.baoCao(ds, hus, [], '2026-11', '2026-11-05');
  assert.equal(b.hus.reduce((s, h) => s + h.chi, 0), b.chi);
  assert.ok(b.hus.some(h => h.id === 'cu'));
  assert.ok(!b.hus.some(h => h.id === 'bo'));
  assert.ok(b.hus.some(h => h.id === 'khongco' && h.ten === 'Chưa rõ hũ'));
});

test('nhip chi: con tieu duoc/ngay va du bao', () => {
  const hm = [{ hu: 'an', tu: '2026-11', tien: 3000000, xoa: 0 }];
  const b = T.baoCao([gd('2026-11-01', 'chi', 500000)], HUS, hm, '2026-11', '2026-11-11');
  assert.equal(b.ngayCon, 20); // 11..30, tinh ca hom nay
  assert.equal(b.moiNgay, 125000);
  assert.equal(b.tbNgay, 500000 / 11);
  assert.equal(b.duBao, Math.round(500000 / 11 * 30));
});

test('vuot han muc: con tieu duoc khong am, ngay cuoi thang khong chia 0', () => {
  const hm = [{ hu: 'an', tu: '2026-11', tien: 100, xoa: 0 }];
  const b = T.baoCao([gd('2026-11-01', 'chi', 500)], HUS, hm, '2026-11', '2026-11-30');
  assert.equal(b.ngayCon, 1);
  assert.equal(b.moiNgay, 0);
  assert.equal(b.hus[0].con, -400);
});

test('thang da qua khong co nhip, du bao bang so that', () => {
  const b = T.baoCao([gd('2026-10-01', 'chi', 500)], HUS, [], '2026-10', '2026-11-05');
  assert.equal(b.laHienTai, false);
  assert.equal(b.moiNgay, null);
  assert.equal(b.duBao, 500);
});

test('thang trong khong loi', () => {
  const b = T.baoCao([], [], [], '2026-11', '2026-11-05');
  assert.equal(b.duCuoi, 0);
  assert.equal(b.moiNgay, null);
  assert.deepEqual(b.hus, []);
});

test('gop: ban moi hon thang, ban cu khong de len', () => {
  const kho = { a: { id: 'a', sua: 5, v: 'may' } };
  T.gop(kho, { id: 'a', sua: 4, v: 'cu' });
  assert.equal(kho.a.v, 'may');
  T.gop(kho, { id: 'a', sua: 6, v: 'moi' });
  assert.equal(kho.a.v, 'moi');
  T.gop(kho, { id: 'b', sua: 1, v: 'la' });
  assert.equal(kho.b.v, 'la');
});

test('moc sua luon tang du dong ho may cham', () => {
  assert.equal(T.moc({ sua: 1000 }, 500), 1001);
  assert.equal(T.moc({ sua: 1000 }, 2000), 2000);
  assert.equal(T.moc(undefined, 2000), 2000);
});
