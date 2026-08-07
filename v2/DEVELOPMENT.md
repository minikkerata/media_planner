# Media Planner v2 - Development & Release Architecture Guide

Bu doküman, Media Planner v2 projesinde geliştirme yaparken ve yeni sürüm (Release) yayınlarken takip edilmesi gereken standart adımları ve kuralları içerir. Yapay zeka asistanları ve geliştiriciler bu rehberi takip etmelidir.

---

## 🚀 1. Geliştirme Akışı (Fast Development Loop)

Geliştirme yaparken **asla .exe derlemesi yapılmaz**. Kod değişiklikleri anında (HMR - Hot Module Replacement) görülür.

- **Electron Dev Komutu:**
  ```bash
  npm run electron:dev
  ```
  *Bu komut hem Express backend sunucusunu hem de Vite frontend dev sunucusunu ve Electron penceresini anında sıcak yenileme (hot reload) ile çalıştırır. Kodda yaptığınız değişiklikler 0.1 saniyede ekrana yansır.*

---

## 📦 2. Dağıtım ve Yayınlama Akışı (Release & Auto-Update Workflow)

Uygulamanın başkalarına dağıtılması ve otomatik güncelleme alabilmesi için GitHub Releases mekanizması kullanılır.

### Otomatik Sürüm Yayınlama Adımları:

1. **`v2/package.json` Dosyasında Versiyonu Artırın:**
   Örnek: `"version": "3.1.0"`

2. **Değişiklikleri Git Depolayın ve Commit Edin:**
   ```bash
   git add -A
   git commit -m "feat: yeni özellik eklendi v3.1.0"
   git push origin main
   ```

3. **Electron Paketleme ve GitHub Release Oluşturma:**
   ```bash
   npm run electron:build
   ```
   *Bu komut `electron-builder` çalıştırarak Windows `.exe` çıktısını (`v2/release/Media Planner Setup 3.1.0.exe`) üretir ve GitHub `minikkerata/media_planner` deposuna otomatik bir Release taslağı/yayınlaması yükler.*

---

## 🔒 3. Veri Kalıcılığı Kuralları (Data Persistence Rules)

- **Veritabanı Konumu:** `%APPDATA%\MediaPlanner\media_planner.db`
- **Ayarlar Konumu:** `%APPDATA%\MediaPlanner\settings.json`
- **Görsel Önizlemeler:** Her video klasörünün içindeki `.medi_thumbs/` klasörü.

> [!IMPORTANT]
> Güncellemelerde ve `.exe` kurulumlarında kullanıcı veritabanı (`%APPDATA%`) **asla silinmez veya ezilmez**. Veritabanı tablolarına yeni sütun ekleneceği zaman `server/core/database.js` içerisindeki `ALTER TABLE` göçleri çalıştırılır.

---

## 🛠️ 4. Komut Referans Tablosu

| Komut | Açıklama |
| :--- | :--- |
| `npm run dev` | Web tarayıcı modunda geliştirme yapma |
| `npm run electron:dev` | Electron penceresinde anında sıcak yenileme ile geliştirme yapma |
| `npm run build` | Frontend React üretici derlemesi yapma |
| `npm run electron:build` | Kurulumlu Windows `.exe` Setup paketini üretme |
