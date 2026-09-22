import exportedTasksFromCSV from './importedFromCSV.json';
export const EXPORTED_WEEKLY_RECORDS = exportedTasksFromCSV;

export const MANDATE = {
  title: "GOD GENERATIONS RESTORER 2030",
  quote: "Saya menerima mandat sebagai PEMULIH GENERASI untuk kemuliaan Tuhan.",
  targets: [
    { label: "Siswa Terdampak", value: "100.000" },
    { label: "Sekolah Kemitraan", value: "1.000" },
    { label: "Revenue Bulanan", value: "Rp 400 Jt/Bln" },
    { label: "Saldo Rekening", value: "Rp 9 Miliar" },
    { label: "Klinik Jiwa", value: "5 Klinik" },
    { label: "LPK Vokasi IT", value: "2 Sekolah" }
  ]
};

export const ELEMENTS = {
  E1: {
    code: "E1",
    name: "Spiritual Foundation",
    sub: "Akar Mandat & Rohani",
    color: "purple",
    bgClass: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    barColor: "bg-purple-500",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    quote: "Tanpa akar yang dalam, pohon yang tinggi akan roboh saat badai."
  },
  E2: {
    code: "E2",
    name: "Product Excellence",
    sub: "ISCA, EMS, & LPK OS",
    color: "sky",
    bgClass: "bg-sky-500/10 border-sky-500/30 text-sky-400",
    barColor: "bg-sky-500",
    badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    quote: "Produk luar biasa memulihkan martabat dan masa depan generasi."
  },
  E3: {
    code: "E3",
    name: "Marketing & Content",
    sub: "4 Pilar & Kampanye Rencanamu",
    color: "amber",
    bgClass: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    barColor: "bg-amber-500",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    quote: "Marketing adalah pelayanan distribusi kabar baik."
  },
  E4: {
    code: "E4",
    name: "Sales & Partnerships",
    sub: "Trojan Horse & Edubazar",
    color: "emerald",
    bgClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    barColor: "bg-emerald-500",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    quote: "Sales adalah menghadirkan rasa aman dan kejelasan bagi yayasan."
  },
  E5: {
    code: "E5",
    name: "Revenue Engine",
    sub: "4 Kantong & Monetisasi Multi-Layer",
    color: "yellow",
    bgClass: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    barColor: "bg-yellow-500",
    badgeBg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    quote: "Uang adalah bahan bakar mandat menuju Rp 9 Miliar saldo tabungan."
  },
  E6: {
    code: "E6",
    name: "Team & Operations",
    sub: "Skuad 6 Staf, Standup & 5 Kaizen",
    color: "teal",
    bgClass: "bg-teal-500/10 border-teal-500/30 text-teal-400",
    barColor: "bg-teal-500",
    badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    quote: "Jenderal memimpin pasukan dengan visi jelas dan apresiasi tulus."
  },
  E7: {
    code: "E7",
    name: "Brand & Trust",
    sub: "Otoritas Ilmiah, Testimoni & Jeda 3s",
    color: "rose",
    bgClass: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    barColor: "bg-rose-500",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    quote: "Brand adalah rasa aman yang dirasakan orang tua saat anak dipercayakan kepadamu."
  },
  E8: {
    code: "E8",
    name: "Legacy Infrastructure",
    sub: "5 Klinik & 2 LPK Vokasi IT",
    color: "slate",
    bgClass: "bg-slate-400/10 border-slate-400/30 text-slate-300",
    barColor: "bg-slate-400",
    badgeBg: "bg-slate-400/20 text-slate-300 border-slate-400/30",
    quote: "Monumen kasih nyata yang memutus rantai kemiskinan generasi."
  }
};


