// Chay Code.js that tren Sheet gia. Sheet gia bat chuoc cac tro cua Google Sheets:
// tu doi chuoi ngay thanh Date, chuoi so thanh so, "=..." thanh cong thuc, va bao loi khi ghi qua so hang.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function dungMoiTruong() {
  const tabs = {};
  const moiTab = ten => {
    const t = {
      ten, luoi: [], chu: {}, maxHang: 1000,
      getName: () => t.ten,
      setName: n => { delete tabs[t.ten]; t.ten = n; tabs[n] = t; },
      getLastRow: () => t.luoi.length,
      getMaxRows: () => t.maxHang,
      setFrozenRows() {},
      insertRowsAfter: (sau, n) => { t.maxHang += n; },
      getRange(h, c, soH = 1, soC = 1) {
        if (h + soH - 1 > t.maxHang) throw new Error('ngoai pham vi');
        return {
          setFontWeight() { return this; },
          setNumberFormat(f) { if (f === '@') for (let i = 0; i < soH; i++) t.chu[`${h + i}:${c}`] = 1; return this; },
          setValues(v) {
            v.forEach((dong, i) => dong.forEach((x, j) => {
              const hang = h + i - 1;
              while (t.luoi.length <= hang) t.luoi.push([]);
              let gt = x;
              if (typeof x === 'string' && !t.chu[`${h + i}:${c + j}`]) {
                if (/^\d{4}-\d{2}-\d{2}$/.test(x)) gt = new Date(x);
                else if (/^\d+$/.test(x)) gt = Number(x);
                else if (x.startsWith('=')) gt = '#FORMULA';
              }
              t.luoi[hang][c + j - 1] = gt;
            }));
            return this;
          },
          getValues() {
            const ra = [];
            for (let i = 0; i < soH; i++) {
              const dong = [];
              for (let j = 0; j < soC; j++) {
                const x = (t.luoi[h + i - 1] || [])[c + j - 1];
                dong.push(x === undefined ? '' : x);
              }
              ra.push(dong);
            }
            return ra;
          },
        };
      },
    };
    tabs[ten] = t;
    return t;
  };
  moiTab('Sheet1');

  const ss = {
    getSheetByName: n => tabs[n] || null,
    getSheets: () => Object.values(tabs),
    insertSheet: moiTab,
    getUrl: () => 'x',
  };
  const prop = {};
  const ngu = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in prop ? prop[k] : null), setProperty: (k, v) => { prop[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: s => ({ s, setMimeType() { return this; } }),
    },
    Logger: { log() {} },
    console,
  };
  vm.createContext(ngu);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Code.js'), 'utf8'), ngu);
  const goi = o => JSON.parse(ngu.doPost({ postData: { contents: JSON.stringify(o) } }).s);
  return { goi, tabs, prop };
}

const K = 'a'.repeat(40);
const gd = (id, sua, tien = 1000, them = {}) => ({ b: 'gd', r: { id, ngay: '2026-11-01', loai: 'chi', hu: 'an', tien, ghi: '', sua, xoa: 0, ...them } });

test('khoa: link dau tien mo so, khoa khac bi chan', () => {
  const { goi } = dungMoiTruong();
  assert.equal(goi({ k: 'ngan', thay: [] }).ok, false);
  assert.equal(goi({ thay: [] }).ok, false);
  assert.equal(goi({ k: K, thay: [] }).ok, true);
  const la = goi({ k: 'b'.repeat(40), thay: [gd('x', 1)] });
  assert.equal(la.ok, false);
  assert.equal(la.loi, 'khoa');
  assert.equal(goi({ k: K, tu: 0, thay: [gd('y', 1)] }).ds.length, 1); // x khong duoc ghi
});

test('hai may: may A ghi, may B keo ve dung', () => {
  const { goi } = dungMoiTruong();
  const a = goi({ k: K, tu: 0, thay: [gd('1', 10, 50000, { ghi: 'phở' })] });
  assert.equal(a.ok, true);
  const b = goi({ k: K, tu: 0, thay: [] });
  assert.equal(b.ds.length, 1);
  assert.equal(b.ds[0].r.tien, 50000);
  assert.equal(b.ds[0].r.ghi, 'phở');
  assert.equal(b.tu, a.tu);
  assert.equal(goi({ k: K, tu: b.tu, thay: [] }).ds.length, 0); // khong co gi moi
});

