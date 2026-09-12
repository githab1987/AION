/* ============================================================
   SPECIAL ALI Financial Control Operating System

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
    window.SPECIAL_ALI_API_BASE || "/api/v1",

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

  supabaseClient =
    window.supabase.createClient(
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

  recoveryMode: false,

  route: "ali",

  sidebarCollapsed:
    localStorage.getItem(
      "special_ali_sidebar"
    ) === "collapsed",

  mobileNavOpen: false,

  aliVisible: false,
  aliOpenCount: 0,
  aliLastContext: null,

  processing: false,

  uploadFiles: [],

  pendingConfirmation: null,

  backendConfigured: false
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

    supabaseClient.auth.onAuthStateChange(
      async (event, session) => {

        if (
          event === "PASSWORD_RECOVERY"
        ) {

          state.recoveryMode = true;

          showPasswordRecovery();

          return;
        }

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

  try {

    /*
      IMPORTANT:

      /me is the authentication bootstrap endpoint.

      It needs the Bearer token but does NOT yet
      have a workspace ID.

      apiRequest(false) therefore means:
      workspace header is not required.

      It does NOT mean:
      authentication token is omitted.
    */

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
        result.profile ||
        null;

      state.workspace =
        result.workspace ||
        null;

    }

  } catch (error) {

    console.warn(
      "Profile/workspace API unavailable:",
      error
    );

  }

  updateUserIdentity();

  showApp();

  await navigate(
    "ali"
  );

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
    .add(
      "hidden"
    );

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
    .add(
      "hidden"
    );

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

  ensureRecoveryConfirmField();

  $("#authSubmit").textContent =
    "Update Password";

  $("#authError")
    ?.classList
    .add(
      "hidden"
    );

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

  passwordInput.parentNode?.insertBefore(
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
    .add(
      "hidden"
    );

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

    submitButton.disabled =
      true;

  }

  try {

    let result;

    if (
      authMode === "signup"
    ) {

      result =
        await supabaseClient.auth.signUp(
          {
            email,
            password,
            options: {
              data: {
                full_name:
                  name
              }
            }
          }
        );

    } else {

      result =
        await supabaseClient.auth.signInWithPassword(
          {
            email,
            password
          }
        );

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

  if (!supabaseClient) {

    showAuthError(
      "Supabase belum tersedia."
    );

    return;

  }

  if (submitButton) {

    submitButton.disabled =
      true;

  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.updateUser(
        {
          password
        }
      );

    if (error) {

      throw error;

    }

    if (!data?.user) {

      throw new Error(
        "Password update tidak mengembalikan user."
      );

    }

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

    cleanRecoveryURL();

  } catch (error) {

    console.error(error);

    showAuthError(
      normalizeError(error)
    );

  } finally {

    if (submitButton) {

      submitButton.disabled =
        false;

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
    .remove(
      "hidden"
    );

  $("#learnView")
    ?.classList
    .add(
      "hidden"
    );

  $("#appView")
    ?.classList
    .add(
      "hidden"
    );

  closeMobileSidebar();

  toggleALI(false);

}


function showLearnMore() {

  $("#landingView")
    ?.classList
    .add(
      "hidden"
    );

  $("#learnView")
    ?.classList
    .remove(
      "hidden"
    );

  $("#appView")
    ?.classList
    .add(
      "hidden"
    );

}


function showApp() {

  $("#landingView")
    ?.classList
    .add(
      "hidden"
    );

  $("#learnView")
    ?.classList
    .add(
      "hidden"
    );

  $("#appView")
    ?.classList
    .remove(
      "hidden"
    );

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


function getInitials(
  name
) {

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      part =>
        part[0]
    )
    .join("")
    .toUpperCase();

}


/* ============================================================
   NAVIGATION
============================================================ */

async function navigate(
  route
) {

  if (!ROUTES[route]) {

    route =
      "ali";

  }

  state.route =
    route;

  updateActiveNavigation();

  $("#topbarTitle").textContent =
    ROUTES[route].title;

  closeMobileSidebar();

  await renderRoute(
    route
  );

}


function updateActiveNavigation() {

  $$(".nav-item").forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.route ===
          state.route
      );

    }
  );

}


