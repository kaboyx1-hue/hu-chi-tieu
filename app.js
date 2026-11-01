'use strict';
const KHOA_KHO = 'hct_v1';
const HU_GOC = [
  ['an', '🍚', 'Ăn uống'], ['nha', '🏠', 'Nhà & điện nước'], ['dilai', '🛵', 'Đi lại'],
  ['giadinh', '👨‍👩‍👧', 'Gia đình'], ['suckhoe', '💊', 'Sức khoẻ'], ['muasam', '🛍️', 'Mua sắm'],
  ['giaitri', '🎬', 'Giải trí'], ['tietkiem', '🐖', 'Tiết kiệm'], ['khac', '📦', 'Khác'],
].map(([id, icon, ten], tt) => ({ id, icon, ten, tt, sua: 1, xoa: 0 }));

const MAU = ['#ff7a1a', '#2f80ed', '#12a594', '#e0487e', '#e03131', '#8b5cf6', '#e69500', '#16a34a', '#64748b'];
function mauHu(id) {
  const i = HU_GOC.findIndex(h => h.id === id);
  if (i >= 0) return MAU[i];
  let n = 0;
  for (const c of String(id)) n = (n * 31 + c.charCodeAt(0)) % 997;
  return MAU[n % MAU.length];
}
const bienMau = id => `--m:${mauHu(id)};--n:${mauHu(id)}22`; // 22 = nen nhat cua cung mau

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const taoId = () => Date.now().toString(36) + '-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

// ---- Luu tren may ----
let S = docKho();
let tab = 'tq', thang = T.thangCua(T.homNay()), locHu = '';
let F = null; // khoan dang mo trong hop them/sua
let trangThai = { dang: false, loi: '', luc: 0 };
let huong = 0; // -1/1: truot sang trai/phai khi doi thang
let soCu = 0;  // so du dang hien, de chay so tu do toi so moi
let anSo = false;
try { anSo = localStorage.getItem('hct_an') === '1'; } catch (e) { /* khong doc duoc thi hien so */ }

function docKho() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(KHOA_KHO)); } catch (e) { /* hong thi tao moi, May chu van con ban day du */ }
  o = Object.assign({ gd: {}, hu: {}, hm: {}, ban: {}, tu: 0, lk: null }, o);
  for (const h of HU_GOC) if (!o.hu[h.id]) o.hu[h.id] = h;
  return o;
}
function luuKho() {
  try { localStorage.setItem(KHOA_KHO, JSON.stringify(S)); }
  catch (e) { baoLoi('Máy hết chỗ lưu, khoản vừa nhập có thể mất nếu tắt app'); }
}
function ghi(b, r) {
  r.sua = T.moc(S[b][r.id]);
  S[b][r.id] = r;
  S.ban[b + ':' + r.id] = 1;
  luuKho();
  henDongBo(800);
}
const dsGd = () => Object.values(S.gd);
const dsHu = () => Object.values(S.hu).sort((a, b) => a.tt - b.tt || a.sua - b.sua);
const dsHm = () => Object.values(S.hm);

// ---- Dong bo ----
function docLink(s) {
  const m = /([\w-]{20,})\.([\w-]{32,128})\s*$/.exec(String(s).split('#').pop());
  return m ? { id: m[1], k: m[2] } : null;
}
function nhanLinkTuDiaChi() {
  const lk = docLink(location.hash);
  if (lk && (!S.lk || S.lk.k !== lk.k || S.lk.id !== lk.id)) {
    if (S.lk) S.tu = 0; // doi so khac thi keo lai tu dau
    S.lk = lk;
    luuKho();
  }
}

let henGio = 0;
function henDongBo(ms) {
  clearTimeout(henGio);
  henGio = setTimeout(dongBo, ms);
}

