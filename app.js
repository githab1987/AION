/* ============================================================
   SPECIAL ALI
   Financial Control Operating System

   Frontend responsibilities:
   - UI
   - navigation
   - Supabase Auth session
   - password recovery
   - file selection
   - API invocation
   - rendering authoritative backend state

   Backend responsibilities:
   - authoritative state
   - database mutation
   - validation
   - evidence
   - OCR/extraction
   - accounting
   - tax
   - dependencies
   - proof
   - audit
   - authorization
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const CONFIG = {
  SUPABASE_URL:
    "https://dqbnqvskfgcjktexpcym.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxYm5xdnNrZmdjamt0ZXhwY3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MzcxMzQsImV4cCI6MjEwNDUxMzEzNH0.5c3e6bEPKjVDhDdMESWFgWy1Ym0UIpTYNJc7O35Rpng",
  API_BASE:
    window.SPECIAL_ALI_API_BASE ||
    "/api/v1",

  STORAGE_BUCKET:
    "evidence"
};


/* ============================================================
   SUPABASE
============================================================ */

let supabaseClient = null;

function initSupabase() {

  if (
    !window.supabase ||
    !CONFIG.SUPABASE_URL ||
    CONFIG.SUPABASE_URL === "YOUR_SUPABASE_URL" ||
    !CONFIG.SUPABASE_ANON_KEY ||
    CONFIG.SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY"
  ) {
    return false;
  }

  supabaseClient = window.supabase.createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  return true;
}


/* ============================================================
   APPLICATION STATE

   UI state is NOT authoritative state.
============================================================ */

const state = {

  session: null,
  user: null,
  profile: null,
  workspace: null,

  /*
    Password recovery state.

    This prevents the recovery session from being
    treated as a normal authenticated application session.
  */
  recoveryMode: false,

  route: "ali",

  sidebarCollapsed:
    localStorage.getItem("special_ali_sidebar") === "collapsed",

  mobileNavOpen: false,

  aliVisible: false,

  aliOpenCount: 0,

  aliLastContext: null,

  processing: false,

  uploadFiles: [],

  pendingConfirmation: null,

  backendConfigured: false,

  language:
  localStorage.getItem("special_ali_language") === "en"
    ? "en"
    : "id"

};


/* ============================================================
   ROUTES
============================================================ */

const ROUTES = {

  ali: {
    title: "ALI Command Center",
    section: "ALI"
  },

  tasks: {
    title: "Tasks",
    section: "ALI"
  },

  "action-center": {
    title: "Action Center",
    section: "ALI"
  },

  activity: {
    title: "Activity",
    section: "ALI"
  },

  work: {
    title: "Work",
    section: "WORK"
  },

  investigation: {
    title: "Investigation",
    section: "WORK",
    parent: "work"
  },

  reconciliation: {
    title: "Reconciliation",
    section: "WORK",
    parent: "work"
  },

  findings: {
    title: "Findings",
    section: "WORK",
    parent: "work"
  },

  exceptions: {
    title: "Exceptions",
    section: "WORK",
    parent: "work"
  },

  unresolved: {
    title: "Unresolved",
    section: "WORK",
    parent: "work"
  },

  "accounting-overview": {
    title: "Accounting Overview",
    section: "ACCOUNTING"
  },

  transactions: {
    title: "Transactions",
    section: "ACCOUNTING"
  },

  journal: {
    title: "Journal",
    section: "ACCOUNTING"
  },

  ledger: {
    title: "Ledger",
    section: "ACCOUNTING"
  },

  accounts: {
    title: "Accounts",
    section: "ACCOUNTING"
  },

  receivables: {
    title: "Receivables",
    section: "ACCOUNTING"
  },

  payables: {
    title: "Payables",
    section: "ACCOUNTING"
  },

  inventory: {
    title: "Inventory",
    section: "ACCOUNTING"
  },

  "fixed-assets": {
    title: "Fixed Assets",
    section: "ACCOUNTING"
  },

  adjustments: {
    title: "Adjustments",
    section: "ACCOUNTING"
  },

  "period-close": {
    title: "Period Close",
    section: "ACCOUNTING"
  },

  "financial-reports": {
    title: "Financial Reports",
    section: "ACCOUNTING"
  },

  "tax-overview": {
    title: "Tax Overview",
    section: "TAX"
  },

  "tax-data": {
    title: "Tax Data",
    section: "TAX"
  },

  "tax-calculations": {
    title: "Tax Calculations",
    section: "TAX"
  },

  "tax-reconciliation": {
    title: "Tax Reconciliation",
    section: "TAX"
  },

  "tax-rules": {
    title: "Tax Rules",
    section: "TAX"
  },

  "tax-issues": {
    title: "Tax Issues",
    section: "TAX"
  },

  "tax-reports": {
    title: "Tax Reports / Export",
    section: "TAX"
  },

  "data-overview": {
    title: "Data Center",
    section: "DATA CENTER"
  },

  sources: {
    title: "Sources",
    section: "DATA CENTER"
  },

  documents: {
    title: "Documents",
    section: "DATA CENTER"
  },

  ingestion: {
    title: "Data Ingestion",
    section: "DATA CENTER"
  },

  ocr: {
    title: "OCR / Extraction",
    section: "DATA CENTER"
  },

  "data-validation": {
    title: "Data Validation",
    section: "DATA CENTER"
  },

  "data-health": {
    title: "Data Health",
    section: "DATA CENTER"
  },

  duplicates: {
    title: "Duplicates",
    section: "DATA CENTER"
  },

  "reset-data": {
    title: "Reset Data",
    section: "DATA CENTER"
  },

  "delete-data": {
    title: "Delete Data",
    section: "DATA CENTER"
  },

  "refresh-audit": {
    title: "Refresh Audit",
    section: "DATA CENTER"
  },

  "evidence-registry": {
    title: "Evidence Registry",
    section: "EVIDENCE"
  },

  proof: {
    title: "Proof",
    section: "EVIDENCE"
  },

  conflicts: {
    title: "Conflicts",
    section: "EVIDENCE"
  },

  "pending-approval": {
    title: "Pending Approval",
    section: "HUMAN GATE"
  },

  decisions: {
    title: "Decisions",
    section: "HUMAN GATE"
  },

  "decision-history": {
    title: "Decision History",
    section: "HUMAN GATE"
  },

  "control-report": {
    title: "Control Report",
    section: "REPORTS"
  },

  "accounting-report": {
    title: "Accounting Report",
    section: "REPORTS"
  },

  "tax-report": {
    title: "Tax Report",
    section: "REPORTS"
  },

  "audit-report": {
    title: "Audit Report",
    section: "REPORTS"
  },

  "execution-log": {
    title: "Execution Log",
    section: "AUDIT"
  },

  "event-log": {
    title: "Event Log",
    section: "AUDIT"
  },

  "audit-trail": {
    title: "Audit Trail",
    section: "AUDIT"
  },

  account: {
    title: "Account",
    section: "SETTINGS"
  },

  workspace: {
    title: "Workspace",
    section: "SETTINGS"
  },

  members: {
    title: "Members & Roles",
    section: "SETTINGS"
  },

  permissions: {
    title: "Permissions",
    section: "SETTINGS"
  },

  "accounting-settings": {
    title: "Accounting Settings",
    section: "SETTINGS"
  },

  "tax-settings": {
    title: "Tax Settings",
    section: "SETTINGS"
  },

  integrations: {
    title: "Integrations",
    section: "SETTINGS"
  },

  preferences: {
    title: "Preferences",
    section: "SETTINGS"
  }
};


/* ============================================================
   ALI LANGUAGE
============================================================ */

const ALI_MESSAGES = {

  commandCenter: [
    "Saya siap. Kita mulai dari apa yang benar-benar ada di workspace ini.",
    "Workspace siap. Beri saya datanya, lalu kita lihat apa yang sebenarnya terjadi.",
    "Saya di sini. Tidak perlu merapikan semuanya dulu. Kita bisa mulai dari data yang ada.",
    "Mari kita mulai. Saya akan membedakan apa yang terbukti, apa yang perlu diperiksa, dan apa yang belum bisa disimpulkan."
  ],

  openAgain: [
    "Saya kembali. Kita lanjut dari konteks terakhir.",
    "Saya di sini lagi. Mari kita lihat apa yang membutuhkan perhatian sekarang.",
    "Baik. Saya kembali ke workspace. Tidak ada yang saya anggap selesai tanpa dasar yang cukup.",
    "Kita lanjut. Saya akan menjaga konteks pekerjaan ini tetap terhubung dengan buktinya."
  ],

  upload: [
    "Saya menerima file-nya. Saya akan memeriksa isinya sebelum menggunakannya.",
    "Data masuk. Saya akan ekstrak, validasi, cari duplikasi, lalu daftarkan evidence-nya.",
    "Saya belum menganggap file ini sebagai data yang benar. Kita periksa dulu."
  ],

  processing: [
    "Saya sedang memeriksa struktur data. Tunggu sampai validasi selesai sebelum menarik kesimpulan.",
    "Extraction sedang berjalan. Saya akan mempertahankan hubungan antara hasil ekstraksi dan sumber aslinya.",
    "Saya sedang memeriksa data, bukan sekadar membaca teksnya."
  ],

  work: [
    "Di Work, kita fokus pada hal-hal yang membutuhkan pemeriksaan, keputusan, atau penyelesaian.",
    "Saya akan membantu memprioritaskan pekerjaan berdasarkan kondisi data dan evidence."
  ],

  findings: [
    "Finding belum otomatis berarti kesalahan. Kita perlu evidence yang cukup sebelum menyimpulkannya.",
    "Saya tidak akan menutup finding hanya karena terlihat masuk akal. Resolution harus dapat dibuktikan."
  ],

  reconciliation: [
    "Reconciliation dimulai dari kecocokan evidence, bukan dari angka yang ingin kita cocokkan.",
    "Saya akan membedakan EXACT, PROBABLE, PARTIAL, AMBIGUOUS, NO MATCH dan CONTRADICTED."
  ],

  unresolved: [
    "Yang belum terselesaikan tetap terlihat. Saya tidak akan membuat masalah menghilang hanya karena belum ada jawabannya.",
    "UNRESOLVED tetap menjadi bagian dari kontrol sampai ada resolution yang tervalidasi."
  ],

  tax: [
    "Untuk Tax, saya akan memisahkan perlakuan perpajakan dari perlakuan accounting.",
    "Kalau rule belum established, hasil pajak tidak boleh diperlakukan sebagai final.",
    "Saya akan menjaga hubungan antara tax result, rule version, evidence dan calculation."
  ],

  accounting: [
    "Untuk Accounting, kita bisa mulai dari transaction, journal, reconciliation atau closing.",
    "Saya akan menjaga trace dari input sampai final accounting result."
  ]
};