export const LEADERS = [
  { name: "Pierre Marchel", avatar: "PM", role: "Founder & CEO", color: "bg-indigo-600 text-white" },
  { name: "Daris", avatar: "D", role: "Tech & Lead Dev", color: "bg-emerald-600 text-white" },
  { name: "Hermes", avatar: "H", role: "PM & Account Manager", color: "bg-amber-600 text-white" },
  { name: "Yusup", avatar: "Y", role: "Implementator & CS", color: "bg-sky-600 text-white" },
  { name: "Ocha", avatar: "O", role: "Implementator & CS", color: "bg-pink-600 text-white" },
  { name: "MELDA", avatar: "M", role: "Team Member", color: "bg-teal-600 text-white" },
  { name: "Hani", avatar: "HA", role: "Guru & Canvass Sales", color: "bg-purple-600 text-white" },
  { name: "Pinkan", avatar: "P", role: "Finance & Accounting", color: "bg-rose-600 text-white" },
  { name: "Ci Rina", avatar: "CR", role: "Senior Finance Advisor", color: "bg-teal-600 text-white" },
  { name: "One Brand", avatar: "OB", role: "Creative Agency", color: "bg-orange-600 text-white" },
  { name: "dr. Teguh", avatar: "DT", role: "Clinical Psychologist", color: "bg-blue-600 text-white" },
  { name: "FACHRUL", avatar: "F", role: "Member", color: "bg-indigo-600 text-white" },
  { name: "PETER", avatar: "P", role: "Member", color: "bg-emerald-600 text-white" }
];

export const BUSINESS_LINES = [
  "EMS",
  "BETTER FUTURE",
  "LPK OS",
  "MARKETING",
  "ACSENT",
  "PERSONAL",
  "SPIRITUAL & LIFE",
  "BRAND & TRUST",
  "SALES & PARTNERSHIP",
  "TEAM & OPERATIONS",
  "REVENUE & FINANCE"
];