async function renderRoute(
  route
) {

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
    "there";

  const greeting =
    getTimeGreeting();

  const hasData =
    Boolean(
      state.workspace?.has_data
    );

  $("#content").innerHTML = `
    <div class="command-head">

      <div class="eyebrow">
        ALI PERSONAL COMMAND CENTER
      </div>

      <h1 class="page-title">
        ${
          hasData
            ? `Welcome back, ${escapeHTML(firstName)}.`
            : `Your workspace is ready.`
        }
      </h1>

      <p class="page-description">
        ${
          hasData
            ? "Your financial control workspace is active. Let’s see what needs your attention."
            : "Your workspace is empty. That’s okay. Give ALI the data first."
        }
      </p>

      <div
        class="ali-line"
        id="commandAliLine"
      ></div>

    </div>

    <div class="command-grid">

      <section class="card upload-card">

        <div class="upload-symbol">
          ↑
        </div>

        <div class="eyebrow">
          DATA INTAKE
        </div>

        <div class="card-title">
          ${
            hasData
              ? "Add more data"
              : "Upload Your Data"
          }
        </div>

        <div class="card-copy">
          Upload files directly from your computer or device.
          ALI will not treat extracted information as authoritative
          until extraction, validation, duplicate checks and evidence
          registration have completed.
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
            + Upload Data
          </button>

          <button
            class="btn btn-soft"
            type="button"
            onclick="navigate('ingestion')"
          >
            View Ingestion
          </button>

        </div>

      </section>

      <section class="card ask-card">

        <div class="eyebrow">
          OPERATE WITH ALI
        </div>

        <div class="card-title">
          Tell ALI what you need.
        </div>

        <textarea
          id="aliInput"
          placeholder="Example: Periksa invoice pembelian yang belum direkonsiliasi."
        ></textarea>

        <div style="margin-top:12px">

          <button
            class="btn btn-primary"
            type="button"
            onclick="submitALIRequest()"
          >
            Ask ALI
          </button>

        </div>

        <div
          id="askResponse"
          class="ask-response"
        >
          ALI can reason and propose actions, but authoritative
          state changes remain controlled by the backend.
        </div>

      </section>

    </div>

    <div class="state-strip">

      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : "0"}
        </div>

        <div class="state-label">
          Processed documents
        </div>
      </div>

      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : "0"}
        </div>

        <div class="state-label">
          Transactions
        </div>
      </div>

      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : "0"}
        </div>

        <div class="state-label">
          Unresolved
        </div>
      </div>

      <div class="state-card">
        <div class="state-value">
          ${hasData ? "—" : "Ready"}
        </div>

        <div class="state-label">
          Control state
        </div>
      </div>

    </div>
  `;

  typeALI(
    `${greeting} ${escapeHTML(firstName)}. ${
      hasData
        ? "Workspace ini sudah memiliki data. Saya siap membantu memeriksanya."
        : "Workspace ini masih kosong. Kita bisa mulai dari data yang Anda punya."
    }`,
    "COMMAND_CENTER"
  );

}


/* ============================================================
   TIME AWARE GREETING
============================================================ */

function getTimeGreeting() {

  const hour =
    new Date().getHours();

  if (hour < 11) {

    return "Good morning.";

  }

  if (hour < 17) {

    return "Good afternoon.";

  }

  return "Good evening.";

}


/* ============================================================
   ALI TOGGLE
============================================================ */