/* ============================================================
   SPECIAL ALI — LANGUAGE ENGINE
============================================================ */

const UI_LANGUAGE = {

  id: {
    nav: {
      ali: "ALI Command Center",
      tasks: "Tugas",
      "action-center": "Pusat Aksi",
      activity: "Aktivitas",

      work: "Pekerjaan",
      investigation: "Investigasi",
      reconciliation: "Rekonsiliasi",
      findings: "Temuan",
      exceptions: "Pengecualian",
      unresolved: "Belum Terselesaikan",

      "accounting-overview": "Ikhtisar Akuntansi",
      transactions: "Transaksi",
      journal: "Jurnal",
      ledger: "Buku Besar",
      accounts: "Akun",
      receivables: "Piutang",
      payables: "Utang",
      inventory: "Persediaan",
      "fixed-assets": "Aset Tetap",
      adjustments: "Penyesuaian",
      "period-close": "Penutupan Periode",
      "financial-reports": "Laporan Keuangan",

      "tax-overview": "Ikhtisar Pajak",
      "tax-data": "Data Pajak",
      "tax-calculations": "Perhitungan Pajak",
      "tax-reconciliation": "Rekonsiliasi Pajak",
      "tax-rules": "Aturan Pajak",
      "tax-issues": "Masalah Pajak",
      "tax-reports": "Laporan / Ekspor Pajak",

      "data-overview": "Pusat Data",
      sources: "Sumber",
      documents: "Dokumen",
      ingestion: "Ingestion Data",
      ocr: "OCR / Ekstraksi",
      "data-validation": "Validasi Data",
      "data-health": "Kesehatan Data",
      duplicates: "Duplikasi",
      "reset-data": "Reset Data",
      "delete-data": "Hapus Data",
      "refresh-audit": "Refresh Audit",

      "evidence-registry": "Evidence Registry",
      proof: "Proof",
      conflicts: "Konflik",

      "pending-approval": "Menunggu Persetujuan",
      decisions: "Keputusan",
      "decision-history": "Riwayat Keputusan",

      "control-report": "Laporan Kontrol",
      "accounting-report": "Laporan Akuntansi",
      "tax-report": "Laporan Pajak",
      "audit-report": "Laporan Audit",

      "execution-log": "Execution Log",
      "event-log": "Event Log",
      "audit-trail": "Audit Trail",

      account: "Akun",
      workspace: "Workspace",
      members: "Anggota & Peran",
      permissions: "Permissions",
      "accounting-settings": "Pengaturan Akuntansi",
      "tax-settings": "Pengaturan Pajak",
      integrations: "Integrasi",
      preferences: "Preferensi"
    },

    section: {
      ALI: "ALI",
      WORK: "PEKERJAAN",
      ACCOUNTING: "AKUNTANSI",
      TAX: "PAJAK",
      "DATA CENTER": "PUSAT DATA",
      EVIDENCE: "EVIDENCE",
      "HUMAN GATE": "HUMAN GATE",
      REPORTS: "LAPORAN",
      AUDIT: "AUDIT",
      SETTINGS: "PENGATURAN"
    },

    command: {
      eyebrow: "ALI PERSONAL COMMAND CENTER",
      welcome: "Selamat datang",
      workspaceReady: "Workspace Anda siap.",
      workspaceData:
        "Workspace Anda sudah memiliki data. Mari lihat apa yang membutuhkan perhatian.",
      workspaceEmpty:
        "Workspace Anda masih kosong. Tidak masalah. Mulai dengan memasukkan data.",

      uploadLabel: "MASUKKAN DATA",
      uploadTitle: "Unggah Data",
      uploadMore: "Tambahkan Data",
      uploadCopy:
        "Unggah file dari perangkat Anda. ALI akan memeriksa, memvalidasi, dan menghubungkan data dengan evidence sebelum digunakan.",
      uploadButton: "+ Unggah Data",
      workspaceButton: "Buka Workspace",
      ingestionButton: "Lihat Ingestion",

      operate: "OPERASIKAN ALI",
      askTitle: "Beritahu ALI apa yang Anda butuhkan.",
      askPlaceholder:
        "Contoh: Periksa invoice pembelian yang belum direkonsiliasi.",
      askButton: "Tanya ALI",

      documents: "Dokumen diproses",
      transactions: "Transaksi",
      unresolved: "Belum terselesaikan",
      control: "Status kontrol",

      ready: "Siap",

      englishMorning: "Selamat pagi",
      englishAfternoon: "Selamat siang",
      englishEvening: "Selamat malam"
    }
  },

  en: {
    nav: {
      ali: "ALI Command Center",
      tasks: "Tasks",
      "action-center": "Action Center",
      activity: "Activity",

      work: "Work",
      investigation: "Investigation",
      reconciliation: "Reconciliation",
      findings: "Findings",
      exceptions: "Exceptions",
      unresolved: "Unresolved",

      "accounting-overview": "Accounting Overview",
      transactions: "Transactions",
      journal: "Journal",
      ledger: "Ledger",
      accounts: "Accounts",
      receivables: "Receivables",
      payables: "Payables",
      inventory: "Inventory",
      "fixed-assets": "Fixed Assets",
      adjustments: "Adjustments",
      "period-close": "Period Close",
      "financial-reports": "Financial Reports",

      "tax-overview": "Tax Overview",
      "tax-data": "Tax Data",
      "tax-calculations": "Tax Calculations",
      "tax-reconciliation": "Tax Reconciliation",
      "tax-rules": "Tax Rules",
      "tax-issues": "Tax Issues",
      "tax-reports": "Tax Reports / Export",

      "data-overview": "Data Center",
      sources: "Sources",
      documents: "Documents",
      ingestion: "Data Ingestion",
      ocr: "OCR / Extraction",
      "data-validation": "Data Validation",
      "data-health": "Data Health",
      duplicates: "Duplicates",
      "reset-data": "Reset Data",
      "delete-data": "Delete Data",
      "refresh-audit": "Refresh Audit",

      "evidence-registry": "Evidence Registry",
      proof: "Proof",
      conflicts: "Conflicts",

      "pending-approval": "Pending Approval",
      decisions: "Decisions",
      "decision-history": "Decision History",

      "control-report": "Control Report",
      "accounting-report": "Accounting Report",
      "tax-report": "Tax Report",
      "audit-report": "Audit Report",

      "execution-log": "Execution Log",
      "event-log": "Event Log",
      "audit-trail": "Audit Trail",

      account: "Account",
      workspace: "Workspace",
      members: "Members & Roles",
      permissions: "Permissions",
      "accounting-settings": "Accounting Settings",
      "tax-settings": "Tax Settings",
      integrations: "Integrations",
      preferences: "Preferences"
    },

    section: {
      ALI: "ALI",
      WORK: "WORK",
      ACCOUNTING: "ACCOUNTING",
      TAX: "TAX",
      "DATA CENTER": "DATA CENTER",
      EVIDENCE: "EVIDENCE",
      "HUMAN GATE": "HUMAN GATE",
      REPORTS: "REPORTS",
      AUDIT: "AUDIT",
      SETTINGS: "SETTINGS"
    },

    command: {
      eyebrow: "ALI PERSONAL COMMAND CENTER",
      welcome: "Welcome",
      workspaceReady: "Your workspace is ready.",
      workspaceData:
        "Your workspace already has data. Let's see what needs your attention.",
      workspaceEmpty:
        "Your workspace is empty. That's okay. Start by adding your data.",

      uploadLabel: "DATA INTAKE",
      uploadTitle: "Upload Your Data",
      uploadMore: "Add More Data",
      uploadCopy:
        "Upload files from your device. ALI will inspect, validate and connect data with evidence before it is used.",
      uploadButton: "+ Upload Data",
      workspaceButton: "Open Workspace",
      ingestionButton: "View Ingestion",

      operate: "OPERATE WITH ALI",
      askTitle: "Tell ALI what you need.",
      askPlaceholder:
        "Example: Check purchase invoices that have not been reconciled.",
      askButton: "Ask ALI",

      documents: "Processed documents",
      transactions: "Transactions",
      unresolved: "Unresolved",
      control: "Control state",

      ready: "Ready",

      englishMorning: "Good morning",
      englishAfternoon: "Good afternoon",
      englishEvening: "Good evening"
    }
  }

};


function getLanguage() {
  return state.language === "en"
    ? "en"
    : "id";
}


function t(path) {

  const language =
    UI_LANGUAGE[getLanguage()];

  return path
    .split(".")
    .reduce(
      (value, key) =>
        value?.[key],
      language
    ) || path;

}


function setLanguage(language) {

  const nextLanguage =
    language === "en"
      ? "en"
      : "id";

  state.language =
    nextLanguage;

  localStorage.setItem(
    "special_ali_language",
    nextLanguage
  );

  updateLanguageButtons();
  applyNavigationLanguage();

  /*
    Re-render the current route through
    the existing application router.

    No DOM observer.
    No recovery loop.
  */
  navigate(state.route);

}


function updateLanguageButtons() {

  const idButton =
    $("#languageID");

  const enButton =
    $("#languageEN");

  if (!idButton || !enButton) {
    return;
  }

  idButton.classList.toggle(
    "active",
    getLanguage() === "id"
  );

  enButton.classList.toggle(
    "active",
    getLanguage() === "en"
  );

}


