// Phan tinh tien va gop du lieu. Khong dung toi giao dien, de test duoc bang node.
(function (goc) {
  const T = {};

  const hai = n => String(n).padStart(2, '0');

  // Ngay theo gio cua may, KHONG dung toISOString (lech sang ngay hom truoc luc 0-7h gio VN).
  T.homNay = (d = new Date()) => `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;
  T.thangCua = ngay => ngay.slice(0, 7);
  T.soNgayThang = thang => {
    const [y, m] = thang.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };
  T.congThang = (thang, n) => {
    const [y, m] = thang.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${hai(d.getMonth() + 1)}`;
  };

  T.docTien = s => {
    const n = Number(String(s == null ? '' : s).replace(/\D/g, ''));
    return Math.min(n, 999999999999);
  };
  T.hienSo = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  T.hienTien = n => (n < 0 ? '−' : '') + T.hienSo(Math.abs(n)) + 'đ';

  // Han muc cua hu trong thang: lay ban ghi moi nhat co hieu luc tu thang do tro ve truoc.
  // Nho vay doi han muc thang nay khong lam sai so cua cac thang da qua.
  T.hanMuc = (dsHm, huId, thang) => {
    let chon = null;
    for (const h of dsHm) {
      if (h.xoa || h.hu !== huId || h.tu > thang) continue;
      if (!chon || h.tu > chon.tu) chon = h;
    }
    return chon ? chon.tien : 0;
  };

  T.baoCao = (dsGd, dsHu, dsHm, thang, homNay) => {
    const soNgay = T.soNgayThang(thang);
    const theoNgay = new Array(soNgay).fill(0);
    const chiHu = {};
    let thu = 0, chi = 0, duDau = 0;

    for (const g of dsGd) {
      if (g.xoa) continue;
      const th = T.thangCua(g.ngay);
      if (th < thang) { duDau += g.loai === 'thu' ? g.tien : -g.tien; continue; }
      if (th > thang) continue;
      if (g.loai === 'thu') { thu += g.tien; continue; }
      chi += g.tien;
      theoNgay[Number(g.ngay.slice(8, 10)) - 1] += g.tien;
      chiHu[g.hu] = (chiHu[g.hu] || 0) + g.tien;
    }

    // Hu da xoa ma thang nay van co khoan chi thi van phai hien, de tong cac hu luon bang tong chi.
    const hus = [];
    const daXet = {};
    for (const h of dsHu) {
      daXet[h.id] = 1;
      if (h.xoa && !chiHu[h.id]) continue;
      const han = h.xoa ? 0 : T.hanMuc(dsHm, h.id, thang);
      const daChi = chiHu[h.id] || 0;
      hus.push({ id: h.id, ten: h.ten, icon: h.icon, xoa: !!h.xoa, han, chi: daChi, con: han - daChi, tile: han ? daChi / han : 0 });
    }
    for (const id of Object.keys(chiHu)) {
      if (!daXet[id]) hus.push({ id, ten: 'Chưa rõ hũ', icon: '❔', xoa: true, han: 0, chi: chiHu[id], con: -chiHu[id], tile: 0 });
    }

    const tongHan = hus.reduce((s, h) => s + h.han, 0);
    const chiCoHan = hus.reduce((s, h) => s + (h.han ? h.chi : 0), 0); // hu chua dat han muc khong tru vao han muc hu khac
    const laHienTai = T.thangCua(homNay) === thang;
    const quaKhu = thang < T.thangCua(homNay);
    const ngayQua = laHienTai ? Number(homNay.slice(8, 10)) : quaKhu ? soNgay : 0;
    const ngayCon = laHienTai ? soNgay - ngayQua + 1 : 0; // tinh ca hom nay
    const tbNgay = ngayQua ? chi / ngayQua : 0;

    return {
      thu, chi, duDau,
      conThang: thu - chi,
      duCuoi: duDau + thu - chi,
      theoNgay, hus, tongHan, laHienTai, ngayCon, tbNgay,
      duBao: laHienTai ? Math.round(tbNgay * soNgay) : chi,
      moiNgay: laHienTai && tongHan ? Math.max(0, Math.floor((tongHan - chiCoHan) / ngayCon)) : null,
    };
  };

  // Gop ban ghi tu may chu vao kho cua may nay. Ban nao sua sau thi thang.
  // Ban dang cho gui ma moi hon thi giu lai, lan dong bo sau no se len may chu.
  T.gop = (kho, b) => {
    const cu = kho[b.id];
    if (!cu || b.sua >= cu.sua) kho[b.id] = b;
  };

  // Luon lon hon lan sua truoc, ke ca khi dong ho may nay chay cham hon may kia.
  T.moc = (cu, bayGio = Date.now()) => Math.max(bayGio, cu ? cu.sua + 1 : 0);

  if (typeof module !== 'undefined') module.exports = T;
  else goc.T = T;
})(this);
