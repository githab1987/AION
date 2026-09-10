/* =========================================================
   SPECIAL ALI
   Frontend Application Layer
   =========================================================

   IMPORTANT:

   This frontend is NOT the authoritative engine.

   Authoritative state must eventually come from:

   UI
      ↓
   API
      ↓
   Command Gateway
      ↓
   Orchestrator
      ↓
   Core Execution Bus
      ↓
   Core Engines
      ↓
   Validation
      ↓
   Proof
      ↓
   Human Gate
      ↓
   Audit

   The demo state below exists only to make the UI navigable
   before the backend is connected.
   ========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

let supabaseClient = null;

if (
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  window.supabase
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {
  route: "command",

  previousRoute: "command",

  authMode: "signin",

  authenticated: false,

  user: {
    id: null,
    name: "User",
    email: ""
  },

  workspace: {
    id: null,
    name: "My Workspace",
    status: "EMPTY"
  },

  data: {
    files: [],
    processing: false,
    processed: false
  },

  ui: {
    sidebarOpen: false
  }
};


/* =========================================================
   ROUTE DEFINITIONS
   ========================================================= */

const routes = {

  command: {
    title: "ALI Personal Command Center",
    eyebrow: "ALI",
    description:
      "Your financial control workspace."
  },

  work: {
    title: "Work",
    eyebrow: "WORK",
    description:
      "Investigations, reconciliations, findings, exceptions and unresolved cases."
  },

  investigation: {
    title: "Investigation",
    eyebrow: "WORK",
    description:
      "Investigate observations, hypotheses, evidence and conclusions."
  },

  reconciliation: {
    title: "Reconciliation",
    eyebrow: "WORK",
    description:
      "Compare financial records and control differences without silently upgrading uncertainty."
  },

  findings: {
    title: "Findings",
    eyebrow: "WORK",
    description:
      "Control findings and their evidence-backed lifecycle."
  },

  exceptions: {
    title: "Exceptions",
    eyebrow: "WORK",
    description:
      "Items requiring review, repair, clarification or authorization."
  },

  unresolved: {
    title: "Unresolved",
    eyebrow: "WORK",
    description:
      "Cases that cannot yet be considered resolved."
  },

  tasks: {
    title: "Tasks",
    eyebrow: "ALI",
    description:
      "Work assigned, proposed or waiting for execution."
  },

  action: {
    title: "Action Center",
    eyebrow: "ALI",
    description:
      "The things currently requiring attention."
  },

  activity: {
    title: "Activity",
    eyebrow: "ALI",
    description:
      "Recent activity across your workspace."
  },

  accounting: {
    title: "Accounting Overview",
    eyebrow: "ACCOUNTING",
    description:
      "Financial accounting control overview."
  },

  transactions: {
    title: "Transactions",
    eyebrow: "ACCOUNTING",
    description:
      "Validated financial transactions."
  },

  journal: {
    title: "Journal",
    eyebrow: "ACCOUNTING",
    description:
      "Journal entries and controlled posting proposals."
  },

  ledger: {
    title: "Ledger",
    eyebrow: "ACCOUNTING",
    description:
      "Ledger activity and account movement."
  },

  accounts: {
    title: "Accounts",
    eyebrow: "ACCOUNTING",
    description:
      "Chart of accounts and accounting structure."
  },

  receivables: {
    title: "Receivables",
    eyebrow: "ACCOUNTING",
    description:
      "Accounts receivable control."
  },

  payables: {
    title: "Payables",
    eyebrow: "ACCOUNTING",
    description:
      "Accounts payable control."
  },

  inventory: {
    title: "Inventory",
    eyebrow: "ACCOUNTING",
    description:
      "Inventory movements and supporting evidence."
  },

  "fixed-assets": {
    title: "Fixed Assets",
    eyebrow: "ACCOUNTING",
    description:
      "Fixed asset records, movements and depreciation."
  },

  adjustments: {
    title: "Adjustments",
    eyebrow: "ACCOUNTING",
    description:
      "Controlled accounting adjustment proposals."
  },

  close: {
    title: "Period Close",
    eyebrow: "ACCOUNTING",
    description:
      "Living month-end and period-close controls."
  },

  "financial-reports": {
    title: "Financial Reports",
    eyebrow: "ACCOUNTING",
    description:
      "Validated financial reporting outputs."
  },

  tax: {
    title: "Tax Overview",
    eyebrow: "TAX",
    description:
      "Tax control overview."
  },

  "tax-data": {
    title: "Tax Data",
    eyebrow: "TAX",
    description:
      "Tax-relevant validated source data."
  },

  "tax-calculations": {
    title: "Tax Calculations",
    eyebrow: "TAX",
    description:
      "Rule-driven tax calculations with traceability."
  },

  "tax-reconciliation": {
    title: "Tax Reconciliation",
    eyebrow: "TAX",
    description:
      "Tax reconciliation and differences."
  },

  "tax-rules": {
    title: "Tax Rules",
    eyebrow: "TAX",
    description:
      "Registered and versioned tax rules."
  },

  "tax-issues": {
    title: "Tax Issues",
    eyebrow: "TAX",
    description:
      "Tax cases requiring attention."
  },

  "tax-reports": {
    title: "Tax Reports / Export",
    eyebrow: "TAX",
    description:
      "Tax working papers, reports and structured exports."
  },

  data: {
    title: "Data Center",
    eyebrow: "DATA CENTER",
    description:
      "Sources, documents, ingestion, extraction and validation."
  },

  sources: {
    title: "Sources",
    eyebrow: "DATA CENTER",
    description:
      "Registered data sources and provenance."
  },

  documents: {
    title: "Documents",
    eyebrow: "DATA CENTER",
    description:
      "Uploaded and registered documents."
  },

  upload: {
    title: "Upload Data",
    eyebrow: "DATA CENTER",
    description:
      "Upload files directly from your computer or device."
  },

  ocr: {
    title: "OCR / Extraction",
    eyebrow: "DATA CENTER",
    description:
      "Extraction status for documents and scanned data."
  },

  validation: {
    title: "Data Validation",
    eyebrow: "DATA CENTER",
    description:
      "Validate extracted data before it enters controlled processing."
  },

  duplicates: {
    title: "Duplicates",
    eyebrow: "DATA CENTER",
    description:
      "Duplicate detection and review."
  },

  evidence: {
    title: "Evidence Registry",
    eyebrow: "EVIDENCE",
    description:
      "Registered evidence and provenance."
  },

  proof: {
    title: "Proof",
    eyebrow: "EVIDENCE",
    description:
      "Proof objects and deterministic result support."
  },

  conflicts: {
    title: "Conflicts",
    eyebrow: "EVIDENCE",
    description:
      "Conflicting evidence and unresolved contradictions."
  },

  approvals: {
    title: "Pending Approval",
    eyebrow: "HUMAN GATE",
    description:
      "Actions waiting for authorized human decisions."
  },

  decisions: {
    title: "Decisions",
    eyebrow: "HUMAN GATE",
    description:
      "Human decisions affecting controlled workflow."
  },

  "decision-history": {
    title: "Decision History",
    eyebrow: "HUMAN GATE",
    description:
      "Historical human gate decisions."
  },

  "control-report": {
    title: "Control Report",
    eyebrow: "REPORTS",
    description:
      "Financial control reporting."
  },

  "accounting-report": {
    title: "Accounting Report",
    eyebrow: "REPORTS",
    description:
      "Accounting reporting outputs."
  },

  "tax-report": {
    title: "Tax Report",
    eyebrow: "REPORTS",
    description:
      "Tax reporting outputs."
  },

  "audit-report": {
    title: "Audit Report",
    eyebrow: "REPORTS",
    description:
      "Audit-ready control reporting."
  },

  "execution-log": {
    title: "Execution Log",
    eyebrow: "AUDIT",
    description:
      "Execution lifecycle and execution steps."
  },

  "event-log": {
    title: "Event Log",
    eyebrow: "AUDIT",
    description:
      "Immutable application events."
  },

  "audit-trail": {
    title: "Audit Trail",
    eyebrow: "AUDIT",
    description:
      "End-to-end trace of controlled activity."
  },

  account: {
    title: "Account",
    eyebrow: "SETTINGS",
    description:
      "Identity, authentication and account information."
  },

  "workspace-settings": {
    title: "Workspace",
    eyebrow: "SETTINGS",
    description:
      "Workspace configuration."
  },

  members: {
    title: "Members & Roles",
    eyebrow: "SETTINGS",
    description:
      "Workspace members, roles and permissions."
  },

  integrations: {
    title: "Integrations",
    eyebrow: "SETTINGS",
    description:
      "Optional authorized external sources."
  },

  preferences: {
    title: "Preferences",
    eyebrow: "SETTINGS",
    description:
      "Language, timezone, notifications and ALI communication."
  }
};


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setupUploadDropzone();

  await restoreSession();

  showLanding();

});