export const PROJECTS = [
  { name: "ALPHALUX", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800" },
  { name: "BALA KESELAMATAN", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800" },
  { name: "BETTER FUTURE", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800" },
  { name: "DMA", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800" },
  { name: "HANA MULIA", color: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800" },
  { name: "KETAPANG", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" },
  { name: "LIFE OS", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" },
  { name: "LPK OS", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" },
  { name: "MTA", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" },
  { name: "ONE BRAND", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800" },
  { name: "OPTY", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800" },
  { name: "PETRA", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800" },
  { name: "REC", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800" },
  { name: "SKK MEDAN", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800" },
  { name: "SKK PEMATANG SIANTAR", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800" },
  { name: "UID", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800" },
  { name: "YKKI", color: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800" }
];

export const PRIORITIES = {
  P0: { label: "P0", color: "bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/80 font-bold" },
  P1: { label: "P1", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/80 font-bold" },
  P2: { label: "P2", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/80 font-bold" },
  P3: { label: "P3", color: "bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 font-bold" }
};

export const STATUSES = {
  "Not yet started": { label: "NOT STARTED", color: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 whitespace-nowrap" },
  "Ongoing": { label: "ON GOING", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800/60 whitespace-nowrap" },
  "In Review": { label: "IN REVIEW", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60 whitespace-nowrap" },
  "Follow Up": { label: "FOLLOW UP", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/60 whitespace-nowrap" },
  "Done": { label: "DONE", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 whitespace-nowrap" },
  "Pending": { label: "PENDING", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800/60 whitespace-nowrap" },
  "Cancel": { label: "CANCEL", color: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 whitespace-nowrap" },
  "Archived": { label: "ARCHIVED", color: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 whitespace-nowrap" }
};

export const getStatusConfig = (statusKey) => {
  if (!statusKey) return STATUSES["Not yet started"];
  if (STATUSES[statusKey]) return STATUSES[statusKey];
  const upper = String(statusKey).toUpperCase().trim();
  if (upper === 'NOT STARTED' || upper === 'NOT YET STARTED') return STATUSES["Not yet started"];
  if (upper === 'ON GOING' || upper === 'ONGOING') return STATUSES["Ongoing"];
  if (upper === 'IN REVIEW') return STATUSES["In Review"];
  if (upper === 'FOLLOW UP') return STATUSES["Follow Up"];
  if (upper === 'DONE') return STATUSES["Done"];
  if (upper === 'PENDING') return STATUSES["Pending"];
  if (upper === 'CANCEL') return STATUSES["Cancel"];
  if (upper === 'ARCHIVED' || upper === 'ARCHIVE') return STATUSES["Archived"];
  return STATUSES["Ongoing"];
};

export const canonicalStatus = (statusKey) => {
  if (!statusKey) return "Not yet started";
  if (STATUSES[statusKey]) return statusKey;
  const upper = String(statusKey).toUpperCase().trim();
  if (upper === 'NOT STARTED' || upper === 'NOT YET STARTED') return "Not yet started";
  if (upper === 'ON GOING' || upper === 'ONGOING') return "Ongoing";
  if (upper === 'IN REVIEW') return "In Review";
  if (upper === 'FOLLOW UP') return "Follow Up";
  if (upper === 'DONE') return "Done";
  if (upper === 'PENDING') return "Pending";
  if (upper === 'CANCEL') return "Cancel";
  if (upper === 'ARCHIVED' || upper === 'ARCHIVE') return "Archived";
  return "Ongoing";
};

export const DEFAULT_DUE_TIME = '09:00';
export const DEFAULT_REMINDER = 'NONE';

export const REMINDER_OPTIONS = [
  { id: 'NONE', label: 'NO REMINDER (DEFAULT)', shortLabel: 'No Reminder', daysBefore: null },
  { id: 'D_DAY', label: 'D DAY (HARI H)', shortLabel: 'Hari H', daysBefore: 0 },
  { id: '1_DAY_BEFORE', label: '-1 DAY (1 DAY BEFORE)', shortLabel: '-1 Day', daysBefore: 1 },
  { id: '2_DAYS_BEFORE', label: '-2 DAY (2 DAY BEFORE)', shortLabel: '-2 Days', daysBefore: 2 },
  { id: '3_DAYS_BEFORE', label: '-3 DAY (3 DAY BEFORE)', shortLabel: '-3 Days', daysBefore: 3 },
  { id: '7_DAYS_BEFORE', label: '-7 DAY (7 DAY BEFORE)', shortLabel: '-7 Days', daysBefore: 7 }
];

export const getReminderLabel = (reminderKey) => {
  const found = REMINDER_OPTIONS.find(r => r.id === reminderKey);
  return found ? found.label : 'NO REMINDER (DEFAULT)';
};

export const INITIAL_RECORDS = [
  // 1. EMS
  {
    id: "rec-ems-1",
    task: "RESIGN MOBILE APP",
    priority: "P2",
    project: "UID",
    status: "Not yet started",
    taskLeader: "Daris",
    businessLine: "EMS",
    element: "E2",
    startTime: "2026-09-08",
    dueDate: "2026-09-15",
    notes: "Review restrukturisasi kode dan rilis mobile app EMS untuk sekolah.",
    parentItems: ""
  },
  {
    id: "rec-ems-2",
    task: "REVIEW LAGI MENGENAI VA SI MURNI",
    priority: "P1",
    project: "HANA MULIA",
    status: "Ongoing",
    taskLeader: "Daris",
    businessLine: "EMS",
    element: "E2",
    startTime: "2026-09-08",
    dueDate: "2026-09-12",
    notes: "Cek konfigurasi Virtual Account payment gateway & rekonsiliasi SPP sekolah Hana Mulia.",
    parentItems: ""
  },

  // 2. BETTER FUTURE
  {
    id: "rec-bf-1",
    task: "PERBAIKIN DARI SISI UI UX",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "BETTER FUTURE",
    element: "E2",
    startTime: "2026-09-08",
    dueDate: "2026-09-11",
    notes: "8/7 SUDAH KERJASAMA... Pangkas titik friksi di alur pendaftaran siswa & halaman hasil tes ISCA.",
    parentItems: ""
  },
  {
    id: "rec-bf-2",
    task: "DASHBOARD UNTUK PARTNER",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Not yet started",
    taskLeader: "Daris",
    businessLine: "BETTER FUTURE",
    element: "E2",
    startTime: "2026-09-10",
    dueDate: "2026-09-18",
    notes: "JADI KAYAK BERAPA TEST... Dashboard yayasan/sekolah mitra untuk pantau progress tes siswa secara live.",
    parentItems: ""
  },
  {
    id: "rec-bf-3",
    task: "DASHBOARD UNTUK REVIEW",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Not yet started",
    taskLeader: "Pierre Marchel",
    businessLine: "BETTER FUTURE",
    element: "E2",
    startTime: "2026-09-11",
    dueDate: "2026-09-20",
    notes: "BERAPA YANG SUDAH C... Dashboard analitik internal untuk tim evaluasi hasil tes dan konversi paket lengkap.",
    parentItems: ""
  },

  // 3. LPK OS
  {
    id: "rec-lpk-1",
    task: "BLUEPRINT & MODUL VOKASI IT LPK OS",
    priority: "P1",
    project: "LPK OS",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "LPK OS",
    element: "E8",
    startTime: "2026-09-08",
    dueDate: "2026-09-25",
    notes: "Cicil daftar keahlian siap kerja 3-6 bulan (AI Operator, Web Dev, QA) di folder parrolinggo > lpk untuk 2 sekolah vokasi 2030.",
    parentItems: ""
  },

  // 4. MARKETING
  {
    id: "rec-mkt-1",
    task: "PIXEL SETUP & META CTWA RETARGETING",
    priority: "P0",
    project: "BETTER FUTURE",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "MARKETING",
    element: "E3",
    startTime: "2026-09-08",
    dueDate: "2026-09-10",
    notes: "Meta Ads Click-to-WhatsApp budget Rp 50k-100k/hari, anchor Rp 129jt vs Rp 120rb, tracking event Purchase & Lead.",
    parentItems: ""
  },
  {
    id: "rec-mkt-2",
    task: "BF LANDING PAGE OPTIMIZATION",
    priority: "P0",
    project: "BETTER FUTURE",
    status: "Ongoing",
    taskLeader: "Daris",
    businessLine: "MARKETING",
    element: "E3",
    startTime: "2026-09-08",
    dueDate: "2026-09-12",
    notes: "Fast loading B2C landing page, WhatsApp bridge, downsell promo popup.",
    parentItems: ""
  },
  {
    id: "rec-mkt-3",
    task: "BRIEF KE ONE BRAND: KAMPANYE RENCANAMU TUTUP",
    priority: "P0",
    project: "BETTER FUTURE",
    status: "Ongoing",
    taskLeader: "One Brand",
    businessLine: "MARKETING",
    element: "E3",
    startTime: "2026-09-08",
    dueDate: "2026-09-09",
    notes: "Kirim brief materi carousel: 'Rencanamu Tutup, Ke Mana Tes Bakat Sekarang?' untuk tangkap vakum pasar.",
    parentItems: ""
  },
  {
    id: "rec-mkt-4",
    task: "REKAM 2 VIDEO REELS SANTAI / POV EDUKASI",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Not yet started",
    taskLeader: "Pierre Marchel",
    businessLine: "MARKETING",
    element: "E3",
    startTime: "2026-09-16",
    dueDate: "2026-09-16",
    notes: "Hook: 'Biaya salah jurusan kuliah Rp 129 juta vs tes bakat Rp 120rb'. Simpan di draft IG Stories & feed.",
    parentItems: ""
  },
  {
    id: "rec-mkt-5",
    task: "SETTING N8N BROADCAST PROMO PAYDAY RP 70.000",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Not yet started",
    taskLeader: "Yusup",
    businessLine: "MARKETING",
    element: "E3",
    startTime: "2026-09-23",
    dueDate: "2026-09-25",
    notes: "Siapkan draf pesan flash sale 48 jam & kuota promo gajian tgl 25-28 ke database orang tua WA.",
    parentItems: ""
  },

  // 5. SPIRITUAL & LIFE
  {
    id: "rec-life-1",
    task: "DEKRIT PAGI 30 MNT SEBELUM BUKA HP",
    priority: "P0",
    project: "LIFE OS",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "SPIRITUAL & LIFE",
    element: "E1",
    startTime: "2026-09-08",
    dueDate: "2026-09-30",
    notes: "Doa penyerahan mandat, membaca firman Tuhan, & refleksi 2030 sebelum terdistraksi notifikasi duniawi.",
    parentItems: ""
  },
  {
    id: "rec-life-2",
    task: "1 TINDAKAN KEBAIKAN & JURNAL SYUKUR 3 HAL",
    priority: "P1",
    project: "LIFE OS",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "SPIRITUAL & LIFE",
    element: "E1",
    startTime: "2026-09-08",
    dueDate: "2026-09-30",
    notes: "Setiap hari lakukan 1 berkat nyata bagi sesama dan catat 3 hal syukur malam hari.",
    parentItems: ""
  },
  {
    id: "rec-life-3",
    task: "SABAT PENUH (DISCONNECT WORK & HP)",
    priority: "P0",
    project: "LIFE OS",
    status: "Not yet started",
    taskLeader: "Pierre Marchel",
    businessLine: "SPIRITUAL & LIFE",
    element: "E1",
    startTime: "2026-09-13",
    dueDate: "2026-09-13",
    notes: "Ibadah raya, komsel JPCC, istirahat total, zero kerjaan bisnis di HP. Percaya Tuhan yang memberi tuaian.",
    parentItems: ""
  },

  // 6. BRAND & TRUST
  {
    id: "rec-brd-1",
    task: "LATIHAN ATURAN JEDA 3 DETIK SEBELUM BICARA",
    priority: "P0",
    project: "LIFE OS",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "BRAND & TRUST",
    element: "E7",
    startTime: "2026-09-08",
    dueDate: "2026-09-30",
    notes: "Tahan 3 detik sebelum menjawab telepon, meeting, atau merespons emosi. Jaga composure dan tutur kata pemimpin.",
    parentItems: ""
  },
  {
    id: "rec-brd-2",
    task: "HUBUNGI 6 SISWA KETAPANG UNTUK VIDEO TESTIMONI",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Ongoing",
    taskLeader: "Hani",
    businessLine: "BRAND & TRUST",
    element: "E7",
    startTime: "2026-09-09",
    dueDate: "2026-09-14",
    notes: "Tukar voucher/tes gratis dengan video testimoni 30 detik antusias siswa yang sudah tahu arah bakatnya.",
    parentItems: ""
  },
  {
    id: "rec-brd-3",
    task: "MATERI SEMINAR PARENTING 3 OKT DI SKK CIBUBUR",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "BRAND & TRUST",
    element: "E7",
    startTime: "2026-09-21",
    dueDate: "2026-10-03",
    notes: "Kolaborasi dr. Teguh: susun slide 'Anakku Mau Jadi Apa', rundown panggung, dan e-book gratis untuk orang tua.",
    parentItems: ""
  },

  // 7. SALES & PARTNERSHIP
  {
    id: "rec-sls-1",
    task: "FOLLOW-UP JAM KAMIS VIA FRUITFULDAY",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Not yet started",
    taskLeader: "Pierre Marchel",
    businessLine: "SALES & PARTNERSHIP",
    element: "E4",
    startTime: "2026-09-10",
    dueDate: "2026-09-10",
    notes: "Follow-up 5 sekolah lama yang masih menimbang + kontak Pak Reza (Edubazar) untuk kemitraan jaringan sekolah.",
    parentItems: ""
  },
  {
    id: "rec-sls-2",
    task: "TROJAN HORSE B2C KE GURU BK SEKOLAH ASAL",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Not yet started",
    taskLeader: "Hani",
    businessLine: "SALES & PARTNERSHIP",
    element: "E4",
    startTime: "2026-09-17",
    dueDate: "2026-09-17",
    notes: "Hubungi Guru BK dari sekolah asal anak-anak yang pernah ikut tes B2C secara mandiri dengan membawa data agregat bakat.",
    parentItems: ""
  },

  // 8. TEAM & OPERATIONS
  {
    id: "rec-team-1",
    task: "WEEKLY STANDUP SENIN 09.00 (GOOGLE CALENDAR)",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Done",
    taskLeader: "Hermes",
    businessLine: "TEAM & OPERATIONS",
    element: "E6",
    startTime: "2026-09-08",
    dueDate: "2026-09-08",
    notes: "Standup 30 menit bareng tim 6 orang (Hermes, Daris, Yusup, Ocha, Hani, Pinkan) fokus target mingguan & blocker.",
    parentItems: ""
  },
  {
    id: "rec-team-2",
    task: "TARIK 5 IDE PERBAIKAN BULANAN (KAIZEN) DARI 6 STAF",
    priority: "P2",
    project: "BETTER FUTURE",
    status: "Not yet started",
    taskLeader: "Pierre Marchel",
    businessLine: "TEAM & OPERATIONS",
    element: "E6",
    startTime: "2026-09-28",
    dueDate: "2026-09-28",
    notes: "Tiap staf menyetor 5 usulan perbaikan kecil sistem; pilih 3 perbaikan terbaik untuk dieksekusi bulan depan.",
    parentItems: ""
  },

  // 9. REVENUE & FINANCE
  {
    id: "rec-fin-1",
    task: "REVIEW SISTEM 4 KANTONG REKENING & PERSEPUHAN",
    priority: "P1",
    project: "LIFE OS",
    status: "Ongoing",
    taskLeader: "Pierre Marchel",
    businessLine: "REVENUE & FINANCE",
    element: "E5",
    startTime: "2026-09-08",
    dueDate: "2026-09-30",
    notes: "Disiplin alokasi: Kantong 1 PT, Kantong 2 Pribadi, Kantong 3 Pajak/Cadangan, Kantong 4 Legacy Fund 2030.",
    parentItems: ""
  },
  {
    id: "rec-fin-2",
    task: "PENDAMPINGAN PEMBUKUAN PINKAN BERSAMA CI RINA",
    priority: "P1",
    project: "BETTER FUTURE",
    status: "Ongoing",
    taskLeader: "Pinkan",
    businessLine: "REVENUE & FINANCE",
    element: "E5",
    startTime: "2026-09-08",
    dueDate: "2026-09-30",
    notes: "Review P&L bulanan, kepatuhan PPh/PPN, dan pembagian hak hasil tim.",
    parentItems: ""
  }
];

export const MANDALA_GRID = {
  E1: {
    title: "1. SPIRITUAL FOUNDATION",
    items: [
      "1.1 Doa pagi min. 30 mnt sebelum HP",
      "1.2 Baca Alkitab + refleksi mandat",
      "1.3 Akuntabilitas rohani mingguan",
      "1.4 Persepuluhan PERTAMA dari revenue",
      "1.5 Sabat penuh 1 hari per minggu",
      "1.6 Puasa & doa bulanan",
      "1.7 Jurnal syukur 3 hal tiap malam",
      "1.8 Pelayanan aktif komunitas iman"
    ]
  },
  E2: {
    title: "2. PRODUCT EXCELLENCE",
    items: [
      "2.1 Standarisasi ISCA 19 Faktor",
      "2.2 Zero-Friction Setup EMS (<7 hari)",
      "2.3 Uptime Server & WA 99.9%",
      "2.4 1 Micro-Kaizen per hari",
      "2.5 Blueprint & MVP LPK OS IT",
      "2.6 Voice of Customer bulanan",
      "2.7 Database Karir & Vokasi",
      "2.8 Validitas Ilmiah & Keamanan Data"
    ]
  },
  E3: {
    title: "3. MARKETING & CONTENT",
    items: [
      "3.1 Bot Comment-to-DM (n8n + WA)",
      "3.2 Hijack Vakum Rencanamu",
      "3.3 Meta Ads CTWA Rp 50-100k/hari",
      "3.4 Blueprint Konten 4 Pilar",
      "3.5 3 Carousel Edukasi Ortu / minggu",
      "3.6 2 Video Reels Santai / minggu",
      "3.7 Payday Flash Sale Rp 70.000",
      "3.8 Testimoni Sekolah Mitra Nyata"
    ]
  },
  E4: {
    title: "4. SALES & PARTNERSHIPS",
    items: [
      "4.1 Pitch Deck Zero-Cost B2B2C",
      "4.2 Pipeline Lark CRM + Scrapling",
      "4.3 Skema Referral Dana Beasiswa",
      "4.4 Trojan Horse Guru BK B2C",
      "4.5 Aliansi Edubazar (Pak Reza)",
      "4.6 Min. 2 Pitch Meeting / minggu",
      "4.7 Follow-up Kamis di Fruitfulday",
      "4.8 Target 20 Sekolah Aktif 2026"
    ]
  },
  E5: {
    title: "5. REVENUE ENGINE",
    items: [
      "5.1 Persepuluhan First Fruit 10%",
      "5.2 Four-Pocket System (4 Rekening)",
      "5.3 Roadmap Pelunasan Hutang",
      "5.4 Harga B2B (35k) & B2C (120k/70k)",
      "5.5 Value Ladder dr. Teguh & Univ",
      "5.6 Aliansi Dr. Robbani Affan",
      "5.7 Reinvestasi Ads 20% ROAS 3.5x",
      "5.8 Laporan P&L Tanggal 1 Akunting"
    ]
  },
  E6: {
    title: "6. TEAM & OPERATIONS",
    items: [
      "6.1 Skuad Inti 6 Staf + One Brand",
      "6.2 SOP Onboarding Sekolah (48 Jam)",
      "6.3 Budaya Mandat & 5 Kaizen/Bln",
      "6.4 Standup Senin 09.00 G-Cal",
      "6.5 Weekly Wins Jumat 16.00 G-Cal",
      "6.6 Ritme Founder (Fruitfulday/Winning)",
      "6.7 One-on-One Lunch Mingguan",
      "6.8 Profit Sharing Resmi Terikat"
    ]
  },
  E7: {
    title: "7. BRAND & TRUST",
    items: [
      "7.1 Whitepaper Validitas 19 Faktor",
      "7.2 E-Book Ortu 'Anakku Mau Jadi Apa'",
      "7.3 Vault Testimoni Video Siswa",
      "7.4 LinkedIn Thought Leadership",
      "7.5 Event Parenting SKK Cibubur",
      "7.6 Liputan Media PR Terarah",
      "7.7 Garansi Selebrasi Kepuasan",
      "7.8 Karakter: Jaga Mulut & Jeda 3s"
    ]
  },
  E8: {
    title: "8. LEGACY INFRASTRUCTURE",
    items: [
      "8.1 Yayasan Nirlaba Kemenkumham",
      "8.2 Injeksi Kas Rutin Legacy Fund",
      "8.3 Cetak Biru 5 Klinik (dr. Teguh)",
      "8.4 Kurikulum 2 LPK Vokasi IT",
      "8.5 Penyaluran Kerja Domestik/P3MI",
      "8.6 Lokasi Terkendali DKI/Banten",
      "8.7 Groundbreaking Fasilitas #1",
      "8.8 Social Franchise 2030 Genap"
    ]
  }
};