async function dongBo() {
  if (!S.lk) { veDongBo(); return; }
  if (trangThai.dang) return;
  trangThai.dang = true;
  veDongBo();
  let conNua = false;
  try {
    const khoa = Object.keys(S.ban).slice(0, 200);
    const gui = khoa.map(x => {
      const i = x.indexOf(':');
      const b = x.slice(0, i);
      return { b, r: S[b][x.slice(i + 1)] };
    }).filter(m => m.r);

    const kiemSoat = new AbortController();
    const dongHo = setTimeout(() => kiemSoat.abort(), 45000);
    let kq;
    try {
      const tl = await fetch(`https://script.google.com/macros/s/${S.lk.id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // kieu nay trinh duyet khong hoi truoc, Google chiu duoc
        body: JSON.stringify({ k: S.lk.k, thay: gui, tu: S.tu }),
        signal: kiemSoat.signal,
      });
      kq = await tl.json();
    } finally { clearTimeout(dongHo); }

    if (!kq.ok) throw new Error(kq.loi === 'khoa' ? 'Link riêng không đúng, nhờ mở lại đúng link' : kq.loi);

    const biTuChoi = new Set(kq.boQua || []);
    let daNhan = 0;
    for (const m of gui) {
      // Sua tiep trong luc dang gui thi van giu cho, lan sau gui ban moi hon.
      if (S[m.b][m.r.id].sua === m.r.sua && !biTuChoi.has(m.r.id)) { delete S.ban[m.b + ':' + m.r.id]; daNhan++; }
    }
    for (const m of kq.ds) if (S[m.b]) T.gop(S[m.b], m.r);
    S.tu = kq.tu;
    luuKho();
    trangThai.loi = biTuChoi.size ? `${biTuChoi.size} khoản không lưu được lên sổ chung` : '';
    trangThai.luc = Date.now();
    conNua = daNhan > 0 && Object.keys(S.ban).length > 0;
    if (kq.ds.length) veAnToan();
  } catch (e) {
    // Loi mang cua trinh duyet la tieng Anh, chi hien nguyen van loi do may chu bao.
    const loiMang = e.name === 'AbortError' || e.name === 'TypeError' || e.name === 'SyntaxError';
    trangThai.loi = navigator.onLine === false ? '' : loiMang ? 'Chưa gửi được, sẽ tự thử lại' : e.message;
  }
  trangThai.dang = false;
  veDongBo();
  if (conNua) henDongBo(100);
}

function veDongBo() {
  const el = $('dongbo');
  const cho = Object.keys(S.ban).length;
  el.className = trangThai.loi ? 'loi' : '';
  if (!S.lk) el.textContent = 'Chỉ lưu trên máy này. Hãy mở bằng link riêng để dùng sổ chung';
  else if (trangThai.loi) el.textContent = `${trangThai.loi}${cho ? ` · ${cho} mục chờ gửi` : ''}`;
  else if (trangThai.dang) el.textContent = 'Đang đồng bộ…';
  else if (cho) el.textContent = `${cho} mục chờ gửi, có mạng sẽ tự gửi`;
  else if (trangThai.luc) el.textContent = 'Đã đồng bộ lúc ' + new Date(trangThai.luc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  else el.textContent = '';
}

// ---- Ve man hinh ----
function ve(hieuUng) {
  const [y, m] = thang.split('-');
  $('tieude').textContent = tab === 'nam' ? `Năm ${y}` : `Tháng ${Number(m)}/${y}`;
  document.body.dataset.tab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  const tr = $('trang');
  tr.className = hieuUng ? 'hieuung' : '';
  tr.style.setProperty('--dx', huong * 28 + 'px');
  tr.style.setProperty('--dy', huong ? '0' : '12px');
  huong = 0;
  tr.innerHTML = { tq: veTongQuan, so: veSo, hu: veHu, nam: veNam }[tab]();
  veDongBo();
  chaySo();
}

// So du chay dan tu so cu toi so moi. Chi chay khi so that su doi.
let henSo = 0;
function chaySo() {
  const el = $('soDu');
  if (!el || anSo) return;
  const toi = Number(el.dataset.so);
  const tu = soCu;
  soCu = toi;
  cancelAnimationFrame(henSo);
  if (tu === toi || matchMedia('(prefers-reduced-motion:reduce)').matches) { el.textContent = T.hienTien(toi); return; }
  const dau = performance.now();
  const buoc = t => {
    const p = Math.min(1, (t - dau) / 650);
    const gt = tu + (toi - tu) * (1 - (1 - p) ** 3);
    el.textContent = T.hienTien(p < 1 ? Math.round(gt) : toi);
    if (p < 1) henSo = requestAnimationFrame(buoc);
  };
  henSo = requestAnimationFrame(buoc);
}

// Dong bo chay ngam: dang go trong o nao thi khong ve lai, tranh mat chu dang go.
function veAnToan() {
  const dangGo = document.activeElement && document.activeElement.closest('#trang input');
  if (dangGo) veDongBo();
  else ve();
}

function veTheHu(h) {
  let dong2 = '';
  let lop = '';
  if (h.han) {
    lop = h.tile > 1 ? 'qua' : h.tile >= 0.8 ? 'canh' : '';
    dong2 = `<div class="vach"><i class="${lop}" style="width:${Math.min(100, h.tile * 100)}%"></i></div>
      <div class="huphu ${h.con < 0 ? 'qua' : ''}">${h.con < 0 ? 'Vượt ' + T.hienTien(-h.con) : 'Còn ' + T.hienTien(h.con)}</div>`;
  }
  return `<button class="hu" style="${bienMau(h.id)}" data-xemhu="${esc(h.id)}">
    <span class="oh">${esc(h.icon)}</span>
    <span class="hugiua" style="display:block"><div class="huhang"><span class="huten">${esc(h.ten)}</span>
    <span class="huso">${T.hienTien(h.chi)}${h.han ? ' / ' + T.hienSo(h.han) : ''}</span></div>${dong2}</span></button>`;
}

const ICON = {
  chi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  thu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7 7 17M15 17H7V9"/></svg>',
  hu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8v3l2 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9l2-3zM6.5 13h11"/></svg>',
  so: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h13v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 8h6M9 12h6"/></svg>',
  mo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  dong: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.2A10 10 0 0 1 22 12a17 17 0 0 1-3.3 4M6.3 6.8A17 17 0 0 0 2 12s4 7 10 7a10 10 0 0 0 4.5-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
};
const CHE = '••••••';

function dongHtml(g) {
  const thu = g.loai === 'thu';
  const h = S.hu[g.hu];
  const ten = thu ? 'Tiền vào' : h ? h.ten : 'Chưa rõ hũ';
  const mau = thu ? '--n:#00885a22' : bienMau(g.hu);
  return `<button class="dong" data-sua="${esc(g.id)}">
    <span class="oh" style="${mau}">${thu ? '💰' : esc(h ? h.icon : '❔')}</span>
    <span class="giua"><div class="ten">${esc(g.ghi || ten)}</div>${g.ghi ? `<div class="phu">${esc(ten)}</div>` : ''}</span>
    <span class="tien ${thu ? 'vao' : ''}">${thu ? '+' : '−'}${T.hienSo(g.tien)}</span></button>`;
}

function loiChao() {
  const gio = new Date().getHours();
  return gio < 11 ? 'Chào buổi sáng' : gio < 14 ? 'Chào buổi trưa' : gio < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

function veTongQuan() {
  const b = T.baoCao(dsGd(), dsHu(), dsHm(), thang, T.homNay());
  const max = Math.max(...b.theoNgay, 1);
  const ngayNay = b.laHienTai ? Number(T.homNay().slice(8, 10)) : 0;
  const cot = b.theoNgay.map((v, i) =>
    `<i class="${i + 1 === ngayNay ? 'nay' : ''}" style="height:${v ? Math.max(4, v / max * 100) : 0}%" title="Ngày ${i + 1}: ${T.hienTien(v)}"></i>`).join('');

  let nhip = '';
  if (b.laHienTai && b.chi) {
    nhip = `<section class="the"><h2>Nhịp chi tiêu</h2><div class="nhip">
      ${b.moiNgay === null ? '' : `<div><span>Còn tiêu được/ngày</span><b>${T.hienTien(b.moiNgay)}</b></div>`}
      <div style="--n:#2f80ed18"><span>Trung bình/ngày</span><b>${T.hienTien(Math.round(b.tbNgay))}</b></div>
      <div style="--n:#ff7a1a18"><span>Cứ đà này cả tháng</span><b class="${b.tongHan && b.duBao > b.tongHan ? 'am' : ''}">${T.hienTien(b.duBao)}</b></div>
      </div></section>`;
  }

  const coHu = b.hus.filter(h => h.chi || h.han).sort((x, y) => y.chi - x.chi);
  let goc = 0;
  const lat = coHu.filter(h => h.chi).map(h => {
    const cuoi = goc + h.chi / b.chi * 100;
    const s = `${mauHu(h.id)} ${goc}% ${cuoi}%`;
    goc = cuoi;
    return s;
  });
  const vong = b.chi ? `<div class="vong"><div class="vongtron" style="background:conic-gradient(${lat.join(',')})">
    <div>Đã chi<b>${T.hienTien(b.chi)}</b></div></div></div>` : '';

  const ganDay = dsGd().filter(g => !g.xoa && T.thangCua(g.ngay) === thang)
    .sort((x, y) => y.ngay.localeCompare(x.ngay) || y.sua - x.sua).slice(0, 4);

  return `<section class="hero">
      <div class="chao">${b.laHienTai ? loiChao() + ', tiền đang có' : 'Tiền cuối tháng'}</div>
      <div class="dongso">
        <div class="solon" id="soDu" data-so="${b.duCuoi}">${anSo ? CHE : T.hienTien(soCu)}</div>
        <button class="mat" data-lam="anHienSo" aria-label="${anSo ? 'Hiện số tiền' : 'Ẩn số tiền'}">${anSo ? ICON.dong : ICON.mo}</button>
      </div>
      <div class="phu2">Tháng trước sang: ${anSo ? CHE : T.hienTien(b.duDau)}</div>
      <div class="cap">
        <div>Tiền vào<b>${anSo ? CHE : T.hienTien(b.thu)}</b></div>
        <div>Đã chi<b>${anSo ? CHE : T.hienTien(b.chi)}</b></div>
      </div>
    </section>
    <section class="nhanhbon">
      <button data-lam="themMoi" style="--n:#ff7a1a22;--m:#e8590c"><span>${ICON.chi}</span>Chi tiền</button>
      <button data-lam="themThu" style="--n:#7c3aed1f;--m:#7c3aed"><span>${ICON.thu}</span>Tiền vào</button>
      <button data-tab="hu" style="--n:#00885a1f;--m:#00885a"><span>${ICON.hu}</span>Các hũ</button>
      <button data-tab="so" style="--n:#2f80ed1f;--m:#2f80ed"><span>${ICON.so}</span>Sổ</button>
    </section>
    ${nhip}
    <section class="the"><h2>Các hũ${b.tongHan ? `<small>Hạn mức ${T.hienSo(b.tongHan)}</small>` : ''}</h2>${vong}
      ${coHu.length ? coHu.map(veTheHu).join('') : '<div class="trong" style="padding:14px"><span>🫙</span>Chưa có khoản chi nào.<br>Vào “Các hũ” để đặt hạn mức.</div>'}
    </section>
    <section class="the"><h2>Chi theo ngày</h2><div class="cot">${cot}</div>
      <div class="trucngay"><span>1</span><span>${Math.ceil(b.theoNgay.length / 2)}</span><span>${b.theoNgay.length}</span></div></section>
    ${ganDay.length ? `<section class="the"><h2>Gần đây<button data-tab="so">Xem tất cả</button></h2><div class="nhom">${ganDay.map(dongHtml).join('')}</div></section>` : ''}`;
}

function veSo() {
  const hus = S.hu;
  const trongThang = dsGd().filter(g => !g.xoa && T.thangCua(g.ngay) === thang && (!locHu || g.hu === locHu))
    .sort((a, b) => b.ngay.localeCompare(a.ngay) || b.sua - a.sua);
  const coTrongThang = [...new Set(dsGd().filter(g => !g.xoa && g.loai === 'chi' && T.thangCua(g.ngay) === thang).map(g => g.hu))];
  const locs = `<div class="locs"><button class="loc ${locHu ? '' : 'on'}" data-loc="">Tất cả</button>` +
    coTrongThang.filter(id => hus[id]).map(id => `<button class="loc ${locHu === id ? 'on' : ''}" data-loc="${esc(id)}">${esc(hus[id].icon)} ${esc(hus[id].ten)}</button>`).join('') + '</div>';
  if (!trongThang.length) return locs + '<div class="trong"><span>📒</span>Chưa có khoản nào trong tháng này.<br>Bấm dấu + để thêm.</div>';

  let ra = locs, ngay = '', cong = 0, dong = [];
  const dongNgay = () => {
    if (!ngay) return;
    const [, m, d] = ngay.split('-');
    ra += `<div class="ngay"><span>${d}/${m}</span><span>${cong ? 'Chi ' + T.hienTien(cong) : ''}</span></div><div class="nhom">${dong.join('')}</div>`;
  };
  for (const g of trongThang) {
    if (g.ngay !== ngay) { dongNgay(); ngay = g.ngay; cong = 0; dong = []; }
    const thu = g.loai === 'thu';
    if (!thu) cong += g.tien;
    dong.push(dongHtml(g));
  }
  dongNgay();
  return ra;
}

function veHu() {
  const hienTai = T.thangCua(T.homNay());
  const dsDong = dsHu().filter(h => !h.xoa).map(h => `<div class="hang" data-hu="${esc(h.id)}" style="${bienMau(h.id)}">
      <input class="i1" data-truong="icon" maxlength="8" value="${esc(h.icon)}" aria-label="Biểu tượng">
      <input class="i2" data-truong="ten" maxlength="40" value="${esc(h.ten)}" aria-label="Tên hũ">
      <input class="i3" data-truong="han" inputmode="numeric" placeholder="Hạn mức" value="${T.hanMuc(dsHm(), h.id, hienTai) ? T.hienSo(T.hanMuc(dsHm(), h.id, hienTai)) : ''}" aria-label="Hạn mức một tháng">
      <button class="xoahu" data-xoahu="${esc(h.id)}" aria-label="Xoá hũ">✕</button></div>`).join('');
  const tong = dsHu().filter(h => !h.xoa).reduce((s, h) => s + T.hanMuc(dsHm(), h.id, hienTai), 0);
  return `<section class="the"><h2 id="tongHan">Hạn mức mỗi tháng · tổng ${T.hienTien(tong)}</h2>${dsDong}
      <p id="ghichu">Đổi hạn mức sẽ áp dụng từ tháng này trở đi, số của các tháng đã qua giữ nguyên.</p>
      <button class="btn rong" style="margin-top:12px" data-lam="themHu">+ Thêm hũ</button></section>
    <section class="the"><h2>Sổ chung</h2>
      <p class="nhan" style="margin:0 0 10px">${S.lk ? 'Máy này đã nối sổ chung.' : 'Máy này chưa nối sổ chung. Dán link riêng vào đây nếu app chưa tự nhận.'}</p>
      ${S.lk ? '<button class="btn rong" data-lam="dongBoNgay">Đồng bộ ngay</button>' : '<input id="fLink" placeholder="Dán link riêng" autocomplete="off"><button class="btn rong" style="margin-top:8px" data-lam="noiLink">Nối sổ</button>'}
    </section>`;
}

function veNam() {
  const nam = thang.slice(0, 4);
  const hang = [];
  let tongThu = 0, tongChi = 0;
  for (let m = 1; m <= 12; m++) {
    const th = `${nam}-${String(m).padStart(2, '0')}`;
    const b = T.baoCao(dsGd(), dsHu(), dsHm(), th, T.homNay());
    tongThu += b.thu; tongChi += b.chi;
    if (b.thu || b.chi) {
      hang.push(`<button class="dong" data-thang="${th}"><span class="giua"><div class="ten">Tháng ${m}</div>
        <div class="phu">Vào ${T.hienSo(b.thu)} · Chi ${T.hienSo(b.chi)}</div></span>
        <span class="tien ${b.conThang < 0 ? 'am' : 'vao'}">${b.conThang < 0 ? '−' : '+'}${T.hienSo(Math.abs(b.conThang))}</span></button>`);
    }
  }
  return `<section class="the"><div class="nhan">Dư cả năm</div>
    <div class="solon ${tongThu - tongChi < 0 ? 'am' : ''}">${T.hienTien(tongThu - tongChi)}</div>
    <div class="ba" style="grid-template-columns:1fr 1fr"><div><span class="nhan">Tiền vào</span><b class="vao">${T.hienTien(tongThu)}</b></div>
    <div><span class="nhan">Đã chi</span><b class="ra">${T.hienTien(tongChi)}</b></div></div></section>
    ${hang.length ? `<div class="nhom">${hang.join('')}</div>` : '<div class="trong"><span>📅</span>Năm này chưa có khoản nào.</div>'}`;
}

// ---- Hop them / sua khoan ----
function moHop(g, loai = 'chi') {
  const ngayMacDinh = thang === T.thangCua(T.homNay()) ? T.homNay() : thang + '-01';
  const cuoi = dsGd().filter(x => !x.xoa && x.loai === 'chi').sort((a, b) => b.sua - a.sua)[0];
  F = g ? { ...g } : { id: taoId(), loai, hu: (cuoi && S.hu[cuoi.hu] && !S.hu[cuoi.hu].xoa) ? cuoi.hu : dsHu().find(h => !h.xoa)?.id || '', tien: 0, ngay: ngayMacDinh, ghi: '', xoa: 0, moi: true };
  $('fTien').value = F.tien ? T.hienSo(F.tien) : '';
  $('fNgay').value = F.ngay;
  $('fGhi').value = F.ghi;
  $('fXoa').hidden = !!F.moi;
  veHop();
  $('hop').classList.remove('dangdong');
  $('hop').showModal();
  if (F.moi) $('fTien').focus();
}
function dongHopMuot() {
  const h = $('hop');
  if (!h.open || h.classList.contains('dangdong')) return;
  h.classList.add('dangdong');
  setTimeout(() => { h.close(); h.classList.remove('dangdong'); }, matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 200);
}
function veHop() {
  document.querySelectorAll('.chon2 button').forEach(b => b.classList.toggle('on', b.dataset.loai === F.loai));
  const laChi = F.loai === 'chi';
  $('fForm').className = F.loai;
  $('fHu').hidden = !laChi;
  // Khoan cu thuoc hu da xoa van hien hu do, tranh luu lai bi doi hu am tham.
  $('fHu').innerHTML = laChi ? dsHu().filter(h => !h.xoa || h.id === F.hu).map(h =>
    `<button type="button" class="${h.id === F.hu ? 'on' : ''}" style="${bienMau(h.id)}" data-chonhu="${esc(h.id)}"><span>${esc(h.icon)}</span>${esc(h.ten)}</button>`).join('') : '';
  $('fNhanh').innerHTML = (laChi ? [20, 30, 50, 100, 200, 500] : [1000, 5000, 10000, 20000]).map(k =>
    `<button type="button" data-nhanh="${k * 1000}">${T.hienSo(k * 1000)}</button>`).join('') + '<button type="button" data-nhan3="1">×1.000</button>';
}
function luuHop() {
  const tien = T.docTien($('fTien').value);
  const ngay = $('fNgay').value;
  if (!tien) { baoLoi('Bạn chưa nhập số tiền'); $('fTien').focus(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) { baoLoi('Bạn chưa chọn ngày'); return; }
  if (F.loai === 'chi' && !F.hu) { baoLoi('Bạn chưa chọn hũ'); return; }
  const { id, loai, hu } = F;
  ghi('gd', { id, loai, hu: loai === 'chi' ? hu : '', tien, ngay, ghi: $('fGhi').value.trim(), xoa: 0 });
  dongHopMuot();
  thang = T.thangCua(ngay);
  ve(true);
  bao(`Đã lưu ${T.hienTien(tien)}`);
}

// ---- Thong bao ----
let henToast = 0;
function bao(chu, hoanTac, loi) {
  const t = $('toast');
  t.className = loi ? 'loi' : '';
  t.innerHTML = `<i class="dau">${loi ? '!' : '✓'}</i><span>${esc(chu)}</span>` + (hoanTac ? '<button data-lam="hoanTac">Hoàn tác</button>' : '');
  t.hidden = false;
  // Hop nhap la lop tren cung, thong bao phai vao trong hop moi nhin thay
  ($('hop').open && !$('hop').classList.contains('dangdong') ? $('hop') : document.body).appendChild(t);
  HOAN_TAC = hoanTac || null;
  clearTimeout(henToast);
  henToast = setTimeout(() => { t.hidden = true; HOAN_TAC = null; }, hoanTac ? 6000 : 2500);
}
const baoLoi = chu => bao(chu, null, true);
let HOAN_TAC = null;

// ---- Nut bam ----
const LAM = {
  thangLui() { thang = T.congThang(thang, tab === 'nam' ? -12 : -1); locHu = ''; huong = -1; ve(true); },
  thangToi() { thang = T.congThang(thang, tab === 'nam' ? 12 : 1); locHu = ''; huong = 1; ve(true); },
  themMoi() { moHop(null); },
  themThu() { moHop(null, 'thu'); },
  dongHop() { dongHopMuot(); },
  anHienSo() {
    anSo = !anSo;
    try { localStorage.setItem('hct_an', anSo ? '1' : '0'); } catch (e) { /* chi la tuy chon hien thi */ }
    ve();
  },
  dongBoNgay() { trangThai.loi = ''; dongBo(); },
  themHu() {
    const ten = 'Hũ mới';
    ghi('hu', { id: taoId(), ten, icon: '🫙', tt: Date.now(), xoa: 0 });
    ve(true);
  },
  noiLink() {
    const lk = docLink($('fLink').value);
    if (!lk) { baoLoi('Link này chưa đúng'); return; }
    S.lk = lk; S.tu = 0; luuKho(); ve(); dongBo();
  },
  xoaKhoan() {
    const cu = S.gd[F.id];
    dongHopMuot();
    ghi('gd', { ...cu, xoa: 1 });
    ve();
    bao('Đã xoá khoản này', () => { ghi('gd', { ...S.gd[cu.id], xoa: 0 }); ve(); });
  },
  hoanTac() {
    const f = HOAN_TAC;
    $('toast').hidden = true;
    HOAN_TAC = null;
    if (f) f();
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('button');
  if (!el) return;
  const d = el.dataset;
  if (d.lam) LAM[d.lam]();
  else if (d.tab) { tab = d.tab; locHu = ''; ve(true); scrollTo(0, 0); }
  else if (d.xemhu !== undefined) { tab = 'so'; locHu = d.xemhu; ve(true); scrollTo(0, 0); }
  else if (d.loc !== undefined) { locHu = d.loc; ve(true); }
  else if (d.sua) moHop(S.gd[d.sua]);
  else if (d.thang) { thang = d.thang; tab = 'tq'; ve(true); scrollTo(0, 0); }
  else if (d.loai) { F.loai = d.loai; veHop(); }
  else if (d.chonhu) { F.hu = d.chonhu; veHop(); }
  else if (d.nhanh) { $('fTien').value = T.hienSo(d.nhanh); }
  else if (d.nhan3) { const n = T.docTien($('fTien').value); if (n) $('fTien').value = T.hienSo(T.docTien(n * 1000)); $('fTien').focus(); }
  else if (d.xoahu) {
    const h = S.hu[d.xoahu];
    ghi('hu', { ...h, xoa: 1 });
    ve();
    bao(`Đã xoá hũ ${h.ten}`, () => { ghi('hu', { ...S.hu[h.id], xoa: 0 }); ve(); });
  }
});

$('fForm').addEventListener('submit', e => { e.preventDefault(); luuHop(); });
$('fTien').addEventListener('input', e => { const n = T.docTien(e.target.value); e.target.value = n ? T.hienSo(n) : ''; });

// Ban o Cac hu: luu khi roi o, khong ve lai luc dang go de khong mat con tro.
$('trang').addEventListener('input', e => {
  if (e.target.dataset.truong === 'han') { const n = T.docTien(e.target.value); e.target.value = n ? T.hienSo(n) : ''; }
});
$('trang').addEventListener('change', e => {
  const truong = e.target.dataset.truong;
  const dong = e.target.closest('.hang');
  if (!truong || !dong) return;
  const id = dong.dataset.hu;
  const h = S.hu[id];
  if (truong === 'han') {
    const tu = T.thangCua(T.homNay());
    ghi('hm', { id: `${id}_${tu}`, hu: id, tu, tien: T.docTien(e.target.value), xoa: 0 });
    const tieuDe = $('tongHan');
    const tong = dsHu().filter(x => !x.xoa).reduce((s, x) => s + T.hanMuc(dsHm(), x.id, tu), 0);
    if (tieuDe) tieuDe.textContent = `Hạn mức mỗi tháng · tổng ${T.hienTien(tong)}`;
  } else {
    const v = e.target.value.trim();
    if (!v) { e.target.value = h[truong]; return; } // khong cho de trong ten/bieu tuong
    ghi('hu', { ...h, [truong]: v });
  }
});

// ---- Khoi dong ----
window.addEventListener('hashchange', () => { nhanLinkTuDiaChi(); ve(); dongBo(); });
window.addEventListener('online', () => { trangThai.loi = ''; dongBo(); });
window.addEventListener('storage', e => { if (e.key === KHOA_KHO) { S = docKho(); ve(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { veAnToan(); dongBo(); } });
setInterval(() => { if (!document.hidden) dongBo(); }, 60000);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');

nhanLinkTuDiaChi();
ve(true);
dongBo();