function applyNavigationLanguage() {

  $$(".nav-item").forEach(
    button => {

      const route =
        button.dataset.route;

      const text =
        button.querySelector(
          ".nav-text"
        );

      if (!text || !UI_LANGUAGE[getLanguage()].nav[route]) {
        return;
      }

      text.textContent =
        UI_LANGUAGE[getLanguage()].nav[route];

    }
  );

  $$(".nav-label").forEach(
    label => {

      const key =
        label.textContent
          .trim()
          .toUpperCase();

      const translated =
        UI_LANGUAGE[getLanguage()].section[key];

      if (translated) {
        label.textContent =
          translated;
      }

    }
  );

  updateLanguageButtons();

}


function getRouteTitle(route) {

  return (
    UI_LANGUAGE[getLanguage()]
      .nav[route] ||
    ROUTES[route]?.title ||
    route
  );

}

/* ============================================================
   DOM HELPERS
============================================================ */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  Array.from(
    document.querySelectorAll(selector)
  );


/* ============================================================
   BOOT
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    state.backendConfigured =
      initSupabase();

    bindEvents();
    applySidebarState();

    updateLanguageButtons();
    applyNavigationLanguage();

    if (!state.backendConfigured) {

      setConnection(
        false,
        "Backend not configured"
      );

      showLanding();

      return;
    }

    await restoreSession();

  }
);


/* ============================================================
   EVENTS
============================================================ */

function bindEvents() {

  $("#authForm")?.addEventListener(
    "submit",
    handleAuthSubmit
  );

  $("#fileInput")?.addEventListener(
    "change",
    handleFilesSelected
  );

  window.addEventListener(
    "resize",
    handleResize
  );

}


/* ============================================================
   AUTH SESSION
============================================================ */

async function restoreSession() {

  try {

    /*
      Register listener BEFORE getSession().

      This is important because Supabase can emit
      PASSWORD_RECOVERY while processing the recovery link.
    */

    supabaseClient.auth.onAuthStateChange(
      async (event, session) => {

        /*
          PASSWORD_RECOVERY must NEVER immediately open
          the normal application dashboard.

          It opens the existing auth modal in recovery mode.
        */

        if (
          event === "PASSWORD_RECOVERY"
        ) {

          state.recoveryMode = true;

          showPasswordRecovery();

          return;
        }


        /*
          While the user is changing the password,
          do not let SIGNED_IN or TOKEN_REFRESHED
          open the application automatically.
        */

        if (
          state.recoveryMode
        ) {

          return;
        }


        if (session) {

          await applyAuthenticatedSession(
            session
          );

        } else {

          state.session = null;
          state.user = null;
          state.profile = null;
          state.workspace = null;

          showLanding();

        }

      }
    );


    /*
      Check whether this URL is a Supabase recovery URL.

      We intentionally inspect only the type.
      Tokens are never logged or displayed.
    */

    const recoveryFromURL =
      isRecoveryURL();


    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }


    /*
      Recovery URL takes priority over normal session.
    */

    if (recoveryFromURL) {

      state.recoveryMode = true;

      showPasswordRecovery();

      return;
    }


    if (data?.session) {

      await applyAuthenticatedSession(
        data.session
      );

    } else {

      showLanding();

    }

  } catch (error) {

    console.error(error);

    setConnection(
      false,
      "Session unavailable"
    );

    showLanding();

  }

}


/* ============================================================
   DETECT PASSWORD RECOVERY URL
============================================================ */

function isRecoveryURL() {

  try {

    const url =
      new URL(
        window.location.href
      );

    /*
      Supabase recovery links can use
      query parameters or hash parameters.

      We only inspect "type".
    */

    const queryType =
      url.searchParams.get(
        "type"
      );

    if (
      queryType === "recovery"
    ) {
      return true;
    }


    const hash =
      url.hash.replace(
        /^#/,
        ""
      );

    if (!hash) {
      return false;
    }

    const hashParams =
      new URLSearchParams(
        hash
      );

    return (
      hashParams.get("type") ===
      "recovery"
    );

  } catch {

    return false;

  }

}


/* ============================================================
   AUTH APPLY
============================================================ */

async function applyAuthenticatedSession(
  session
) {

  /*
    Never apply a recovery session as normal app session.
  */

  if (
    state.recoveryMode
  ) {
    return;
  }

  state.session =
    session;

  state.user =
    session.user;

  setConnection(
    true,
    "Connected"
  );

  updateUserIdentity();


  /*
    Profile/workspace data should come from backend.
    Never manufacture role/workspace authority in UI.
  */

  try {

    const result =
      await apiRequest(
        "/me",
        {
          method: "GET"
        },
        false
      );

    if (result) {

      state.profile =
        result.profile || null;

      state.workspace =
        result.workspace || null;

    }

  } catch (error) {

    console.warn(
      "Profile/workspace API unavailable:",
      error
    );

  }

  updateUserIdentity();

  /*
    Authentication is complete.

    Do NOT navigate directly to Command Center.
    The READY experience is the first screen
    after successful authentication.
  */

  showApp();

  if (
    window.SPECIAL_ALI_READY &&
    typeof window.SPECIAL_ALI_READY.open === "function"
  ) {

    window.SPECIAL_ALI_READY.open();

    return;
  }

  /*
    Safe fallback only if READY is unavailable.
    Existing application remains usable.
  */

  await navigate("ali");

}
   

/* ============================================================
   AUTH UI
============================================================ */

let authMode =
  "signin";


function showAuth(
  mode = "signin"
) {

  state.recoveryMode =
    false;

  authMode =
    mode;

  const modal =
    $("#authModal");

  if (!modal) {
    return;
  }

  modal.classList.remove(
    "hidden"
  );


  $("#authTitle").textContent =
    mode === "signup"
      ? "Create your SPECIAL ALI account"
      : "Welcome back";


  $("#authDescription").textContent =
    mode === "signup"
      ? "Create your account and start a controlled workspace."
      : "Sign in to continue to your workspace.";


  $("#nameField")
    ?.classList
    .toggle(
      "hidden",
      mode !== "signup"
    );


  $("#authSubmit").textContent =
    mode === "signup"
      ? "Create Account"
      : "Sign In";


  $("#authError")
    ?.classList
    .add("hidden");


  clearRecoveryFields();

}


/* ============================================================
   PASSWORD RECOVERY UI
============================================================ */

function showPasswordRecovery() {

  state.recoveryMode =
    true;

  authMode =
    "recovery";

  const modal =
    $("#authModal");

  if (!modal) {
    return;
  }

  modal.classList.remove(
    "hidden"
  );


  $("#authTitle").textContent =
    "Set a new password";


  $("#authDescription").textContent =
    "Create a new password for your SPECIAL ALI account.";


  $("#nameField")
    ?.classList
    .add("hidden");


  /*
    Existing password field is reused as
    the NEW password field.
  */

  const passwordField =
    $("#authPassword");

  if (passwordField) {

    passwordField.value =
      "";

    passwordField.type =
      "password";

    passwordField.autocomplete =
      "new-password";

    passwordField.placeholder =
      "New password";

  }


  /*
    The existing auth form is preserved.

    We insert only one additional confirmation
    field immediately after the password field.
  */

  ensureRecoveryConfirmField();


  $("#authSubmit").textContent =
    "Update Password";


  $("#authError")
    ?.classList
    .add("hidden");


  setConnection(
    true,
    "Recovery session active"
  );

}


/* ============================================================
   RECOVERY CONFIRM FIELD
============================================================ */

function ensureRecoveryConfirmField() {

  if (
    $("#authPasswordConfirm")
  ) {
    return;
  }

  const passwordInput =
    $("#authPassword");

  if (!passwordInput) {
    return;
  }

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.id =
    "authPasswordConfirmWrapper";

  wrapper.style.marginTop =
    "12px";


  wrapper.innerHTML = `

    <input
      id="authPasswordConfirm"
      type="password"
      autocomplete="new-password"
      placeholder="Confirm new password"
      style="
        width:100%;
        box-sizing:border-box;
      "
    >

  `;


  passwordInput.parentNode
    ?.insertBefore(
      wrapper,
      passwordInput.nextSibling
    );

}


/* ============================================================
   CLEAR RECOVERY FIELDS
============================================================ */

function clearRecoveryFields() {

  const wrapper =
    $("#authPasswordConfirmWrapper");

  if (wrapper) {
    wrapper.remove();
  }

  const passwordInput =
    $("#authPassword");

  if (passwordInput) {

    passwordInput.value =
      "";

    passwordInput.type =
      "password";

    passwordInput.autocomplete =
      "current-password";

    passwordInput.placeholder =
      "";

  }

}


/* ============================================================
   CLOSE AUTH
============================================================ */

function closeAuth() {

  $("#authModal")
    ?.classList
    .add("hidden");

}


/* ============================================================
   AUTH SUBMIT
============================================================ */

async function handleAuthSubmit(
  event
) {

  event.preventDefault();


  if (
    !state.backendConfigured
  ) {

    showToast(
      "Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY terlebih dahulu.",
      "warning"
    );

    return;
  }


  /*
    PASSWORD RECOVERY
  */

  if (
    state.recoveryMode ||
    authMode === "recovery"
  ) {

    await handlePasswordRecovery();

    return;

  }


  const email =
    $("#authEmail")
      ?.value
      .trim() ||
    "";


  const password =
    $("#authPassword")
      ?.value ||
    "";


  const name =
    $("#authName")
      ?.value
      .trim() ||
    "";


  const errorBox =
    $("#authError");


  errorBox?.classList.add(
    "hidden"
  );


  const submitButton =
    $("#authSubmit");


  if (submitButton) {
    submitButton.disabled = true;
  }


  try {

    let result;


    if (
      authMode === "signup"
    ) {

      result =
        await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });

    } else {

      result =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

    }


    if (result.error) {
      throw result.error;
    }


    if (
      authMode === "signup" &&
      !result.data.session
    ) {

      closeAuth();

      showToast(
        "Account dibuat. Silakan verifikasi email jika Supabase mengaktifkan email confirmation.",
        "success"
      );

      return;
    }


    closeAuth();

  } catch (error) {

    console.error(error);

    if (errorBox) {

      errorBox.textContent =
        normalizeError(error);

      errorBox.classList.remove(
        "hidden"
      );

    }

  } finally {

    if (submitButton) {
      submitButton.disabled =
        false;
    }

  }

}


