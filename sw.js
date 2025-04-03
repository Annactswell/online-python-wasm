// 定义缓存名称和版本
const CACHE_NAME = 'pyodide-cache-v1';

// 需要缓存的URL
const urlsToCache = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js',
  'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.asm.js',
  'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.asm.wasm',
  'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.asm.data',
  'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/packages.json'
];

// 安装Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存打开');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 处理fetch请求，优先使用缓存
self.addEventListener('fetch', event => {
  // 针对Pyodide相关文件的请求进行缓存
  if (event.request.url.includes('pyodide') || 
      event.request.url.includes('numpy') || 
      event.request.url.includes('pandas') || 
      event.request.url.includes('matplotlib')) {
    
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // 如果缓存中有响应，则返回缓存
          if (response) {
            console.log('从缓存中返回:', event.request.url);
            return response;
          }
          
          // 否则从网络获取
          console.log('从网络获取:', event.request.url);
          return fetch(event.request).then(
            response => {
              // 检查响应是否有效
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // 克隆响应，因为响应是流，只能使用一次
              const responseToCache = response.clone();
              
              // 加入缓存
              caches.open(CACHE_NAME)
                .then(cache => {
                  console.log('缓存文件:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            }
          );
        })
    );
  } else {
    // 对于其他请求，使用网络优先策略
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// 监听消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 
