// Cho phep mo app khi mat mang. Co mang thi luon lay ban moi; mang yeu qua 2,5 giay thi dung ban da luu.
const KHO = 'hct-3';
const TEP = ['./', 'index.html', 'app.js', 'tinh.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(KHO).then(c => c.addAll(TEP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ds => Promise.all(ds.filter(k => k !== KHO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    // no-cache: luon hoi lai GitHub, tranh trang moi di voi tep cu con nam trong bo nho tam 10 phut
    const mang = fetch(e.request, { cache: 'no-cache' }).then(async tl => {
      if (tl.ok) (await caches.open(KHO)).put(e.request, tl.clone());
      return tl;
    });
    const cham = new Promise(ok => setTimeout(ok, 2500)).then(() => caches.match(e.request, { ignoreSearch: true }));
    const dau = await Promise.race([mang.catch(() => null), cham]);
    if (dau) return dau;
    return (await mang.catch(() => null)) || (await caches.match(e.request, { ignoreSearch: true })) || caches.match('./');
  })());
});