/* ============================================================
   PASSWORD RECOVERY SUBMIT
============================================================ */

async function handlePasswordRecovery() {

  const password =
    $("#authPassword")
      ?.value ||
    "";


  const confirmation =
    $("#authPasswordConfirm")
      ?.value ||
    "";


  const errorBox =
    $("#authError");


  const submitButton =
    $("#authSubmit");


  errorBox?.classList.add(
    "hidden"
  );


  /*
    Basic client-side checks.

    Supabase remains authoritative for
    the actual password update.
  */

  if (
    password.length < 6
  ) {

    showAuthError(
      "Password baru minimal 6 karakter."
    );

    return;

  }


  if (
    password !== confirmation
  ) {

    showAuthError(
      "Konfirmasi password tidak sama."
    );

    return;

  }


  if (
    !supabaseClient
  ) {

    showAuthError(
      "Supabase belum tersedia."
    );

    return;

  }


  if (submitButton) {
    submitButton.disabled = true;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.updateUser({
        password
      });


    if (error) {
      throw error;
    }


    if (!data?.user) {

      throw new Error(
        "Password update tidak mengembalikan user."
      );

    }


    /*
      Password has been accepted by Supabase Auth.
      Do not keep the recovery session as an
      application session.
    */

    state.recoveryMode =
      false;

    state.session =
      null;

    state.user =
      null;

    state.profile =
      null;

    state.workspace =
      null;


    await supabaseClient.auth.signOut();


    closeAuth();

    clearRecoveryFields();


    showLanding();


    showToast(
      "Password berhasil diperbarui. Silakan Sign In dengan password baru.",
      "success"
    );


    /*
      Remove recovery parameters from browser URL
      without navigating away.
    */

    cleanRecoveryURL();


  } catch (error) {

    console.error(error);

    showAuthError(
      normalizeError(error)
    );

  } finally {

    if (submitButton) {
      submitButton.disabled = false;
    }

  }

}


/* ============================================================
   AUTH ERROR
============================================================ */

function showAuthError(
  message
) {

  const errorBox =
    $("#authError");

  if (!errorBox) {
    return;
  }

  errorBox.textContent =
    message;

  errorBox.classList.remove(
    "hidden"
  );

}


/* ============================================================
   CLEAN RECOVERY URL
============================================================ */

function cleanRecoveryURL() {

  try {

    const url =
      new URL(
        window.location.href
      );

    url.searchParams.delete(
      "type"
    );


    /*
      Remove the hash completely.

      Recovery tokens must never remain visible
      in the browser URL after completion.
    */

    url.hash =
      "";


    window.history.replaceState(
      {},
      document.title,
      url.pathname +
      (
        url.search
          ? `?${url.searchParams.toString()}`
          : ""
      )
    );

  } catch {

    /*
      URL cleanup is non-critical.
      Never block successful password reset.
    */

  }

}


/* ============================================================
   FORGOT PASSWORD
   ============================================================ */

async function requestPasswordReset() {

  if (
    !state.backendConfigured
  ) {

    showToast(
      "Supabase belum dikonfigurasi.",
      "warning"
    );

    return;

  }


  const email =
    $("#authEmail")
      ?.value
      .trim() ||
    "";


  if (!email) {

    showAuthError(
      "Masukkan email terlebih dahulu."
    );

    return;

  }


  try {

    const redirectTo =
      window.location.origin +
      window.location.pathname;


    const {
      error
    } =
      await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo
        }
      );


    if (error) {
      throw error;
    }


    showToast(
      "Email reset password telah dikirim. Periksa inbox Anda.",
      "success"
    );

  } catch (error) {

    console.error(error);

    showAuthError(
      normalizeError(error)
    );

  }

}


/* ============================================================
   LOGOUT
============================================================ */

async function logout() {

  if (!supabaseClient) {

    showLanding();

    return;

  }


  try {

    const {
      error
    } =
      await supabaseClient.auth.signOut();


    if (error) {
      throw error;
    }


    /*
      Session is intentionally removed only by logout.
      Closing/reloading the app does NOT call signOut.
    */

  } catch (error) {

    console.error(error);

    showToast(
      normalizeError(error),
      "error"
    );

  }

}


/* ============================================================
   VIEW SWITCHING
============================================================ */

function showLanding() {

  $("#landingView")
    ?.classList
    .remove("hidden");

  $("#learnView")
    ?.classList
    .add("hidden");

  $("#appView")
    ?.classList
    .add("hidden");

  closeMobileSidebar();

  toggleALI(false);

}


function showLearnMore() {

  $("#landingView")
    ?.classList
    .add("hidden");

  $("#learnView")
    ?.classList
    .remove("hidden");

  $("#appView")
    ?.classList
    .add("hidden");

}


function showApp() {

  $("#landingView")
    ?.classList
    .add("hidden");

  $("#learnView")
    ?.classList
    .add("hidden");

  $("#appView")
    ?.classList
    .remove("hidden");

  updateUserIdentity();

}


/* ============================================================
   USER IDENTITY
============================================================ */

function updateUserIdentity() {

  if (!state.user) {
    return;
  }


  const fullName =
    state.profile?.full_name ||
    state.user.user_metadata?.full_name ||
    state.user.email?.split("@")[0] ||
    "User";


  const role =
    state.profile?.role ||
    state.workspace?.role ||
    "Member";


  const initials =
    getInitials(fullName);


  $("#sidebarUserName").textContent =
    fullName;

  $("#sidebarUserRole").textContent =
    role;

  $("#topUserName").textContent =
    fullName;

  $("#sidebarAvatar").textContent =
    initials;

  $("#topAvatar").textContent =
    initials;

}


function getInitials(name) {

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      part => part[0]
    )
    .join("")
    .toUpperCase();

}


/* ============================================================
   NAVIGATION
============================================================ */

async function navigate(route) {

  /*
    SPECIAL ALI — READY EXPERIENCE

    READY hanya digunakan sebagai entry experience
    setelah Sign In.

    Begitu user melakukan navigasi ke aplikasi,
    READY harus ditutup dan tidak boleh menghalangi
    route/submenu apa pun.
  */

  if (
    window.SPECIAL_ALI_READY &&
    typeof window.SPECIAL_ALI_READY.close === "function"
  ) {
    window.SPECIAL_ALI_READY.close();
  }

  /*
    Pastikan route valid.
  */
  if (!ROUTES[route]) {
    route = "ali";
  }

  /*
    Simpan route aktif.
  */
  state.route = route;

  /*
    Update judul halaman.
  */
  $("#topbarTitle").textContent =
    getRouteTitle(route);

  /*
    Terapkan bahasa aktif.
  */
  applyNavigationLanguage();

  /*
    Tutup mobile sidebar setelah user
    memilih menu.
  */
  closeMobileSidebar();

  /*
    Render halaman sebenarnya.
  */
  await renderRoute(route);
}

/* ============================================================
   ROUTE RENDERER
============================================================ */

async function renderRoute(route) {

  switch (route) {

    case "ali":
      renderCommandCenter();
      break;

    case "work":
      renderWork();
      break;

    case "investigation":
      renderInvestigation();
      break;

    case "reconciliation":
      renderReconciliation();
      break;

    case "findings":
      renderFindings();
      break;

    case "exceptions":
      renderExceptions();
      break;

    case "unresolved":
      renderUnresolved();
      break;

    case "ocr":
      renderOCR();
      break;

    case "ingestion":
      renderIngestion();
      break;

    case "reset-data":
      renderResetData();
      break;

    case "delete-data":
      renderDeleteData();
      break;

    case "refresh-audit":
      renderRefreshAudit();
      break;

    case "account":
      renderAccount();
      break;

    default:
      renderGenericPage(route);
      break;

  }

}

/* ============================================================
   COMMAND CENTER
============================================================ */

 async function renderCommandCenter() {

  const firstName =
    state.profile?.full_name?.split(" ")[0] ||
    state.user?.user_metadata?.full_name?.split(" ")[0] ||
    (getLanguage() === "id" ? "Anda" : "there");

  const greeting =
    getTimeGreeting();

  const hasData =
    Boolean(
      state.workspace?.has_data
    );

  const command =
    UI_LANGUAGE[getLanguage()].command;

  const welcomeTitle =
    hasData
      ? `${command.welcome}, ${escapeHTML(firstName)}.`
      : command.workspaceReady;

  const welcomeCopy =
    hasData
      ? command.workspaceData
      : command.workspaceEmpty;

  const uploadTitle =
    hasData
      ? command.uploadMore
      : command.uploadTitle;

  const greetingText =
    `${greeting} ${escapeHTML(firstName)}. ${
      hasData
        ? command.workspaceData
        : command.workspaceEmpty
    }`;

  $("#content").innerHTML = `

    <div class="command-head">

      <div class="eyebrow">
        ${command.eyebrow}
      </div>

      <h1 class="page-title">
        ${welcomeTitle}
      </h1>

      <p class="page-description">
        ${welcomeCopy}
      </p>

      <div
        class="ali-line"
        id="commandAliLine"
      ></div>

      <div class="welcome-actions">

        <button
          class="btn btn-primary"
          type="button"
          onclick="navigate('workspace')"
        >
          ${command.workspaceButton}
        </button>

        <button
          class="btn btn-green"
          type="button"
          onclick="openFilePicker()"
        >
          ${command.uploadButton}
        </button>

      </div>

    </div>


    <div class="command-grid">

      <section class="card upload-card">

        <div class="upload-symbol">
          ↑
        </div>

        <div class="eyebrow">
          ${command.uploadLabel}
        </div>

        <div class="card-title">
          ${uploadTitle}
        </div>

        <div class="card-copy">
          ${command.uploadCopy}
        </div>

        <div class="formats">
          PDF · EXCEL · CSV · IMAGES · DOCUMENTS · JSON · XML
        </div>

        <div class="upload-actions">

          <button
            class="btn btn-green"
            type="button"
            onclick="openFilePicker()"
          >
            ${command.uploadButton}
          </button>

          <button
            class="btn btn-soft"
            type="button"
            onclick="navigate('ingestion')"
          >
            ${command.ingestionButton}
          </button>

        </div>

      </section>


      <section class="card ask-card">

        <div class="eyebrow">
          ${command.operate}
        </div>

        <div class="card-title">
          ${command.askTitle}
        </div>

        <textarea
          id="aliInput"
          placeholder="${command.askPlaceholder}"
        ></textarea>

        <div style="margin-top:12px">

          <button
            class="btn btn-primary"
            type="button"
            onclick="submitALIRequest()"
          >
            ${command.askButton}
          </button>

        </div>

        <div
          id="askResponse"
          class="ask-response"
        >
          ${
            getLanguage() === "id"
              ? "ALI dapat menganalisis dan mengusulkan tindakan, tetapi perubahan state yang authoritative tetap dikendalikan backend."
              : "ALI can reason and propose actions, but authoritative state changes remain controlled by the backend."
          }
        </div>

      </section>

    </div>


    <div class="state-strip">

      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : "0"}
        </div>
        <div class="state-label">
          ${command.documents}
        </div>
      </div>


      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : "0"}
        </div>
        <div class="state-label">
          ${command.transactions}
        </div>
      </div>


      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : "0"}
        </div>
        <div class="state-label">
          ${command.unresolved}
        </div>
      </div>


      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : command.ready}
        </div>
        <div class="state-label">
          ${command.control}
        </div>
      </div>

    </div>

  `;

  typeALI(
    greetingText,
    "COMMAND_CENTER"
  );

}
        
