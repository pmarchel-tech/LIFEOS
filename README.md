# Harada Life OS 🎯

> Sistem Manajemen Tugas, Eksekusi Strategis & Perencanaan Mingguan berbasis Metodologi Harada & Lark Base dengan Sinkronisasi Cloud Supabase Realtime.

## ✨ Fitur Utama

- 📋 **Lark Table & Kanban View**: Tampilan multi-view (Table, Priority Kanban, Leader Kanban, Progress, Calendar, Task Due Date).
- 📊 **Weekly Planning Reporting**: Visualisasi operasional mingguan lengkap dengan sistem export multi-sheet Excel berformat khusus.
- 📜 **Audit Activity Log**: Pencatatan riwayat setiap aksi (ADD, EDIT, CHANGE, DELETE) pada task maupun sub-task secara transparan.
- 🔔 **Pusat Notifikasi & Reminder**: Pengingat jatuh tempo hari ini dan overdue, terintegrasi dengan Web Audio chime dan notifikasi desktop.
- ⚡ **Supabase Realtime Cloud Sync**: Sinkronisasi dua arah (*two-way live synchronization*) dengan Supabase Postgres Database.
- 🌓 **Apple Glass UI & Dark Mode**: Desain bersih terinspirasi gaya macOS / iOS Human Interface Guidelines.

## 🚀 Cara Menjalankan Aplikasi

1. Masuk ke direktori aplikasi:
   \\\ash
   cd app
   \\\

2. Salin environment variable:
   \\\ash
   cp .env.example .env
   \\\
   Isi \VITE_SUPABASE_URL\ dan \VITE_SUPABASE_ANON_KEY\ dengan kredensial Supabase Anda.

3. Install dependensi:
   \\\ash
   npm install
   \\\

4. Jalankan development server:
   \\\ash
   npm run dev
   \\\
   Buka \http://localhost:5173\ di browser Anda.

5. Build untuk produksi:
   \\\ash
   npm run build
   \\\

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Icons**: Lucide React
- **Animations & Effects**: Canvas Confetti
- **Exporting**: xlsx, xlsx-js-style
- **Backend & Realtime Database**: Supabase (@supabase/supabase-js)