test('Sheets khong lam hong ngay, ghi chu toan so, ghi chu bat dau bang dau =', () => {
  const { goi } = dungMoiTruong();
  goi({ k: K, tu: 0, thay: [gd('1', 1, 1000, { ghi: '=1+1' }), gd('2', 1, 1000, { ghi: '0123' }), { b: 'hm', r: { id: 'an_2026-11', hu: 'an', tu: '2026-11', tien: 0, sua: 1, xoa: 0 } }] });
  const ds = goi({ k: K, tu: 0, thay: [] }).ds;
  const r = id => ds.find(m => m.r.id === id).r;
  assert.equal(r('1').ngay, '2026-11-01');
  assert.equal(r('1').ghi, '=1+1');
  assert.equal(r('2').ghi, '0123');
  assert.equal(r('an_2026-11').tu, '2026-11');
  assert.equal(r('an_2026-11').tien, 0);
});

test('sua moi hon de len, ban cu hon khong de duoc', () => {
  const { goi } = dungMoiTruong();
  goi({ k: K, tu: 0, thay: [gd('1', 10, 1000)] });
  goi({ k: K, tu: 0, thay: [gd('1', 20, 2000)] });
  goi({ k: K, tu: 0, thay: [gd('1', 15, 3000)] });
  const ds = goi({ k: K, tu: 0, thay: [] }).ds;
  assert.equal(ds.length, 1);
  assert.equal(ds[0].r.tien, 2000);
});

test('xoa khoan lan sang may khac', () => {
  const { goi } = dungMoiTruong();
  const dau = goi({ k: K, tu: 0, thay: [gd('1', 1)] });
  goi({ k: K, tu: 0, thay: [gd('1', 2, 1000, { xoa: 1 })] });
  const sau = goi({ k: K, tu: dau.tu, thay: [] });
  assert.equal(sau.ds[0].r.xoa, 1);
});

test('du lieu sai bi tu choi, du lieu dung cung goi van vao', () => {
  const { goi } = dungMoiTruong();
  const xau = [
    gd('a1', 1, -5), gd('a2', 1, 0), gd('a3', 1, 1.5), gd('a4', 1, 1000, { ngay: '2026-02-30' }),
    gd('a5', 1, 1000, { loai: 'x' }), gd('a6', 1, 1000, { ghi: 'x'.repeat(201) }), gd('a b', 1), gd('a8', 0),
    { b: 'lạ', r: { id: 'a9', sua: 1, xoa: 0 } },
  ];
  const kq = goi({ k: K, tu: 0, thay: [...xau, gd('tot', 1)] });
  assert.equal(kq.ok, true);
  assert.equal(kq.boQua.length, xau.length);
  assert.deepEqual(kq.ds.map(m => m.r.id), ['tot']);
});

test('khoan tien vao khong can hu', () => {
  const { goi } = dungMoiTruong();
  const kq = goi({ k: K, tu: 0, thay: [gd('1', 1, 5000000, { loai: 'thu', hu: '' })] });
  assert.equal(kq.boQua.length, 0);
  assert.equal(kq.ds[0].r.hu, '');
});

test('qua 1000 hang van ghi duoc, chu van giu dinh dang', () => {
  const { goi, tabs } = dungMoiTruong();
  let tu = 0;
  for (let lo = 0; lo < 5; lo++) {
    const thay = [];
    for (let i = 0; i < 250; i++) thay.push(gd(`g${lo}-${i}`, 1));
    const kq = goi({ k: K, tu, thay });
    assert.equal(kq.ok, true, kq.loi);
    tu = kq.tu;
  }
  assert.equal(tabs.GIAO_DICH.luoi.length, 1251);
  const ds = goi({ k: K, tu: 0, thay: [] }).ds;
  assert.equal(ds.length, 1250);
  assert.ok(ds.every(m => m.r.ngay === '2026-11-01'));
});

test('tu dung 3 trang, dung lai trang mac dinh, goi qua lon bi tu choi', () => {
  const { goi, tabs } = dungMoiTruong();
  goi({ k: K, tu: 0, thay: [gd('1', 1)] });
  assert.deepEqual(Object.keys(tabs).sort(), ['GIAO_DICH', 'HAN_MUC', 'HU']);
  const nhieu = Array.from({ length: 501 }, (_, i) => gd('n' + i, 1));
  assert.equal(goi({ k: K, tu: 0, thay: nhieu }).ok, false);
});