/* ============================================================
   TIME AWARE GREETING
============================================================ */

function getTimeGreeting() {

  const hour =
    new Date().getHours();

  if (getLanguage() === "id") {

    if (hour < 11) {
      return "Selamat pagi";
    }

    if (hour < 17) {
      return "Selamat siang";
    }

    return "Selamat malam";
  }

  if (hour < 11) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";

}

/* ============================================================
   ALI TOGGLE
============================================================ */

function toggleALI(force) {

  const shouldOpen =
    typeof force === "boolean"
      ? force
      : !state.aliVisible;


  state.aliVisible =
    shouldOpen;


  const panel =
    $("#aliPanel");


  if (!panel) {
    return;
  }


  if (shouldOpen) {

    state.aliOpenCount++;


    panel.classList.remove(
      "hidden"
    );


    const message =
      getContextualALIMessage();


    typeALI(
      message,
      state.route.toUpperCase()
    );

  } else {

    panel.classList.add(
      "hidden"
    );


    state.aliLastContext =
      `HIDDEN_AFTER_${state.route}`;

  }

}


function getContextualALIMessage() {

  const route =
    state.route;


  if (
    state.aliOpenCount > 1 &&
    state.aliLastContext === route
  ) {

    return randomFrom(
      ALI_MESSAGES.openAgain
    );

  }


  state.aliLastContext =
    route;


  if (
    route === "findings"
  ) {

    return randomFrom(
      ALI_MESSAGES.findings
    );

  }


  if (
    route === "reconciliation"
  ) {

    return randomFrom(
      ALI_MESSAGES.reconciliation
    );

  }


  if (
    route === "unresolved"
  ) {

    return randomFrom(
      ALI_MESSAGES.unresolved
    );

  }


  if (
    route.startsWith("tax-")
  ) {

    return randomFrom(
      ALI_MESSAGES.tax
    );

  }


  if (
    route === "transactions" ||
    route === "journal" ||
    route === "ledger" ||
    route === "accounts" ||
    route.startsWith("accounting")
  ) {

    return randomFrom(
      ALI_MESSAGES.accounting
    );

  }


  if (
    route === "work" ||
    ROUTES[route]?.parent === "work"
  ) {

    return randomFrom(
      ALI_MESSAGES.work
    );

  }


  return randomFrom(
    ALI_MESSAGES.commandCenter
  );

}


/* ============================================================
   ALI TYPE / REVEAL
============================================================ */

let aliTypingTimer =
  null;


function typeALI(
  message,
  context = ""
) {

  clearInterval(
    aliTypingTimer
  );


  const output =
    $("#aliMessage");


  const contextOutput =
    $("#aliContext");


  if (!output) {
    return;
  }


  output.textContent =
    "";


  if (contextOutput) {

    contextOutput.textContent =
      `CONTEXT · ${context}`;

  }


  let index =
    0;


  aliTypingTimer =
    setInterval(
      () => {

        output.textContent =
          message.slice(
            0,
            index
          );

        index++;


        if (
          index > message.length
        ) {

          clearInterval(
            aliTypingTimer
          );

        }

      },
      14
    );

}


/* ============================================================
   ASK ALI
============================================================ */

async function submitALIRequest() {

  const input =
    $("#aliInput");


  const response =
    $("#askResponse");


  if (!input) {
    return;
  }


  const message =
    input.value.trim();


  if (!message) {

    showToast(
      "Tulis dulu apa yang ingin Anda kerjakan.",
      "warning"
    );

    return;

  }


  toggleALI(true);


  response.textContent =
    "ALI is checking the request...";


  try {

    const result =
      await apiRequest(
        "/agent/messages",
        {
          method: "POST",
          body: {
            message,
            workspace_id:
              state.workspace?.id ||
              null
          }
        }
      );


    response.textContent =
      result?.message ||
      "Request accepted by ALI.";


    typeALI(
      result?.message ||
      "Request diterima. Saya akan memprosesnya melalui execution layer.",
      "AGENT_REQUEST"
    );

  } catch (error) {

    response.textContent =
      "ALI belum dapat menjalankan request ini karena execution backend belum tersedia.";


    typeALI(
      "Saya belum akan berpura-pura sudah mengerjakannya. Execution backend belum mengembalikan hasil.",
      "BACKEND_BOUNDARY"
    );


    showToast(
      normalizeError(error),
      "warning"
    );

  }

}


/* ============================================================
   FILE UPLOAD
============================================================ */

function openFilePicker() {

  $("#fileInput")?.click();

}


async function handleFilesSelected(
  event
) {

  const files =
    Array.from(
      event.target.files ||
      []
    );


  if (!files.length) {
    return;
  }


  state.uploadFiles =
    files;


  typeALI(
    randomFrom(
      ALI_MESSAGES.upload
    ),
    "DATA_INTAKE"
  );


  await processUploadSelection(
    files
  );

}


async function processUploadSelection(
  files
) {

  renderProcessingPage(
    files
  );


  try {

    const result =
      await apiRequest(
        "/ingestion/jobs",
        {
          method: "POST",
          body: {
            workspace_id:
              state.workspace?.id ||
              null,

            files:
              files.map(
                file => ({
                  name:
                    file.name,

                  size:
                    file.size,

                  type:
                    file.type,

                  last_modified:
                    file.lastModified
                })
              )
          }
        }
      );


    if (!result) {

      throw new Error(
        "No ingestion job returned."
      );

    }


    if (
      result.upload_urls
    ) {

      await uploadFilesToSignedUrls(
  files,
  result.upload_urls
);

if (result.execution_id) {

  await runExecution(
    result.execution_id
  );

     monitorExecution(
      result.execution_id
   );

  }
    await monitorExecution(
      result.execution_id
   );

  }


    state.workspace = {
      ...(state.workspace || {}),
      has_data: true
    };


    await navigate(
      "ingestion"
    );

  } catch (error) {

    console.error(error);

    renderProcessingError(
      error
    );

  }

}


/* ============================================================
   SIGNED UPLOAD
============================================================ */

async function uploadFilesToSignedUrls(
  files,
  uploadUrls
) {

  for (
    let i = 0;
    i < files.length;
    i++
  ) {

    const file =
      files[i];


    const target =
      uploadUrls[i];


    if (!target) {

      throw new Error(
        `No upload target for ${file.name}`
      );

    }


    const response =
      await fetch(
        target.url,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              file.type ||
              "application/octet-stream"
          },
          body: file
        }
      );


    if (!response.ok) {

      throw new Error(
        `Upload failed for ${file.name}`
      );

    }

  }


async function runExecution(
  executionId
) {

  if (!executionId) {
    throw new Error(
      "Execution ID tidak tersedia."
    );
  }

  const result =
    await apiRequest(
      `/agent/executions/${encodeURIComponent(
        executionId
      )}/run`,
      {
        method: "POST"
      }
    );

  return result.execution;
}


/* ============================================================
   PROCESSING PAGE
============================================================ */

function renderProcessingPage(
  files
) {

  $("#content").innerHTML = `

    <div class="command-head">

      <div class="eyebrow">
        DATA INGESTION
      </div>

      <h1 class="page-title">
        Checking your data.
      </h1>

      <p class="page-description">
        ALI will not use extracted information as authoritative
        until the ingestion pipeline has completed its checks.
      </p>

      <div class="ali-line">
        Extraction · OCR · Classification · Validation · Duplicate Detection · Evidence
      </div>

    </div>

    <section class="card processing-card">

      ${files.map(
        (file, index) => `

        <div class="processing-row">

          <div>

            <div
              style="
                font-size:13px;
                font-weight:600
              "
            >
              ${escapeHTML(file.name)}
            </div>

            <div
              id="processing-${index}"
              class="progress"
            >
              <span></span>
            </div>

          </div>

          <div
            id="status-${index}"
            class="status"
          >
            Waiting
          </div>

        </div>

      `
      ).join("")}

    </section>

  `;

}


/* ============================================================
   MONITOR EXECUTION
============================================================ */

async function monitorExecution(
  executionId
) {

  let finished =
    false;


  while (!finished) {

    const result =
      await apiRequest(
        `/agent/executions/${encodeURIComponent(
          executionId
        )}`,
        {
          method: "GET"
        }
      );


    if (!result) {
      break;
    }


    const execution =
      result.execution ||
      result;


    const status =
      execution.status;


    updateExecutionUI(
      execution
    );


    finished =
      [
        "COMPLETED",
        "FAILED",
        "STOPPED",
        "BLOCKED"
      ].includes(
        status
      );


    if (!finished) {

      await sleep(
        1200
      );

    }

  }

}