/* =========================================================
   LANDING / LEARN
   ========================================================= */

function showLanding() {

  document
    .getElementById("landingPage")
    .classList.remove("hidden");

  document
    .getElementById("learnPage")
    .classList.add("hidden");

  document
    .getElementById("appPage")
    .classList.add("hidden");
}


function showLearnMore() {

  document
    .getElementById("landingPage")
    .classList.add("hidden");

  document
    .getElementById("learnPage")
    .classList.remove("hidden");

  document
    .getElementById("appPage")
    .classList.add("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   AUTH
   ========================================================= */

function openAuth(mode = "signin") {

  state.authMode = mode;

  updateAuthModal();

  document
    .getElementById("authModal")
    .classList.remove("hidden");
}


function closeAuth() {

  document
    .getElementById("authModal")
    .classList.add("hidden");
}


function toggleAuthMode() {

  state.authMode =
    state.authMode === "signin"
      ? "signup"
      : "signin";

  updateAuthModal();
}


function updateAuthModal() {

  const signup =
    state.authMode === "signup";

  document.getElementById("authTitle").textContent =
    signup
      ? "Create your account"
      : "Sign in";

  document.getElementById("authSubtitle").textContent =
    signup
      ? "Create your workspace and give ALI something to work with."
      : "Welcome back. Your workspace is waiting.";

  document
    .getElementById("nameGroup")
    .classList.toggle("hidden", !signup);

  document.getElementById("authSubmit").textContent =
    signup
      ? "Create Account"
      : "Sign In";

  document.getElementById("authSwitchText").textContent =
    signup
      ? "Already have an account?"
      : "Don't have an account?";

  document.getElementById("authSwitchButton").textContent =
    signup
      ? "Sign In"
      : "Create Account";
}


async function handleAuth(event) {

  event.preventDefault();

  const email =
    document.getElementById("authEmail").value.trim();

  const password =
    document.getElementById("authPassword").value;

  const name =
    document.getElementById("authName").value.trim();

  if (!email || !password) {
    showToast("Email and password are required.");
    return;
  }


  /*
    Real Supabase authentication.
  */

  if (supabaseClient) {

    try {

      let result;

      if (state.authMode === "signup") {

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

      state.authenticated = true;

      state.user.email = email;

      state.user.name =
        name ||
        result.data.user?.user_metadata?.full_name ||
        email.split("@")[0];

      closeAuth();

      enterApplication();

      showToast(
        state.authMode === "signup"
          ? "Account created."
          : "Welcome back."
      );

      return;

    } catch (error) {

      console.error(error);

      showToast(
        error.message ||
        "Authentication failed."
      );

      return;
    }
  }


  /*
    Demo fallback.

    This exists only when Supabase credentials are not configured.
  */

  state.authenticated = true;

  state.user.email = email;

  state.user.name =
    name ||
    email.split("@")[0];

  closeAuth();

  enterApplication();

  showToast(
    "Demo mode — connect Supabase for real authentication."
  );
}


async function restoreSession() {

  if (!supabaseClient) {
    return;
  }

  try {

    const {
      data
    } = await supabaseClient.auth.getSession();

    if (data.session?.user) {

      state.authenticated = true;

      state.user.id =
        data.session.user.id;

      state.user.email =
        data.session.user.email || "";

      state.user.name =
        data.session.user.user_metadata?.full_name ||
        data.session.user.email?.split("@")[0] ||
        "User";
    }

  } catch (error) {

    console.error(
      "Session restore failed:",
      error
    );
  }
}


/* =========================================================
   APPLICATION ENTRY
   ========================================================= */

function enterApplication() {

  document
    .getElementById("landingPage")
    .classList.add("hidden");

  document
    .getElementById("learnPage")
    .classList.add("hidden");

  document
    .getElementById("appPage")
    .classList.remove("hidden");

  document.getElementById("userNameTop").textContent =
    state.user.name || "Account";

  navigate("command");
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  if (supabaseClient) {

    try {
      await supabaseClient.auth.signOut();
    } catch (error) {
      console.error(error);
    }
  }

  state.authenticated = false;

  state.user = {
    id: null,
    name: "User",
    email: ""
  };

  state.workspace = {
    id: null,
    name: "My Workspace",
    status: "EMPTY"
  };

  state.data = {
    files: [],
    processing: false,
    processed: false
  };

  showLanding();

  showToast("Signed out.");
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function navigate(route) {

  if (!routes[route]) {
    console.warn("Unknown route:", route);
    route = "command";
  }

  state.previousRoute =
    state.route;

  state.route =
    route;

  closeMobileSidebar();

  renderRoute();
}


function goBackToWork() {

  /*
    IMPORTANT:
    Findings
    Reconciliation
    Unresolved
    Investigation
    Exceptions

    all return to Work.

    Work itself is the ALI Personal Command Center / Work.
  */

  navigate("work");
}


function renderRoute() {

  const container =
    document.getElementById("workspaceContent");

  if (!container) return;

  updateActiveNavigation();

  switch (state.route) {

    case "command":
      renderCommandCenter(container);
      break;

    case "work":
      renderWork(container);
      break;

    case "investigation":
      renderSimpleWorkPage(
        container,
        "Investigation",
        "Investigate observations, hypotheses, tests and evidence.",
        "investigation"
      );
      break;

    case "reconciliation":
      renderReconciliation(container);
      break;

    case "findings":
      renderFindings(container);
      break;

    case "exceptions":
      renderSimpleWorkPage(
        container,
        "Exceptions",
        "Items requiring review, repair or clarification.",
        "exceptions"
      );
      break;

    case "unresolved":
      renderUnresolved(container);
      break;

    case "upload":
      renderUploadPage(container);
      break;

    case "ocr":
      renderOCRPage(container);
      break;

    case "data":
      renderDataCenter(container);
      break;

    default:
      renderGenericPage(
        container,
        state.route
      );
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function updateActiveNavigation() {

  document
    .querySelectorAll(".nav-item")
    .forEach(item => {

      item.classList.remove("active");

      if (
        item.dataset.route === state.route
      ) {
        item.classList.add("active");
      }
    });

  /*
    Work children visually belong to Work.
  */

  const workRoutes = [
    "work",
    "investigation",
    "reconciliation",
    "findings",
    "exceptions",
    "unresolved"
  ];

  if (workRoutes.includes(state.route)) {

    const workButton =
      document.querySelector(
        '[data-route="work"]'
      );

    if (workButton) {
      workButton.classList.add("active");
    }
  }
}


/* =========================================================
   COMMAND CENTER
   ========================================================= */

function renderCommandCenter(container) {

  const greeting =
    getDynamicGreeting();

  const message =
    getALIMessage();

  if (
    state.workspace.status === "EMPTY"
  ) {

    container.innerHTML = `

      <section class="ali-greeting">

        <div class="eyebrow">
          ALI PERSONAL COMMAND CENTER
        </div>

        <h1>
          ${escapeHTML(greeting)}
        </h1>

        <div class="ali-message">
          ${escapeHTML(message)}
          <span class="typing-cursor"></span>
        </div>

      </section>


      <section class="command-card">

        <div class="upload-symbol">
          ↑
        </div>

        <h2>
          Give ALI something to work with.
        </h2>

        <p>
          Upload financial documents directly from your
          computer or device. ALI will extract, classify,
          validate and register the data before it can be
          used by the control engine.
        </p>

        <div class="supported-types">
          PDF · EXCEL · CSV · IMAGES · DOCUMENTS · JSON · XML
        </div>

        <button
          class="btn btn-primary"
          onclick="openFilePicker()"
        >
          + Upload Your Data
        </button>

        <div class="ask-box">

          <input
            id="commandInput"
            class="input"
            placeholder="Or tell ALI what you need..."
            onkeydown="handleCommandKey(event)"
          />

          <button
            class="btn btn-secondary"
            onclick="askALI()"
          >
            Ask ALI
          </button>

        </div>

        <div class="empty-status">
          No data has been processed yet.
        </div>

      </section>
    `;

    revealALIMessage();

    return;
  }


  if (
    state.workspace.status === "PROCESSING"
  ) {

    renderProcessingCenter(container);

    return;
  }


  if (
    state.workspace.status === "READY"
  ) {

    renderActiveCommandCenter(container);

    return;
  }
}


/* =========================================================
   DYNAMIC ALI LANGUAGE
   ========================================================= */

function getDynamicGreeting() {

  const hour =
    new Date().getHours();

  const name =
    state.user.name &&
    state.user.name !== "User"
      ? `, ${state.user.name}`
      : "";

  if (hour < 11) {
    return `Good morning${name}.`;
  }

  if (hour < 17) {
    return `Good afternoon${name}.`;
  }

  return `Good evening${name}.`;
}


function getALIMessage() {

  if (
    state.workspace.status === "EMPTY"
  ) {
    return (
      "Your workspace is ready. " +
      "Upload your data and I’ll start by checking what it contains."
    );
  }

  if (
    state.workspace.status === "PROCESSING"
  ) {
    return (
      "I’ve received your files. " +
      "I’m checking what they contain before using them."
    );
  }

  return (
    "Your workspace is active. " +
    "Let’s see what needs your attention."
  );
}


function revealALIMessage() {

  /*
    Lightweight reveal effect.
    The real ALI conversation layer can later replace this.
  */

  const messageElement =
    document.querySelector(".ali-message");

  if (!messageElement) return;

  const original =
    messageElement.textContent.trim();

  messageElement.textContent = "";

  let index = 0;

  const cursor =
    document.createElement("span");

  cursor.className =
    "typing-cursor";

  const interval =
    setInterval(() => {

      if (index >= original.length) {

        clearInterval(interval);

        messageElement.appendChild(
          cursor
        );

        return;
      }

      messageElement.textContent +=
        original[index];

      index++;

    }, 14);
}


/* =========================================================
   ACTIVE COMMAND CENTER
   ========================================================= */

function renderActiveCommandCenter(container) {

  container.innerHTML = `

    <section class="ali-greeting">

      <div class="eyebrow">
        ALI PERSONAL COMMAND CENTER
      </div>

      <h1>
        Your workspace is active.
      </h1>

      <div class="ali-message">
        I’ve checked the incoming data.
        Here’s what currently needs your attention.
      </div>

    </section>


    <div class="grid grid-3">

      <div class="card">
        <div class="card-title">
          Documents Processed
        </div>

        <div class="metric">
          ${state.data.files.length}
        </div>

        <div class="card-subtitle">
          Registered through controlled ingestion.
        </div>
      </div>


      <div class="card">

        <div class="card-title">
          Data Health
        </div>

        <div class="metric">
          —
        </div>

        <div class="card-subtitle">
          Backend validation will provide the authoritative result.
        </div>

      </div>


      <div class="card">

        <div class="card-title">
          Unresolved
        </div>

        <div class="metric">
          —
        </div>

        <div class="card-subtitle">
          No unsupported zero-value assumption is displayed.
        </div>

      </div>

    </div>


    <div class="card mt-5">

      <div class="card-title">
        ALI Control Status
      </div>

      <div class="card-subtitle">
        The workspace is ready for investigation,
        reconciliation and controlled accounting/tax processing.
      </div>

      <div class="flex flex-wrap gap-2 mt-5">

        <span class="status status-valid">
          DATA AVAILABLE
        </span>

        <span class="status status-info">
          PROCESSING READY
        </span>

        <span class="status status-info">
          PROOF CONTROLLED
        </span>

      </div>

    </div>
  `;
}


/* =========================================================
   WORK
   ========================================================= */

function renderWork(container) {

  container.innerHTML = `

    <div class="page-header">

      <div class="eyebrow">
        ALI PERSONAL COMMAND CENTER
      </div>

      <h1 class="page-title">
        Work
      </h1>

      <p class="page-description">
        This is the operational work surface of SPECIAL ALI.
        Investigation, reconciliation, findings, exceptions
        and unresolved cases remain connected to evidence,
        validation and dependencies.
      </p>

    </div>


    <div class="grid grid-2">

      ${workCard(
        "⌕",
        "Investigation",
        "Observe, hypothesize, test and conclude.",
        "investigation"
      )}

      ${workCard(
        "⇄",
        "Reconciliation",
        "Compare records and identify controlled differences.",
        "reconciliation"
      )}

      ${workCard(
        "◇",
        "Findings",
        "Track evidence-backed findings.",
        "findings"
      )}

      ${workCard(
        "△",
        "Exceptions",
        "Review items requiring attention.",
        "exceptions"
      )}

      ${workCard(
        "?",
        "Unresolved",
        "Cases that cannot yet be considered resolved.",
        "unresolved"
      )}

    </div>
  `;
}


function workCard(
  icon,
  title,
  description,
  route
) {

  return `

    <button
      onclick="navigate('${route}')"
      class="card text-left hover:-translate-y-0.5 transition-all"
    >

      <div
        class="text-2xl"
        style="color:var(--navy)"
      >
        ${icon}
      </div>

      <div class="card-title mt-4">
        ${title}
      </div>

      <div class="card-subtitle">
        ${description}
      </div>

      <div
        class="mt-5 text-xs font-semibold"
        style="color:var(--navy)"
      >
        Open →
      </div>

    </button>
  `;
}


/* =========================================================
   WORK CHILD PAGES
   ========================================================= */

function workBackButton() {

  return `
    <button
      class="back-button"
      onclick="goBackToWork()"
    >
      ‹ Work
    </button>
  `;
}


function renderSimpleWorkPage(
  container,
  title,
  description,
  route
) {

  container.innerHTML = `

    <div class="page-header">

      ${workBackButton()}

      <div class="eyebrow">
        WORK
      </div>

      <h1 class="page-title">
        ${title}
      </h1>

      <p class="page-description">
        ${description}
      </p>

    </div>


    <div class="card">

      <div class="card-title">
        ${title} workspace
      </div>

      <div class="card-subtitle">
        The authoritative backend workflow will populate
        this surface from validated persisted state.
      </div>

      <div class="mt-5">
        <span class="status status-info">
          READY FOR BACKEND
        </span>
      </div>

    </div>
  `;
}


function renderReconciliation(container) {

  container.innerHTML = `

    <div class="page-header">

      ${workBackButton()}

      <div class="eyebrow">
        WORK
      </div>

      <h1 class="page-title">
        Reconciliation
      </h1>

      <p class="page-description">
        Reconciliation results are never silently upgraded
        from probable to confirmed without satisfying
        the required conditions.
      </p>

    </div>


    <div class="card">

      <div class="card-title">
        Reconciliation Status
      </div>

      <div class="card-subtitle">
        Backend results will expose match status such as
        EXACT, PROBABLE, PARTIAL, AMBIGUOUS, NO_MATCH
        or CONTRADICTED.
      </div>

      <div class="flex flex-wrap gap-2 mt-5">

        <span class="status status-info">
          EXACT
        </span>

        <span class="status status-warning">
          PROBABLE
        </span>

        <span class="status status-warning">
          AMBIGUOUS
        </span>

        <span class="status status-blocked">
          CONTRADICTED
        </span>

      </div>

    </div>
  `;
}


function renderFindings(container) {

  container.innerHTML = `

    <div class="page-header">

      ${workBackButton()}

      <div class="eyebrow">
        WORK
      </div>

      <h1 class="page-title">
        Findings
      </h1>

      <p class="page-description">
        Findings remain open until their evidence,
        validation and dependencies support a controlled
        conclusion.
      </p>

    </div>


    <div class="card">

      <div class="card-title">
        Finding Lifecycle
      </div>

      <div class="card-subtitle">
        OPEN → INVESTIGATING → BLOCKED / WAITING_USER
        → RESOLVED / REJECTED / INVALIDATED
      </div>

      <div class="mt-5">

        <span class="status status-info">
          NO FINDINGS LOADED
        </span>

      </div>

    </div>
  `;
}


function renderUnresolved(container) {

  container.innerHTML = `

    <div class="page-header">

      ${workBackButton()}

      <div class="eyebrow">
        WORK
      </div>

      <h1 class="page-title">
        Unresolved
      </h1>

      <p class="page-description">
        Unresolved cases remain visible until their blocking
        condition is repaired, evidence is established,
        or an authorized decision resolves the case.
      </p>

    </div>


    <div class="card">

      <div class="card-title">
        UNRESOLVED REGISTRY
      </div>

      <div class="card-subtitle">
        Unresolved cases cannot simply disappear from the system.
      </div>

      <div class="mt-5">
        <span class="status status-info">
          REGISTRY READY
        </span>
      </div>

    </div>
  `;
}


/* =========================================================
   UPLOAD
   ========================================================= */

function openFilePicker() {

  document
    .getElementById("fileInput")
    .click();
}


function handleFiles(fileList) {

  if (!fileList || !fileList.length) {
    return;
  }

  const files =
    Array.from(fileList);

  const supported =
    files.filter(isSupportedFile);

  const unsupported =
    files.filter(
      file => !isSupportedFile(file)
    );


  if (unsupported.length) {

    showToast(
      `${unsupported.length} unsupported file(s) skipped.`
    );
  }


  if (!supported.length) {
    return;
  }


  state.data.files.push(
    ...supported
  );

  state.data.processing = true;

  state.workspace.status =
    "PROCESSING";

  renderRoute();

  simulateIngestion(supported);
}


function isSupportedFile(file) {

  const allowed = [
    "pdf",
    "jpg",
    "jpeg",
    "png",
    "webp",
    "tiff",
    "bmp",
    "xlsx",
    "xls",
    "csv",
    "ods",
    "docx",
    "doc",
    "txt",
    "rtf",
    "md",
    "json",
    "xml"
  ];

  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();

  return allowed.includes(extension);
}


/* =========================================================
   DROPZONE
   ========================================================= */

function setupUploadDropzone() {

  document.addEventListener(
    "dragover",
    event => {

      const zone =
        event.target.closest(".upload-zone");

      if (!zone) return;

      event.preventDefault();

      zone.classList.add("dragover");
    }
  );


  document.addEventListener(
    "dragleave",
    event => {

      const zone =
        event.target.closest(".upload-zone");

      if (!zone) return;

      zone.classList.remove("dragover");
    }
  );


  document.addEventListener(
    "drop",
    event => {

      const zone =
        event.target.closest(".upload-zone");

      if (!zone) return;

      event.preventDefault();

      zone.classList.remove("dragover");

      handleFiles(
        event.dataTransfer.files
      );
    }
  );
}


/* =========================================================
   SIMULATED INGESTION
   ========================================================= */

function simulateIngestion(files) {

  /*
    DEMO ONLY.

    Production implementation must be:

    Upload
      ↓
    SHA-256
      ↓
    Source Registration
      ↓
    File Security Check
      ↓
    File Type Detection
      ↓
    Extraction Router
      ↓
    OCR / Parser
      ↓
    Classification
      ↓
    Structuring
      ↓
    Validation
      ↓
    Duplicate Detection
      ↓
    Evidence Registration
      ↓
    READY
  */

  let completed = 0;

  files.forEach((file, index) => {

    setTimeout(() => {

      completed++;

      const percentage =
        Math.round(
          (completed / files.length) * 100
        );

      if (percentage >= 100) {

        state.data.processing = false;

        state.data.processed = true;

        state.workspace.status =
          "READY";

        showToast(
          "Data ingestion completed."
        );

        renderRoute();
      }

    }, 800 + index * 500);

  });
}


/* =========================================================
   UPLOAD PAGE
   ========================================================= */

function renderUploadPage(container) {

  container.innerHTML = `

    <div class="page-header">

      <button
        class="back-button"
        onclick="navigate('data')"
      >
        ‹ Data Center
      </button>

      <div class="eyebrow">
        DATA CENTER
      </div>

      <h1 class="page-title">
        Upload Data
      </h1>

      <p class="page-description">
        Upload files directly from your computer or device.
        Gmail, Google Drive and URL sources are optional
        integrations and are not part of this upload action.
      </p>

    </div>


    <div
      class="upload-zone"
      onclick="openFilePicker()"
    >

      <div
        class="text-4xl"
        style="color:var(--navy)"
      >
        ↑
      </div>

      <h3>
        Upload your financial data
      </h3>

      <p>
        Click to choose files or drag them here.
      </p>

      <div class="supported-types mt-4">
        PDF · EXCEL · CSV · IMAGES · DOCUMENTS · JSON · XML
      </div>

    </div>


    <div class="file-list">

      ${
        state.data.files.length
          ? state.data.files
              .map(fileRow)
              .join("")
          : `
            <div class="card text-center">
              <div class="card-subtitle">
                No files uploaded yet.
              </div>
            </div>
          `
      }

    </div>

  `;
}


function fileRow(file, index) {

  return `

    <div class="file-row">

      <div class="min-w-0 flex-1">

        <div class="file-name">
          ${escapeHTML(file.name)}
        </div>

        <div class="text-[10px] text-slate-400 mt-1">
          ${formatBytes(file.size)}
        </div>

        <div class="file-progress">
          <span
            style="width:${
              state.workspace.status === "READY"
                ? "100%"
                : "72%"
            }"
          ></span>
        </div>

      </div>

      <span class="status ${
        state.workspace.status === "READY"
          ? "status-valid"
          : "status-info"
      }">

        ${
          state.workspace.status === "READY"
            ? "READY"
            : "PROCESSING"
        }

      </span>

    </div>
  `;
}


/* =========================================================
   OCR
   ========================================================= */

function renderOCRPage(container) {

  container.innerHTML = `

    <div class="page-header">

      <button
        class="back-button"
        onclick="navigate('data')"
      >
        ‹ Data Center
      </button>

      <div class="eyebrow">
        DATA CENTER
      </div>

      <h1 class="page-title">
        OCR / Extraction
      </h1>

      <p class="page-description">
        OCR is part of the Data Ingestion Engine.
        Extracted values are not authoritative until validated.
      </p>

    </div>


    <div class="card">

      <div class="card-title">
        Extraction Pipeline
      </div>

      <div class="card-subtitle">
        File → Detection → Extraction / OCR → Classification
        → Structuring → Validation → Evidence
      </div>

      <div class="grid grid-2 mt-6">

        ${pipelineStep(
          "01",
          "File Detection",
          "Identify format and processing route."
        )}

        ${pipelineStep(
          "02",
          "OCR / Extraction",
          "Extract text, tables and document fields."
        )}

        ${pipelineStep(
          "03",
          "Structuring",
          "Convert extracted content into controlled fields."
        )}

        ${pipelineStep(
          "04",
          "Validation",
          "Check extracted data before registration."
        )}

      </div>

    </div>
  `;
}


function pipelineStep(
  number,
  title,
  description
) {

  return `

    <div class="border border-slate-200 rounded-xl p-4">

      <div class="mono text-xs text-slate-400">
        ${number}
      </div>

      <div class="font-semibold text-sm mt-2"
           style="color:var(--navy)">
        ${title}
      </div>

      <div class="text-xs text-slate-500 mt-1 leading-5">
        ${description}
      </div>

    </div>
  `;
}


/* =========================================================
   DATA CENTER
   ========================================================= */

function renderDataCenter(container) {

  container.innerHTML = `

    <div class="page-header">

      <div class="eyebrow">
        DATA CENTER
      </div>

      <h1 class="page-title">
        Data Center
      </h1>

      <p class="page-description">
        The controlled entry point for sources, documents,
        ingestion, OCR, extraction and validation.
      </p>

    </div>


    <div class="grid grid-3">

      ${dataCard(
        "↑",
        "Upload",
        "Upload files from your computer or device.",
        "upload"
      )}

      ${dataCard(
        "⌗",
        "OCR / Extraction",
        "Review extraction and OCR processing.",
        "ocr"
      )}

      ${dataCard(
        "✓",
        "Validation",
        "Review data validation.",
        "validation"
      )}

    </div>


    <div class="card mt-5">

      <div class="card-title">
        Optional Sources
      </div>

      <div class="card-subtitle">
        Gmail, Google Drive and URL sources belong here as
        authorized integrations. They do not replace local upload.
      </div>

      <button
        class="btn btn-secondary mt-5"
        onclick="navigate('integrations')"
      >
        Manage Integrations
      </button>

    </div>
  `;
}


function dataCard(
  icon,
  title,
  description,
  route
) {

  return `

    <button
      class="card text-left hover:-translate-y-0.5 transition-all"
      onclick="navigate('${route}')"
    >

      <div
        class="text-2xl"
        style="color:var(--navy)"
      >
        ${icon}
      </div>

      <div class="card-title mt-4">
        ${title}
      </div>

      <div class="card-subtitle">
        ${description}
      </div>

      <div
        class="text-xs font-semibold mt-5"
        style="color:var(--navy)"
      >
        Open →
      </div>

    </button>
  `;
}


/* =========================================================
   PROCESSING CENTER
   ========================================================= */

function renderProcessingCenter(container) {

  container.innerHTML = `

    <section class="ali-greeting">

      <div class="eyebrow">
        ALI PERSONAL COMMAND CENTER
      </div>

      <h1>
        I’m checking your data.
      </h1>

      <div class="ali-message">
        I received the files. I’m extracting and validating
        them before allowing downstream processing.
      </div>

    </section>


    <div class="card">

      <div class="card-title">
        Ingestion Pipeline
      </div>

      <div class="card-subtitle">
        Upload → Extract / OCR → Classify → Validate
        → Duplicate Check → Evidence
      </div>

      <div class="mt-6">

        ${state.data.files
          .map(fileRow)
          .join("")
        }

      </div>

    </div>
  `;
}


/* =========================================================
   GENERIC PAGES
   ========================================================= */

function renderGenericPage(
  container,
  route
) {

  const config =
    routes[route] || {
      title: route,
      eyebrow: "SPECIAL ALI",
      description: ""
    };


  container.innerHTML = `

    <div class="page-header">

      ${
        state.previousRoute &&
        state.previousRoute !== route
          ? `
            <button
              class="back-button"
              onclick="navigate('${safeBackRoute(route)}')"
            >
              ‹ Back
            </button>
          `
          : ""
      }

      <div class="eyebrow">
        ${config.eyebrow}
      </div>

      <h1 class="page-title">
        ${config.title}
      </h1>

      <p class="page-description">
        ${config.description}
      </p>

    </div>


    <div class="card">

      <div class="card-title">
        ${config.title}
      </div>

      <div class="card-subtitle">
        This interface is ready for the authoritative
        SPECIAL ALI backend service.
      </div>

      <div class="mt-5">

        <span class="status status-info">
          BACKEND CONTROLLED
        </span>

      </div>

    </div>
  `;
}


function safeBackRoute(route) {

  if (
    [
      "investigation",
      "reconciliation",
      "findings",
      "exceptions",
      "unresolved"
    ].includes(route)
  ) {
    return "work";
  }

  return "command";
}


/* =========================================================
   ALI COMMAND INPUT
   ========================================================= */

function handleCommandKey(event) {

  if (
    event.key === "Enter"
  ) {
    askALI();
  }
}


function askALI() {

  const input =
    document.getElementById("commandInput");

  if (!input) return;

  const query =
    input.value.trim();

  if (!query) {
    showToast(
      "Tell ALI what you want to investigate."
    );
    return;
  }

  /*
    Production:

    POST /api/v1/agent/messages

    {
      session_id,
      message,
      workspace_id
    }

    The LLM may interpret and plan.
    It must not directly mutate authoritative state.
  */

  showToast(
    "ALI received your request. Backend agent execution is next."
  );

  input.value = "";
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function toggleSidebar() {

  const sidebar =
    document.getElementById("sidebar");

  state.ui.sidebarOpen =
    !state.ui.sidebarOpen;

  sidebar.classList.toggle(
    "open",
    state.ui.sidebarOpen
  );
}


function closeMobileSidebar() {

  const sidebar =
    document.getElementById("sidebar");

  state.ui.sidebarOpen = false;

  if (sidebar) {
    sidebar.classList.remove("open");
  }
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;


function showToast(message) {

  const toast =
    document.getElementById("toast");

  const text =
    document.getElementById("toastText");

  if (!toast || !text) return;

  text.textContent =
    message;

  toast.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer =
    setTimeout(() => {

      toast.classList.add("hidden");

    }, 3200);
}


/* =========================================================
   UTILITIES
   ========================================================= */

function formatBytes(bytes) {

  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    parseFloat(
      (
        bytes /
        Math.pow(1024, index)
      ).toFixed(1)
    ) +
    " " +
    units[index]
  );
}


function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   DEVELOPMENT HELPERS
   ========================================================= */

/*
   Browser console helpers:

   navigate("work")
   navigate("findings")
   navigate("reconciliation")
   navigate("unresolved")
   navigate("upload")
   navigate("ocr")

   openAuth("signin")
   openAuth("signup")
*/


/* =========================================================
   FUTURE BACKEND API CONTRACT PLACEHOLDERS
   ========================================================= */

/*
   These are intentionally not executed yet.

   They document the boundary between UI and engine.

   ---------------------------------------------------------

   POST /api/v1/agent/sessions

   POST /api/v1/agent/messages

   GET /api/v1/agent/executions/:id

   POST /api/v1/agent/executions/:id/approve

   POST /api/v1/agent/executions/:id/cancel

   ---------------------------------------------------------

   POST /api/v1/data/sources

   POST /api/v1/data/uploads

   POST /api/v1/data/ingestion

   GET /api/v1/data/ingestion/:id

   ---------------------------------------------------------

   GET /api/v1/findings

   GET /api/v1/reconciliations

   GET /api/v1/unresolved

   ---------------------------------------------------------

   POST /api/v1/accounting/journal/proposals

   POST /api/v1/accounting/journal/:id/approve

   ---------------------------------------------------------

   POST /api/v1/tax/calculations

   GET /api/v1/tax/rules

   ---------------------------------------------------------

   GET /api/v1/proofs/:id

   GET /api/v1/audit/executions/:id

   ---------------------------------------------------------

   IMPORTANT:

   UI must never assume:

   "button clicked = state changed"

   Backend must return authoritative state.

   Example:

   UI action
      ↓
   API
      ↓
   authorization
      ↓
   validation
      ↓
   lock
      ↓
   read/version verification
      ↓
   apply
      ↓
   validate
      ↓
   commit
      ↓
   audit event
      ↓
   authoritative response
      ↓
   UI
*/


/* =========================================================
   END
   ========================================================= */