function toggleALI(
  force
) {

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
      event.target.files || []
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

    }

    if (
      result.execution_id
    ) {

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
    (step, index) => {

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
        `${Math.max(
          0,
          Math.min(
            100,
            progress
          )
        )}%`;

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
        ${escapeHTML(title)}
      </div>

      <div class="card-copy">
        ${escapeHTML(description)}
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
        WORK / ${escapeHTML(context)}
      </div>

      <h1 class="page-title">
        ${escapeHTML(title)}
      </h1>

      <p class="page-description">
        ${escapeHTML(description)}
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

  if (definition.parent) {

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

   IMPORTANT AUTH DESIGN:

   requireAuth = true
     → session MUST exist
     → Bearer token sent
     → workspace header sent when available

   requireAuth = false
     → session is OPTIONAL
     → BUT if a session exists, Bearer token is STILL sent
     → workspace header is NOT required

   This is required for /me bootstrap.

   /me needs:
     Bearer token
       ↓
     identify user
       ↓
     find workspace
       ↓
     return workspace

   It cannot require X-Workspace-Id before the workspace
   has been discovered.
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


  /* ----------------------------------------------------------
     ALWAYS TRY TO GET THE CURRENT SUPABASE SESSION.

     requireAuth controls whether authentication is mandatory.
     It does NOT control whether an existing token is sent.
  ---------------------------------------------------------- */

  let session =
    null;

  if (
    supabaseClient
  ) {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {

      console.warn(
        "Supabase session lookup failed:",
        error
      );

    } else {

      session =
        data?.session ||
        null;

    }

  }


  /* ----------------------------------------------------------
     PROTECTED REQUESTS REQUIRE A SESSION.
  ---------------------------------------------------------- */

  if (
    requireAuth &&
    !session
  ) {

    throw new Error(
      "Authentication session tidak tersedia."
    );

  }


  /* ----------------------------------------------------------
     NEVER LOG OR EXPOSE THIS TOKEN.
  ---------------------------------------------------------- */

  const token =
    session?.access_token ||
    null;


  const method =
    options.method ||
    "GET";


  const headers = {

    "Content-Type":
      "application/json",

    "Accept":
      "application/json"

  };


  /* ----------------------------------------------------------
     SEND BEARER TOKEN WHENEVER A SESSION EXISTS.

     This fixes the /me bootstrap path.
  ---------------------------------------------------------- */

  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }


  /* ----------------------------------------------------------
     WORKSPACE HEADER IS ONLY FOR PROTECTED WORKSPACE
     REQUESTS.

     /me intentionally does NOT require this.
  ---------------------------------------------------------- */

  if (
    requireAuth &&
    state.workspace?.id
  ) {

    headers["X-Workspace-Id"] =
      state.workspace.id;

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
                options.body ||
                {}
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


/* ------------------------------------------------------------
   FIXED HTML ESCAPING

   The previous version did not actually escape HTML entities.
   This version safely converts:
   & < > " '
------------------------------------------------------------ */

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
      event.key.toLowerCase() ===
        "k"
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
   SPECIAL ALI UI RECOVERY
   - Indonesian / English
   - Post sign-in ALI welcome
   - Workspace shortcut
   - Upload Data shortcut
   - Stable navigation
   - OCR icon size protection
============================================================ */

const SPECIAL_ALI_LANGUAGE_KEY = "special_ali_language";

const SPECIAL_ALI_I18N = {
  id: {
    language: "Bahasa",
    workspace: "Workspace",
    uploadData: "Unggah Data",
    ingestion: "Ingestion",
    welcome: "Saya siap. Mau apa kita kali ini?",
    workspaceDescription:
      "Buka dashboard workspace dan lihat kondisi kontrol keuangan.",
    uploadDescription:
      "Unggah dokumen untuk diproses melalui ingestion pipeline.",
    dashboard: "Dashboard Workspace",
    dashboardDescription:
      "Workspace siap. Kita mulai dari data yang benar-benar tersedia.",
    openWorkspace: "Buka Workspace",
    openUpload: "Unggah Data",
    askALI: "Tanya ALI",
    ocr: "OCR / Extraction",
    processing: "Memeriksa data",
    ready: "Siap"
  },

  en: {
    language: "Language",
    workspace: "Workspace",
    uploadData: "Upload Data",
    ingestion: "Ingestion",
    welcome: "I’m ready. What shall we work on this time?",
    workspaceDescription:
      "Open the workspace dashboard and review financial control status.",
    uploadDescription:
      "Upload documents through the controlled ingestion pipeline.",
    dashboard: "Workspace Dashboard",
    dashboardDescription:
      "Your workspace is ready. Let’s start with the data that actually exists.",
    openWorkspace: "Open Workspace",
    openUpload: "Upload Data",
    askALI: "Ask ALI",
    ocr: "OCR / Extraction",
    processing: "Checking data",
    ready: "Ready"
  }
};

function getSPECIALALILanguage() {
  return (
    localStorage.getItem(SPECIAL_ALI_LANGUAGE_KEY) ||
    "id"
  );
}

function setSPECIALALILanguage(language) {
  const nextLanguage =
    language === "en" ? "en" : "id";

  localStorage.setItem(
    SPECIAL_ALI_LANGUAGE_KEY,
    nextLanguage
  );

  document.documentElement.lang =
    nextLanguage === "en" ? "en" : "id";

  applySPECIALALITranslations();
  renderSPECIALALIQuickActions();
}

function tSPECIALALI(key) {
  const language =
    getSPECIALALILanguage();

  return (
    SPECIAL_ALI_I18N[language]?.[key] ||
    SPECIAL_ALI_I18N.en[key] ||
    key
  );
}

function applySPECIALALITranslations() {
  const languageButton =
    document.querySelector(
      "#specialAliLanguageToggle"
    );

  if (languageButton) {
    languageButton.textContent =
      getSPECIALALILanguage() === "id"
        ? "ID / EN"
        : "EN / ID";
  }

  const workspaceButtons =
    document.querySelectorAll(
      "[data-special-ali-label='workspace']"
    );

  workspaceButtons.forEach(
    button => {
      button.textContent =
        tSPECIALALI("workspace");
    }
  );

  const uploadButtons =
    document.querySelectorAll(
      "[data-special-ali-label='upload']"
    );

  uploadButtons.forEach(
    button => {
      button.textContent =
        tSPECIALALI("uploadData");
    }
  );
}

function toggleSPECIALALILanguage() {
  const nextLanguage =
    getSPECIALALILanguage() === "id"
      ? "en"
      : "id";

  setSPECIALALILanguage(
    nextLanguage
  );

  showToast(
    nextLanguage === "id"
      ? "Bahasa Indonesia aktif."
      : "English language active.",
    "success"
  );
}

function createSPECIALALIButton(
  label,
  route,
  type,
  icon
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className =
    type === "primary"
      ? "btn btn-green"
      : "btn btn-soft";

  button.dataset.specialAliLabel =
    route === "workspace"
      ? "workspace"
      : "upload";

  button.innerHTML = `
    <span
      aria-hidden="true"
      style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:16px;
        height:16px;
        margin-right:6px;
        font-size:14px;
        line-height:1;
      "
    >${icon}</span>
    <span class="special-ali-button-text">
      ${escapeHTML(label)}
    </span>
  `;

  button.addEventListener(
    "click",
    async () => {
      await navigate(route);
    }
  );

  return button;
}

function renderSPECIALALIQuickActions() {
  const appView =
    document.querySelector("#appView");

  if (
    !appView ||
    appView.classList.contains("hidden")
  ) {
    return;
  }

  let actionBar =
    document.querySelector(
      "#specialAliQuickActions"
    );

  if (!actionBar) {
    actionBar =
      document.createElement("div");

    actionBar.id =
      "specialAliQuickActions";

    actionBar.style.cssText = `
      display:flex;
      align-items:center;
      justify-content:flex-start;
      flex-wrap:wrap;
      gap:10px;
      margin:0 0 24px;
    `;

    const content =
      document.querySelector("#content");

    if (content) {
      content.prepend(actionBar);
    }
  }

  actionBar.innerHTML = "";

  const workspaceButton =
    createSPECIALALIButton(
      tSPECIALALI("workspace"),
      "workspace",
      "soft",
      "▦"
    );

  const uploadButton =
    createSPECIALALIButton(
      tSPECIALALI("uploadData"),
      "ingestion",
      "primary",
      "↑"
    );

  actionBar.appendChild(
    workspaceButton
  );

  actionBar.appendChild(
    uploadButton
  );

  applySPECIALALITranslations();
}

function renderSPECIALALIWelcome() {
  if (!state.user) {
    return;
  }

  const welcome =
    tSPECIALALI("welcome");

  typeALI(
    welcome,
    "POST_SIGN_IN"
  );

  const existing =
    document.querySelector(
      "#specialAliWelcome"
    );

  if (existing) {
    existing.remove();
  }

  const content =
    document.querySelector("#content");

  if (!content) {
    return;
  }

  const welcomeBox =
    document.createElement("section");

  welcomeBox.id =
    "specialAliWelcome";

  welcomeBox.className =
    "card page-card";

  welcomeBox.style.cssText = `
    margin-bottom:20px;
    border-left:4px solid var(--green, #19a463);
  `;

  welcomeBox.innerHTML = `
    <div class="eyebrow">
      ALI
    </div>

    <div
      class="card-title"
      style="margin-top:8px"
    >
      ${escapeHTML(welcome)}
    </div>

    <div
      class="card-copy"
      style="margin-top:8px"
    >
      ${escapeHTML(
        getSPECIALALILanguage() === "id"
          ? "Pilih Workspace untuk membuka dashboard atau Unggah Data untuk memulai ingestion."
          : "Choose Workspace to open the dashboard or Upload Data to start ingestion."
      )}
    </div>
  `;

  content.prepend(welcomeBox);
}

function ensureSPECIALALIRecoveryUI() {
  document.documentElement.lang =
    getSPECIALALILanguage() === "id"
      ? "id"
      : "en";

  renderSPECIALALIQuickActions();
  renderSPECIALALIWelcome();

  const languageToggle =
    document.querySelector(
      "#specialAliLanguageToggle"
    );

  if (!languageToggle) {
    const topbarRight =
      document.querySelector(
        ".topbar-right"
      );

    if (topbarRight) {
      const button =
        document.createElement("button");

      button.id =
        "specialAliLanguageToggle";

      button.type = "button";
      button.className =
        "btn btn-soft";

      button.style.cssText = `
        padding:8px 12px;
        font-size:11px;
        white-space:nowrap;
      `;

      button.addEventListener(
        "click",
        toggleSPECIALALILanguage
      );

      topbarRight.prepend(button);
    }
  }

  applySPECIALALITranslations();
}

/* Re-run the recovery UI whenever the app opens */
const specialAliOriginalShowApp =
  showApp;

showApp = function() {
  specialAliOriginalShowApp();

  setTimeout(
    () => {
      ensureSPECIALALIRecoveryUI();
    },
    0
  );
};

/* Re-run after every route render */
const specialAliOriginalNavigate =
  navigate;

navigate = async function(route) {
  const result =
    await specialAliOriginalNavigate(
      route
    );

  setTimeout(
    () => {
      renderSPECIALALIQuickActions();

      if (route === "ali") {
        renderSPECIALALIWelcome();
      }
    },
    0
  );

  return result;
};

/* OCR icon protection */
(function protectSPECIALALIOCRIcon() {
  const style =
    document.createElement("style");

  style.id =
    "specialAliOcrIconProtection";

  style.textContent = `
    .ocr-icon,
    [data-route="ocr"] .nav-icon,
    [data-route="ocr"] svg,
    [data-route="ocr"] img {
      width:18px !important;
      height:18px !important;
      max-width:18px !important;
      max-height:18px !important;
      min-width:18px !important;
      min-height:18px !important;
      flex:0 0 18px !important;
      object-fit:contain !important;
      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;
      overflow:hidden !important;
    }

    [data-route="ocr"] {
      min-width:0 !important;
    }

    [data-route="ocr"] .nav-text {
      min-width:0 !important;
      overflow:hidden !important;
      text-overflow:ellipsis !important;
    }
  `;

  document.head.appendChild(style);
})();

/* ============================================================
   SECURITY / UI BOUNDARY NOTE

   NEVER PUT:

   - service_role key
   - database password
   - private API secret
   - OpenAI private server key
   - OCR provider secret

   INTO THIS FILE.

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