function updateExecutionUI(
  execution
) {

  const steps =
    execution.steps ||
    [];


  steps.forEach(
    (
      step,
      index
    ) => {

      const bar =
        document.querySelector(
          `#processing-${index} span`
        );


      const status =
        document.querySelector(
          `#status-${index}`
        );


      if (
        !bar ||
        !status
      ) {
        return;
      }


      const progress =
        Number(
          step.progress ||
          0
        );


      bar.style.width =
        `${
          Math.max(
            0,
            Math.min(
              100,
              progress
            )
          )
        }%`;


      status.textContent =
        step.status ||
        "Processing";


      status.className =
        `status ${
          step.status === "COMPLETED"
            ? "ready"
            : step.status === "BLOCKED"
              ? "blocked"
              : step.status === "WARNING"
                ? "warning"
                : ""
        }`;

    }
  );

}


/* ============================================================
   INGESTION PAGE
============================================================ */

function renderIngestion() {

  $("#content").innerHTML = `

    ${backButton(
      "Data Center",
      "data-overview"
    )}

    <div class="command-head">

      <div class="eyebrow">
        DATA CENTER / INGESTION
      </div>

      <h1 class="page-title">
        Data Ingestion
      </h1>

      <p class="page-description">
        Upload local files, monitor extraction, OCR, validation,
        duplicate checks and evidence registration.
      </p>

    </div>

    <section class="card page-card">

      <div class="card-title">
        Upload local data
      </div>

      <div class="card-copy">
        Files are processed through the controlled ingestion pipeline.
        The browser does not decide whether data is valid.
      </div>

      <div class="upload-actions">

        <button
          class="btn btn-green"
          onclick="openFilePicker()"
        >
          + Upload Data
        </button>

      </div>

    </section>

  `;

}


/* ============================================================
   OCR PAGE
============================================================ */

function renderOCR() {

  $("#content").innerHTML = `

    ${backButton(
      "Data Center",
      "data-overview"
    )}

    <div class="command-head">

      <div class="eyebrow">
        DATA CENTER / EXTRACTION
      </div>

      <h1 class="page-title">
        OCR / Extraction
      </h1>

      <p class="page-description">
        OCR is part of the data ingestion engine for scanned PDFs
        and images. Native digital text should be extracted directly
        when possible.
      </p>

    </div>

    <section class="card page-card">

      <div class="eyebrow">
        EXTRACTION FLOW
      </div>

      <div
        style="
          margin-top:16px;
          display:grid;
          gap:9px;
          color:#4b5563;
          font-size:13px;
        "
      >

        <div>
          01 · File security check
        </div>

        <div>
          02 · File type detection
        </div>

        <div>
          03 · Extraction router
        </div>

        <div>
          04 · Native text/table extraction or OCR
        </div>

        <div>
          05 · Classification
        </div>

        <div>
          06 · Structured data extraction
        </div>

        <div>
          07 · Validation
        </div>

        <div>
          08 · Duplicate detection
        </div>

        <div>
          09 · Evidence registration
        </div>

        <div>
          10 · READY / REPAIR / BLOCK
        </div>

      </div>

    </section>

  `;

}


/* ============================================================
   WORK
============================================================ */

function renderWork() {

  $("#content").innerHTML = `

    <div class="command-head">

      <div class="eyebrow">
        ALI PERSONAL COMMAND CENTER / WORK
      </div>

      <h1 class="page-title">
        Work
      </h1>

      <p class="page-description">
        One place for investigation, reconciliation, findings,
        exceptions and unresolved work.
      </p>

    </div>

    <section class="command-grid">

      ${workCard(
        "Investigation",
        "Trace observations into hypotheses, tests, evidence and conclusions.",
        "investigation"
      )}

      ${workCard(
        "Reconciliation",
        "Match records without silently turning probable matches into confirmed ones.",
        "reconciliation"
      )}

      ${workCard(
        "Findings",
        "Track findings through controlled lifecycle states.",
        "findings"
      )}

      ${workCard(
        "Exceptions",
        "See data and control conditions that need attention.",
        "exceptions"
      )}

      ${workCard(
        "Unresolved",
        "Keep unresolved matters visible until they are actually resolved.",
        "unresolved"
      )}

    </section>

  `;

}


function workCard(
  title,
  description,
  route
) {

  return `

    <button
      class="card"
      style="
        border:1px solid #e5e7eb;
        padding:25px;
        text-align:left;
        background:#fff;
      "
      onclick="navigate('${route}')"
    >

      <div
        class="eyebrow"
        style="color:#19a463"
      >
        WORK
      </div>

      <div
        class="card-title"
        style="margin-top:9px"
      >
        ${title}
      </div>

      <div class="card-copy">
        ${description}
      </div>

      <div
        style="
          margin-top:20px;
          color:#6b7280;
          font-size:12px;
        "
      >
        Open →
      </div>

    </button>

  `;

}


/* ============================================================
   WORK CHILD PAGES
============================================================ */

function renderInvestigation() {

  renderWorkChild(
    "Investigation",
    "Trace each investigation through Observation → Hypothesis → Test → Evidence → Result → Conclusion.",
    "INVESTIGATION"
  );

}


function renderReconciliation() {

  renderWorkChild(
    "Reconciliation",
    "Reconcile records using controlled match states: EXACT, PROBABLE, PARTIAL, AMBIGUOUS, NO_MATCH and CONTRADICTED.",
    "RECONCILIATION"
  );

}


function renderFindings() {

  renderWorkChild(
    "Findings",
    "Finding lifecycle: OPEN → INVESTIGATING → BLOCKED / WAITING_USER → RESOLVED / REJECTED / INVALIDATED.",
    "FINDINGS"
  );

}


function renderExceptions() {

  renderWorkChild(
    "Exceptions",
    "Exceptions are actionable control conditions. They remain visible until validated resolution.",
    "EXCEPTIONS"
  );

}


function renderUnresolved() {

  renderWorkChild(
    "Unresolved",
    "UNRESOLVED_REGISTRY prevents unresolved issues from disappearing from the control system.",
    "UNRESOLVED"
  );

}


function renderWorkChild(
  title,
  description,
  context
) {

  $("#content").innerHTML = `

    ${backButton(
      "Work",
      "work"
    )}

    <div class="command-head">

      <div class="eyebrow">
        WORK / ${context}
      </div>

      <h1 class="page-title">
        ${title}
      </h1>

      <p class="page-description">
        ${description}
      </p>

      <div class="ali-line">
        ALI will render authoritative records from the backend here.
      </div>

    </div>

    <section class="card page-card">

      <div class="eyebrow">
        CONTROLLED WORKSPACE
      </div>

      <div class="card-copy">
        No simulated findings or reconciliation results are generated
        by the frontend.
      </div>

    </section>

  `;


  typeALI(
    getContextualALIMessage(),
    context
  );

}


/* ============================================================
   RESET DATA
============================================================ */

function renderResetData() {

  $("#content").innerHTML = `

    ${backButton(
      "Data Center",
      "data-overview"
    )}

    <div class="command-head">

      <div class="eyebrow">
        DATA CENTER / CONTROL ACTION
      </div>

      <h1 class="page-title">
        Reset Data
      </h1>

      <p class="page-description">
        Resetting processed data is a controlled operation.
        Dependent results may become STALE or INVALID and require
        revalidation. Audit history is not silently removed.
      </p>

    </div>

    <section class="card page-card">

      <div class="card-title">
        Reset workspace data
      </div>

      <div class="card-copy">
        This action must be authorized by the backend.
        The frontend will never directly delete authoritative
        database state.
      </div>

      <div class="upload-actions">

        <button
          class="btn btn-danger"
          onclick="requestResetData()"
        >
          Reset Data
        </button>

      </div>

    </section>

  `;

}


async function requestResetData() {

  openConfirm(
    "Reset workspace data?",
    "This will request a controlled reset. Dependent results may become INVALID or STALE and require revalidation. Audit records remain protected.",
    async () => {

      await executeControlledMutation(
        "/data/reset",
        {
          workspace_id:
            state.workspace?.id
        }
      );

    }
  );

}


/* ============================================================
   DELETE DATA
============================================================ */

function renderDeleteData() {

  $("#content").innerHTML = `

    ${backButton(
      "Data Center",
      "data-overview"
    )}

    <div class="command-head">

      <div class="eyebrow">
        DATA CENTER / HIGH RISK
      </div>

      <h1 class="page-title">
        Delete Data
      </h1>

      <p class="page-description">
        Data deletion is a higher-risk operation.
        Authorization, retention policy, legal hold and evidence
        dependencies must be checked by the backend.
      </p>

    </div>

    <section class="card page-card">

      <div class="card-title">
        Controlled deletion
      </div>

      <div class="card-copy">
        The browser cannot bypass authorization or retention policy.
      </div>

      <div class="upload-actions">

        <button
          class="btn btn-danger"
          onclick="requestDeleteData()"
        >
          Delete Data
        </button>

      </div>

    </section>

  `;

}


async function requestDeleteData() {

  openConfirm(
    "Delete workspace data?",
    "This is a high-risk operation. Only the authorized backend can decide whether deletion is permitted. Evidence under retention or legal hold must not be deleted.",
    async () => {

      await executeControlledMutation(
        "/data/delete",
        {
          workspace_id:
            state.workspace?.id
        }
      );

    }
  );

}


/* ============================================================
   REFRESH AUDIT
============================================================ */

function renderRefreshAudit() {

  $("#content").innerHTML = `

    ${backButton(
      "Data Center",
      "data-overview"
    )}

    <div class="command-head">

      <div class="eyebrow">
        DATA CENTER / AUDIT
      </div>

      <h1 class="page-title">
        Refresh Audit
      </h1>

      <p class="page-description">
        Refresh Audit requests the backend to reload authoritative
        execution, event and audit state.
      </p>

    </div>

    <section class="card page-card">

      <div class="card-title">
        Synchronize audit state
      </div>

      <div class="card-copy">
        This button does not merely refresh the browser.
        It requests the backend audit state.
      </div>

      <div class="upload-actions">

        <button
          class="btn btn-primary"
          onclick="refreshAudit()"
        >
          Refresh Audit
        </button>

      </div>

    </section>

  `;

}


async function refreshAudit() {

  try {

    const result =
      await apiRequest(
        "/audit/refresh",
        {
          method: "POST",
          body: {
            workspace_id:
              state.workspace?.id
          }
        }
      );


    showToast(
      result?.message ||
      "Audit state refreshed.",
      "success"
    );

  } catch (error) {

    showToast(
      normalizeError(error),
      "warning"
    );

  }

}


/* ============================================================
   CONTROLLED MUTATION
============================================================ */

async function executeControlledMutation(
  endpoint,
  body
) {

  try {

    const result =
      await apiRequest(
        endpoint,
        {
          method: "POST",
          body: {
            ...body,

            idempotency_key:
              crypto.randomUUID()
          }
        }
      );


    showToast(
      result?.message ||
      "Request accepted by backend.",
      "success"
    );

  } catch (error) {

    showToast(
      normalizeError(error),
      "error"
    );

  }

}


/* ============================================================
   ACCOUNT
============================================================ */

function renderAccount() {

  const fullName =
    state.profile?.full_name ||
    state.user?.user_metadata?.full_name ||
    "User";


  const email =
    state.user?.email ||
    "—";


  const role =
    state.profile?.role ||
    state.workspace?.role ||
    "Member";


  $("#content").innerHTML = `

    <div class="command-head">

      <div class="eyebrow">
        SETTINGS / ACCOUNT
      </div>

      <h1 class="page-title">
        Account
      </h1>

      <p class="page-description">
        Identity and session information.
      </p>

    </div>

    <section class="card page-card">

      <div class="table-wrap">

        <table>

          <tbody>

            <tr>
              <th>Full Name</th>
              <td>
                ${escapeHTML(fullName)}
              </td>
            </tr>

            <tr>
              <th>Email</th>
              <td>
                ${escapeHTML(email)}
              </td>
            </tr>

            <tr>
              <th>Role</th>
              <td>
                ${escapeHTML(role)}
              </td>
            </tr>

            <tr>
              <th>Account Status</th>
              <td>
                ${
                  state.user
                    ? "Authenticated"
                    : "Signed out"
                }
              </td>
            </tr>

            <tr>
              <th>Email Verification</th>
              <td>
                ${
                  state.user?.email_confirmed_at
                    ? "Verified"
                    : "Not verified"
                }
              </td>
            </tr>

            <tr>
              <th>Last Sign-in</th>
              <td>
                ${
                  state.user?.last_sign_in_at
                    ? new Date(
                        state.user.last_sign_in_at
                      ).toLocaleString()
                    : "—"
                }
              </td>
            </tr>

          </tbody>

        </table>

      </div>

      <div class="upload-actions">

        <button
          class="btn btn-danger"
          onclick="logout()"
        >
          Sign out
        </button>

      </div>

    </section>

  `;

}


/* ============================================================
   GENERIC PAGES
============================================================ */

function renderGenericPage(
  route
) {

  const definition =
    ROUTES[route];


  if (!definition) {

    navigate("ali");

    return;

  }


  const section =
    definition.section;


  let back =
    null;


  if (
    definition.parent
  ) {

    back =
      definition.parent;

  } else if (
    section === "WORK"
  ) {

    back =
      "work";

  }


  $("#content").innerHTML = `

    ${
      back
        ? backButton(
            ROUTES[back]?.title ||
            "Back",
            back
          )
        : ""
    }

    <div class="command-head">

      <div class="eyebrow">
        ${escapeHTML(section)}
      </div>

      <h1 class="page-title">
        ${escapeHTML(
          definition.title
        )}
      </h1>

      <p class="page-description">
        This workspace is connected to the SPECIAL ALI control architecture.
        Authoritative data will be rendered from Supabase/API state.
      </p>

    </div>

    <section class="card page-card">

      <div class="eyebrow">
        BACKEND STATE
      </div>

      <div class="card-title">
        Ready for authoritative data
      </div>

      <div class="card-copy">
        No fake numbers are displayed here. When the backend returns
        validated records, this page will render those records and
        their evidence, rule, calculation, validation and proof status.
      </div>

    </section>

  `;

}


/* ============================================================
   BACK BUTTON
============================================================ */

function backButton(
  label,
  route
) {

  return `

    <button
      class="back-nav"
      type="button"
      onclick="navigate('${route}')"
    >
      ← ${escapeHTML(label)}
    </button>

  `;

}


/* ============================================================
   SIDEBAR
============================================================ */

function toggleSidebar() {

  if (
    window.innerWidth <= 780
  ) {

    toggleMobileSidebar();

    return;

  }


  state.sidebarCollapsed =
    !state.sidebarCollapsed;


  localStorage.setItem(
    "special_ali_sidebar",
    state.sidebarCollapsed
      ? "collapsed"
      : "expanded"
  );


  applySidebarState();

}


function applySidebarState() {

  const shell =
    $("#appView");


  if (!shell) {
    return;
  }


  shell.classList.toggle(
    "sidebar-collapsed",
    state.sidebarCollapsed
  );

}


function toggleMobileSidebar() {

  const sidebar =
    $("#sidebar");


  const overlay =
    $("#drawerOverlay");


  if (
    !sidebar ||
    !overlay
  ) {
    return;
  }


  state.mobileNavOpen =
    !state.mobileNavOpen;


  sidebar.classList.toggle(
    "mobile-open",
    state.mobileNavOpen
  );


  overlay.classList.toggle(
    "active",
    state.mobileNavOpen
  );

}


function closeMobileSidebar() {

  state.mobileNavOpen =
    false;


  $("#sidebar")
    ?.classList
    .remove(
      "mobile-open"
    );


  $("#drawerOverlay")
    ?.classList
    .remove(
      "active"
    );

}


function handleResize() {

  if (
    window.innerWidth > 780
  ) {

    closeMobileSidebar();

  }

}


/* ============================================================
   CONFIRMATION
============================================================ */

function openConfirm(
  title,
  message,
  action
) {

  state.pendingConfirmation =
    action;


  $("#confirmTitle").textContent =
    title;


  $("#confirmMessage").textContent =
    message;


  $("#confirmModal")
    .classList
    .remove(
      "hidden"
    );


  $("#confirmActionBtn").onclick =
    async () => {

      closeConfirm();


      if (
        typeof state.pendingConfirmation ===
        "function"
      ) {

        await state.pendingConfirmation();

      }


      state.pendingConfirmation =
        null;

    };

}


function closeConfirm() {

  $("#confirmModal")
    .classList
    .add(
      "hidden"
    );


  state.pendingConfirmation =
    null;

}


/* ============================================================
   TOAST
============================================================ */

function showToast(
  message,
  type = "info"
) {

  const container =
    $("#toastContainer");


  if (!container) {
    return;
  }


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    `toast ${type}`;


  toast.textContent =
    message;


  container.appendChild(
    toast
  );


  setTimeout(
    () => toast.remove(),
    4200
  );

}


/* ============================================================
   CONNECTION
============================================================ */

function setConnection(
  online,
  text
) {

  const connection =
    $("#connection");


  if (!connection) {
    return;
  }


  connection.classList.toggle(
    "online",
    online
  );


  const connectionText =
    $("#connectionText");


  if (connectionText) {

    connectionText.textContent =
      text;

  }

}


/* ============================================================
   API CLIENT
============================================================ */

async function apiRequest(
  endpoint,
  options = {},
  requireAuth = true
) {

  if (
    !state.backendConfigured
  ) {

    throw new Error(
      "Backend belum dikonfigurasi."
    );

  }


  let token =
    null;


  if (
    requireAuth
  ) {

    const {
      data
    } =
      await supabaseClient.auth.getSession();


    if (
      !data?.session
    ) {

      throw new Error(
        "Authentication session tidak tersedia."
      );

    }


    token =
      data.session.access_token;

  }


  const method =
    options.method ||
    "GET";


  const headers = {

    "Content-Type":
      "application/json",

    "Accept":
      "application/json"

  };


  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  const response =
    await fetch(
      `${CONFIG.API_BASE}${endpoint}`,
      {
        method,
        headers,
        body:
          method === "GET" ||
          method === "HEAD"
            ? undefined
            : JSON.stringify(
                options.body || {}
              )
      }
    );


  let payload =
    null;


  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  if (
    contentType.includes(
      "application/json"
    )
  ) {

    payload =
      await response.json();

  } else {

    const text =
      await response.text();


    payload =
      text
        ? {
            message: text
          }
        : null;

  }


  if (
    !response.ok
  ) {

    const error =
      new Error(
        payload?.message ||
        `API request failed (${response.status})`
      );


    error.status =
      response.status;


    error.payload =
      payload;


    throw error;

  }


  return payload;

}


/* ============================================================
   ERROR NORMALIZATION
============================================================ */

function normalizeError(
  error
) {

  if (!error) {
    return "Unknown error.";
  }


  if (
    error.message
  ) {

    return error.message;

  }


  return String(error);

}


/* ============================================================
   UTILS
============================================================ */

function sleep(
  ms
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


function randomFrom(
  array
) {

  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];

}


function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* ============================================================
   PROCESSING ERROR
============================================================ */

function renderProcessingError(
  error
) {

  $("#content").innerHTML = `

    <div class="command-head">

      <div class="eyebrow">
        DATA INGESTION
      </div>

      <h1 class="page-title">
        Processing stopped.
      </h1>

      <p class="page-description">
        ALI could not confirm that the ingestion pipeline completed.
        No successful result is being displayed as a substitute.
      </p>

    </div>

    <section class="card page-card">

      <div
        style="
          color:#c93636;
          font-size:13px;
          line-height:1.6;
        "
      >
        ${escapeHTML(
          normalizeError(error)
        )}
      </div>

      <div class="upload-actions">

        <button
          class="btn btn-soft"
          onclick="navigate('ingestion')"
        >
          Back to Ingestion
        </button>

      </div>

    </section>

  `;


  typeALI(
    "Saya belum bisa menyatakan data berhasil diproses. Kita berhenti di sini sampai execution backend memberikan status yang valid.",
    "INGESTION_BLOCKED"
  );

}


/* ============================================================
   GLOBAL KEYBOARD SHORTCUT
   Ctrl/Cmd + K
============================================================ */

document.addEventListener(
  "keydown",
  event => {

    if (
      (event.ctrlKey ||
        event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {

      event.preventDefault();

      toggleALI(true);


      const input =
        $("#aliInput");


      if (input) {
        input.focus();
      }

    }


    if (
      event.key === "Escape"
    ) {

      closeMobileSidebar();


      if (
        $("#confirmModal") &&
        !$("#confirmModal")
          .classList
          .contains("hidden")
      ) {

        closeConfirm();

      }

    }

  }
);


/* ============================================================
   SECURITY / UI BOUNDARY NOTE

   IMPORTANT:

   Never put:
   - service_role key
   - database password
   - private API secret
   - OpenAI private server key
   - OCR provider secret

   into this file.

   Browser receives only:
   - Supabase public anon key
   - authenticated session
   - data authorized by RLS/API.

   All authoritative mutations happen server-side.
============================================================ */


/* ============================================================
   OPTIONAL PUBLIC HELPERS
============================================================ */

window.SPECIAL_ALI = {

  navigate,

  toggleALI,

  openFilePicker,

  logout,

  showAuth,

  closeAuth,

  requestPasswordReset

};

/* ============================================================
   SPECIAL ALI — READY EXPERIENCE
   ADDITIVE ONLY
============================================================ */

(function () {

  const readyMessages = {

    en: [
      "What should we accomplish today?",
      "Let’s organize your financial data.",
      "Let’s investigate your documents.",
      "Let’s prepare your accounting workflow.",
      "Let’s review your tax data.",
      "Let’s turn evidence into a clear result."
    ],

    id: [
      "Apa yang ingin kita selesaikan hari ini?",
      "Mari kita rapikan dan pahami data keuangan Anda.",
      "Mari kita periksa dokumen yang ada.",
      "Mari kita siapkan alur accounting Anda.",
      "Mari kita tinjau data perpajakan Anda.",
      "Mari kita ubah evidence menjadi hasil yang jelas."
    ]

  };


  let readyMessageIndex = 0;
  let readyMessageTimer = null;


  function getReadyElement() {

    return document.getElementById(
      "specialAliReadyExperience"
    );

  }


  function getCurrentLanguage() {

    try {

      if (
        typeof state !== "undefined" &&
        state.language
      ) {

        return state.language === "en"
          ? "en"
          : "id";

      }

    } catch (error) {

      /* Existing application state remains authoritative. */

    }


    return (
      localStorage.getItem(
        "special_ali_language"
      ) === "en"

        ? "en"
        : "id"
    );

  }


  function updateReadyMessage() {

    const messageElement =
      document.getElementById(
        "specialAliReadyMessage"
      );


    if (!messageElement) {

      return;

    }


    const language =
      getCurrentLanguage();


    const messages =
      readyMessages[language] ||
      readyMessages.id;


    if (!messages.length) {

      return;

    }


    messageElement.classList.add(
      "is-changing"
    );


    window.setTimeout(function () {

      readyMessageIndex =
        (
          readyMessageIndex + 1
        ) % messages.length;


      messageElement.textContent =
        messages[
          readyMessageIndex
        ];


      messageElement.classList.remove(
        "is-changing"
      );

    }, 420);

  }


  function startReadyRotation() {

    stopReadyRotation();


    readyMessageTimer =
      window.setInterval(
        updateReadyMessage,
        4200
      );

  }


  function stopReadyRotation() {

    if (readyMessageTimer) {

      window.clearInterval(
        readyMessageTimer
      );

      readyMessageTimer = null;

    }

  }


  function openReadyExperience() {

    const ready =
      getReadyElement();


    if (!ready) {

      return;

    }


    ready.hidden = false;


    readyMessageIndex = 0;


    const messageElement =
      document.getElementById(
        "specialAliReadyMessage"
      );


    if (messageElement) {

      const language =
        getCurrentLanguage();


      messageElement.textContent =
        readyMessages[language][0];

    }


    startReadyRotation();

  }


  function closeReadyExperience() {

    const ready =
      getReadyElement();


    if (!ready) {

      return;

    }


    ready.hidden = true;


    stopReadyRotation();

  }


  function goToExistingRoute(
    routeName
  ) {

    /*
      IMPORTANT:

      We do not create a second
      navigation system.

      We reuse the existing
      SPECIAL ALI router.
    */

    try {

      if (
        typeof navigate === "function"
      ) {

        navigate(routeName);

        return;

      }

    } catch (error) {

      console.warn(
        "SPECIAL ALI ready navigation:",
        error
      );

    }


    /*
      Fallback:

      Use an existing navigation
      element instead of creating
      a duplicate route.
    */

    const selectors = [

      `[data-route="${routeName}"]`,

      `[data-page="${routeName}"]`,

      `[data-view="${routeName}"]`

    ];


    for (
      const selector of selectors
    ) {

      const target =
        document.querySelector(
          selector
        );


      if (target) {

        target.click();

        return;

      }

    }


    console.warn(
      "SPECIAL ALI route not found:",
      routeName
    );

  }


  function bindReadyActions() {

    const workspaceButton =
      document.getElementById(
        "readyWorkspaceButton"
      );


    const ingestionButton =
      document.getElementById(
        "readyIngestionButton"
      );


    if (workspaceButton) {

      workspaceButton.addEventListener(
        "click",
        function () {

          closeReadyExperience();

          goToExistingRoute(
            "work"
          );

        }
      );

    }


    if (ingestionButton) {

      ingestionButton.addEventListener(
        "click",
        function () {

          closeReadyExperience();

          goToExistingRoute(
            "ingestion"
          );

        }
      );

    }

  }


  function initReadyExperience() {

    bindReadyActions();


    /*
      READY is additive.

      It does not control authentication.
      It does not control the sidebar.
      It does not replace navigation.

      Existing application functions
      remain authoritative.
    */

  }


  window.SPECIAL_ALI_READY = {

    open:
      openReadyExperience,

    close:
      closeReadyExperience,

    init:
      initReadyExperience

  };


  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initReadyExperience
    );

  } else {

    initReadyExperience();

  }

})();
    

  /* ============================================================
   SPECIAL ALI — READY EXPERIENCE
   SAFE INTERACTION VERSION
============================================================ */

(function initSpecialAliReadyController() {

  let readyElement = null;
  let initialized = false;
  let opening = false;

  function getReadyElement() {
    if (readyElement && document.contains(readyElement)) {
      return readyElement;
    }

    readyElement =
      document.getElementById(
        "specialAliReadyExperience"
      );

    return readyElement;
  }

  function forceCloseReadyExperience() {

    const ready =
      getReadyElement();

    if (!ready) {
      return;
    }

    /*
      First remove the visual layer.
    */
    ready.hidden = true;

    /*
      Explicitly disable pointer interaction.
      This is the critical safety mechanism.
    */
    ready.style.pointerEvents = "none";
    ready.style.visibility = "hidden";
    ready.style.opacity = "0";

    /*
      Never allow READY to lock body scrolling
      or interaction after it has closed.
    */
    document.body.classList.remove(
      "special-ali-ready-open"
    );

    document.documentElement.classList.remove(
      "special-ali-ready-open"
    );

    state.aliVisible = false;
    opening = false;
  }

  function openReadyExperience() {

    const ready =
      getReadyElement();

    if (!ready) {
      return false;
    }

    /*
      Prevent duplicate opens.
    */
    if (opening && !ready.hidden) {
      return true;
    }

    opening = true;

    /*
      Make sure stale inline styles from a previous
      close do not survive into the next opening.
    */
    ready.style.pointerEvents = "auto";
    ready.style.visibility = "visible";
    ready.style.opacity = "1";

    ready.hidden = false;

    document.body.classList.add(
      "special-ali-ready-open"
    );

    document.documentElement.classList.add(
      "special-ali-ready-open"
    );

    state.aliVisible = true;
    state.aliOpenCount =
      Number(state.aliOpenCount || 0) + 1;

    const message =
      ready.querySelector(
        "#specialAliReadyMessage"
      );

    if (message) {

      const messages =
        Array.isArray(ALI_MESSAGES?.openAgain)
          ? ALI_MESSAGES.openAgain
          : [];

      if (messages.length) {
        const index =
          (state.aliOpenCount - 1) %
          messages.length;

        message.textContent =
          messages[index];
      }
    }

    /*
      READY is now safely open.
    */
    opening = false;

    return true;
  }

  function closeReadyExperience() {
    forceCloseReadyExperience();
    return true;
  }

  function initReadyExperience() {

    const ready =
      getReadyElement();

    if (!ready) {
      return false;
    }

    if (initialized) {
      return true;
    }

    initialized = true;

    /*
      Defensive event delegation.
      Even if an inline onclick fails later,
      these buttons still close the fullscreen
      interaction layer before navigation.
    */
    ready.addEventListener(
      "click",
      function(event) {

        const target =
          event.target instanceof Element
            ? event.target.closest(
                ".ready-action-button"
              )
            : null;

        if (!target) {
          return;
        }

        /*
          Remove the fullscreen blocker immediately.
        */
        forceCloseReadyExperience();

      },
      true
    );

    /*
      Initial state MUST be non-blocking.
    */
    forceCloseReadyExperience();

    return true;
  }

  /*
    Public controller.
  */

   
  window.SPECIAL_ALI_READY = {
    open: openReadyExperience,
    close: closeReadyExperience,
    init: initReadyExperience
  };

  /*
    Initialize as soon as DOM is available.
  */
  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      function() {
        initReadyExperience();
      },
      {
        once: true
      }
    );

  } else {

    initReadyExperience();

  }

})();

  
