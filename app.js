/* =========================================================
   SPECIAL ALI
   Financial Control Operating System

   Frontend prototype
   ---------------------------------------------------------
   IMPORTANT:
   - UI is NOT authoritative.
   - Demo state is local only.
   - Real state mutations must eventually go through
     authenticated backend APIs / Supabase Edge Functions.
========================================================= */

"use strict";

/* =========================================================
   APPLICATION STATE
========================================================= */

const state = {
  route: "home",

  user: {
    name: "",
    email: "",
    role: "",
    workspace: ""
  },

  workspaceState: "NEW",

  data: {
    documents: 0,
    processed: 0,
    review: 0,
    unsupported: 0,
    duplicates: 0,
    transactions: 0
  },

  processing: {
    running: false,
    progress: 0,
    stage: ""
  },

  activeParent: null,

  greeting: null
};


/* =========================================================
   NAVIGATION CONFIGURATION
========================================================= */

const NAVIGATION = [
  {
    section: "ALI",
    items: [
      ["command", "⌘", "Command Center"],
      ["ask", "A", "Ask ALI"],
      ["tasks", "T", "Tasks"],
      ["action", "!", "Action Center"],
      ["activity", "◷", "Activity"]
    ]
  },

  {
    section: "WORK",
    items: [
      ["investigation", "◎", "Investigation"],
      ["reconciliation", "≋", "Reconciliation"],
      ["findings", "!", "Findings"],
      ["exceptions", "△", "Exceptions"],
      ["unresolved", "?", "Unresolved"]
    ]
  },

  {
    section: "ACCOUNTING",
    items: [
      ["accounting", "A", "Overview"],
      ["transactions", "T", "Transactions"],
      ["journal", "J", "Journal"],
      ["ledger", "L", "Ledger"],
      ["accounts", "AC", "Accounts"],
      ["receivables", "AR", "Receivables"],
      ["payables", "AP", "Payables"],
      ["inventory", "I", "Inventory"],
      ["assets", "FA", "Fixed Assets"],
      ["adjustments", "AD", "Adjustments"],
      ["close", "PC", "Period Close"],
      ["financial-reports", "R", "Financial Reports"]
    ]
  },

  {
    section: "TAX",
    items: [
      ["tax", "T", "Tax Overview"],
      ["tax-data", "D", "Tax Data"],
      ["tax-calculations", "C", "Tax Calculations"],
      ["tax-reconciliation", "≋", "Tax Reconciliation"],
      ["tax-rules", "R", "Tax Rules"],
      ["tax-issues", "!", "Tax Issues"],
      ["tax-reports", "E", "Tax Reports / Export"]
    ]
  },

  {
    section: "DATA CENTER",
    items: [
      ["data-center", "D", "Overview"],
      ["sources", "S", "Sources"],
      ["documents", "▤", "Documents"],
      ["ingestion", "↓", "Ingestion"],
      ["validation", "✓", "Data Validation"],
      ["health", "♥", "Data Health"],
      ["duplicates", "=", "Duplicates"]
    ]
  },

  {
    section: "EVIDENCE",
    items: [
      ["evidence", "E", "Evidence Registry"],
      ["proof", "P", "Proof"],
      ["conflicts", "!", "Conflicts"]
    ]
  },

  {
    section: "HUMAN GATE",
    items: [
      ["human-gate", "H", "Pending Approval"],
      ["decisions", "D", "Decisions"],
      ["decision-history", "◷", "Decision History"]
    ]
  },

  {
    section: "REPORTS",
    items: [
      ["control-report", "C", "Control Report"],
      ["accounting-report", "A", "Accounting Report"],
      ["tax-report", "T", "Tax Report"],
      ["audit-report", "R", "Audit Report"]
    ]
  },

  {
    section: "AUDIT",
    items: [
      ["execution-log", "E", "Execution Log"],
      ["event-log", "◷", "Event Log"],
      ["audit-trail", "A", "Audit Trail"]
    ]
  },

  {
    section: "SETTINGS",
    items: [
      ["account", "P", "Account"],
      ["workspace", "W", "Workspace"],
      ["members", "M", "Members & Roles"],
      ["permissions", "P", "Permissions"],
      ["accounting-settings", "A", "Accounting"],
      ["tax-settings", "T", "Tax"],
      ["integrations", "I", "Integrations"],
      ["preferences", "⚙", "Preferences"]
    ]
  }
];


/* =========================================================
   UTILITIES
========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  if (!name) return "A";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* =========================================================
   TIME-AWARE ALI GREETING
========================================================= */

function getTimePeriod() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";

  return "late";
}

function buildGreeting() {
  const name = state.user.name || "there";
  const period = getTimePeriod();

  /*
    Greeting intentionally changes depending on context.

    It does NOT always say "Good evening".
  */

  if (state.workspaceState === "NEW") {

    if (period === "morning") {
      return {
        title: `Good morning, ${name}.`,
        support:
          "Your workspace is ready. I don't have your financial data yet."
      };
    }

    if (period === "afternoon") {
      return {
        title: `Good afternoon, ${name}.`,
        support:
          "Your workspace is ready. I don't have your financial data yet."
      };
    }

    if (period === "evening") {
      return {
        title: `Welcome, ${name}.`,
        support:
          "Your workspace is ready. I don't have your financial data yet."
      };
    }

    return {
      title: `Still working, ${name}?`,
      support:
        "ALI is ready. Your numbers haven't arrived yet."
    };
  }

  if (state.workspaceState === "PROCESSING") {
    return {
      title: `I'm working on it, ${name}.`,
      support:
        "Your data is being inspected, extracted, validated and registered."
    };
  }

  if (state.workspaceState === "ATTENTION") {
    return {
      title: `${name}, I found something.`,
      support:
        "Some items need your attention before I can call this complete."
    };
  }

  if (state.workspaceState === "READY") {
    return {
      title: `Welcome back, ${name}.`,
      support:
        "Your financial control workspace is ready."
    };
  }

  return {
    title: `Welcome back, ${name}.`,
    support: "ALI is ready."
  };
}


/* =========================================================
   BRAND
========================================================= */

function brandHTML() {
  return `
    <div class="brand">
      <div class="brand-mark">
        <span>SA</span>
      </div>
      <span>SPECIAL ALI</span>
    </div>
  `;
}


/* =========================================================
   LANDING PAGE
========================================================= */

function renderHome() {
  document.querySelector("#app").innerHTML = `
    <div class="landing screen">

      <header class="landing-nav">
        ${brandHTML()}
      </header>

      <main class="landing-main">

        <div class="landing-kicker">
          Financial Control Operating System
        </div>

        <h1 class="landing-title">
          Financial Control<br>
          without the noise.
        </h1>

        <p class="landing-subtitle">
          A financial control system that investigates,
          reconciles, validates and explains what your numbers mean.
        </p>

        <div class="landing-actions">
          <button class="primary-btn" onclick="navigate('auth')">
            Get Started
          </button>

          <button class="text-btn" onclick="showLearnMore()">
            Learn more
          </button>
        </div>

        <div class="landing-poetry">
          The numbers may be complex.<br>
          <strong>Your control system shouldn't be.</strong><br>
          Give ALI the evidence.<br>
          Let the system do the work.
        </div>

      </main>

      <footer class="landing-footer">
        SPECIAL ALI · Financial Control Operating System
      </footer>

    </div>
  `;
}


/* =========================================================
   LEARN MORE
========================================================= */

function showLearnMore() {
  showModal(`
    <h2>Built for control.</h2>

    <p>
      SPECIAL ALI connects data, evidence, accounting,
      taxation, reconciliation, investigation and validation
      into one controlled execution system.
    </p>

    <p>
      ALI can reason and orchestrate work.
      The backend engine remains the authority.
    </p>
  `);
}


/* =========================================================
   AUTH
========================================================= */

function renderAuth() {
  document.querySelector("#app").innerHTML = `
    <div class="center-screen">

      <div class="auth-card">

        <button class="back-link" onclick="navigate('home')">
          ‹ Back
        </button>

        ${brandHTML()}

        <h1>Welcome to SPECIAL ALI.</h1>

        <p>
          Create your workspace and let ALI take it from there.
        </p>

        <form class="form" onsubmit="handleAuth(event)">

          <div class="field">
            <label>Your name</label>
            <input
              id="authName"
              required
              placeholder="Your name"
            />
          </div>

          <div class="field">
            <label>Email</label>
            <input
              id="authEmail"
              type="email"
              required
              placeholder="you@company.com"
            />
          </div>

          <div class="field">
            <label>Password</label>
            <input
              type="password"
              required
              minlength="6"
              placeholder="••••••••"
            />
          </div>

          <button class="full-btn">
            Create Account
          </button>

        </form>

        <p style="font-size:11px;margin-top:20px;">
          Authentication will be connected to Supabase Auth
          in the backend integration stage.
        </p>

      </div>

    </div>
  `;
}

function handleAuth(event) {
  event.preventDefault();

  state.user.name = $("#authName").value.trim();
  state.user.email = $("#authEmail").value.trim();

  navigate("onboarding");
}


/* =========================================================
   ONBOARDING
========================================================= */

function renderOnboarding() {
  document.querySelector("#app").innerHTML = `
    <div class="center-screen">

      <div class="auth-card">

        <button class="back-link" onclick="navigate('auth')">
          ‹ Back
        </button>

        ${brandHTML()}

        <h1>Let's set things up.</h1>

        <p>
          ALI uses this information to understand
          your workspace and authority.
        </p>

        <form class="form" onsubmit="finishOnboarding(event)">

          <div class="field">
            <label>Workspace name</label>
            <input
              id="workspaceName"
              required
              placeholder="My Company"
            />
          </div>

          <div class="field">
            <label>Your role</label>

            <select id="workspaceRole" required>
              <option value="">Choose role</option>
              <option>Owner</option>
              <option>Accountant</option>
              <option>Finance</option>
              <option>Tax</option>
              <option>Auditor</option>
              <option>Viewer</option>
            </select>
          </div>

          <div class="field">
            <label>Country / jurisdiction</label>

            <select id="country">
              <option>Indonesia</option>
              <option>Singapore</option>
              <option>Malaysia</option>
              <option>Other</option>
            </select>
          </div>

          <div class="field">
            <label>Currency</label>

            <select id="currency">
              <option>IDR — Indonesian Rupiah</option>
              <option>USD — US Dollar</option>
              <option>SGD — Singapore Dollar</option>
            </select>
          </div>

          <button class="full-btn">
            Prepare My Workspace
          </button>

        </form>

      </div>

    </div>
  `;
}

function finishOnboarding(event) {
  event.preventDefault();

  state.user.workspace = $("#workspaceName").value.trim();
  state.user.role = $("#workspaceRole").value;

  state.workspaceState = "NEW";

  navigate("command");
}


/* =========================================================
   WORKSPACE SHELL
========================================================= */

function renderWorkspace() {

  const greeting = buildGreeting();

  document.querySelector("#app").innerHTML = `
    <div class="workspace">

      <aside class="sidebar">

        <div class="sidebar-brand">
          ${brandHTML()}
        </div>

        ${renderNavigation()}

      </aside>

      <main class="main">

        <header class="topbar">

          <div class="topbar-left">

            <button
              class="mobile-menu"
              onclick="showMobileNavigation()"
            >
              ☰
            </button>

            <button
              class="command-trigger"
              onclick="openCommandBar()"
            >
              Search or command · Ctrl K
            </button>

          </div>

          <div class="topbar-right">

            <span class="connection">
              Workspace connected
            </span>

            <button
              class="profile-btn"
              onclick="openAccountMenu()"
            >
              <span class="avatar">
                ${escapeHTML(initials(state.user.name))}
              </span>

              <span class="profile-name">
                ${escapeHTML(state.user.name)}
              </span>
            </button>

          </div>

        </header>

        <div id="workspace-content" class="content">
          ${renderCurrentPage(greeting)}
        </div>

      </main>

    </div>
  `;
}


/* =========================================================
   NAVIGATION
========================================================= */

function renderNavigation() {

  return NAVIGATION.map(section => {

    return `
      <div class="sidebar-section">

        <div class="sidebar-label">
          ${section.section}
        </div>

        ${section.items.map(item => {

          const [id, icon, label] = item;

          return `
            <button
              class="nav-item ${state.route === id ? "active" : ""}"
              onclick="navigate('${id}')"
            >
              <span class="nav-icon">${icon}</span>
              <span>${label}</span>
            </button>
          `;

        }).join("")}

      </div>
    `;

  }).join("");
}


/* =========================================================
   PAGE ROUTING
========================================================= */

function renderCurrentPage(greeting) {

  switch (state.route) {

    case "command":
      return renderCommandCenter(greeting);

    case "ask":
      return renderAskALI();

    case "tasks":
      return renderTasks();

    case "action":
      return renderActionCenter();

    case "activity":
      return renderActivity();

    case "data-center":
      return renderDataCenter();

    case "ingestion":
      return renderIngestion();

    case "documents":
      return renderDocuments();

    case "validation":
      return renderValidation();

    case "accounting":
      return renderAccounting();

    case "transactions":
      return renderTransactions();

    case "journal":
      return renderJournal();

    case "ledger":
      return renderLedger();

    case "close":
      return renderPeriodClose();

    case "tax":
      return renderTax();

    case "tax-calculations":
      return renderTaxCalculations();

    case "tax-rules":
      return renderTaxRules();

    case "investigation":
      return renderInvestigation();

    case "reconciliation":
      return renderReconciliation();

    case "findings":
      return renderFindings();

    case "unresolved":
      return renderUnresolved();

    case "evidence":
      return renderEvidence();

    case "proof":
      return renderProof();

    case "human-gate":
      return renderHumanGate();

    case "reports":
    case "control-report":
      return renderControlReport();

    case "audit":
    case "audit-trail":
      return renderAudit();

    case "account":
      return renderAccount();

    case "workspace":
      return renderWorkspaceSettings();

    default:
      return renderGenericPage();
  }
}


/* =========================================================
   COMMAND CENTER
========================================================= */

function renderCommandCenter(greeting) {

  const isNew = state.workspaceState === "NEW";

  if (isNew) {

    return `
      <section class="ali-intro">

        <div class="ali-eyebrow">
          ALI · Personal Command Center
        </div>

        <div
          id="aliGreeting"
          class="ali-message reveal"
        >
          ${escapeHTML(greeting.title)}
        </div>

        <div class="ali-support">
          ${escapeHTML(greeting.support)}
        </div>

      </section>

      <section>

        <div class="upload-hero">

          <div class="upload-symbol">
            ↑
          </div>

          <h2>
            Give ALI something to work with.
          </h2>

          <p>
            Upload invoices, bank statements, spreadsheets,
            documents or other financial data.
            ALI will inspect, extract and validate them before use.
          </p>

          <button
            class="primary-btn"
            onclick="openUploadDialog()"
          >
            ＋ Upload Your Data
          </button>

          <div class="formats">
            PDF · EXCEL · CSV · IMAGES · DOCUMENTS
          </div>

        </div>

        <div class="ask-box">

          <input
            id="commandInput"
            placeholder="Or tell ALI what you need..."
            onkeydown="handleCommandInput(event)"
          />

          <button onclick="submitALICommand()">
            Ask ALI
          </button>

        </div>

        <div class="state-note">
          No data has been processed yet.
        </div>

      </section>
    `;
  }

  return renderActiveCommandCenter();
}


/* =========================================================
   ACTIVE COMMAND CENTER
========================================================= */

function renderActiveCommandCenter() {

  return `
    <section class="ali-intro">

      <div class="ali-eyebrow">
        ALI · Personal Command Center
      </div>

      <div class="ali-message reveal">
        ${escapeHTML(buildGreeting().title)}
      </div>

      <div class="ali-support">
        ${escapeHTML(buildGreeting().support)}
      </div>

    </section>

    <div class="metric-grid">

      ${metric("Documents", state.data.documents, "registered")}

      ${metric("Transactions", state.data.transactions, "available")}

      ${metric("Needs Review", state.data.review, "attention")}

      ${metric("Unresolved", 2, "cannot be closed yet")}

    </div>

    <div class="panel-grid">

      <div class="panel">

        <div class="panel-head">
          <h3>ALI recommends</h3>

          <span class="status attention">
            ACTION
          </span>
        </div>

        <div class="panel-body">

          <div class="row">
            <div>
              <div class="row-title">
                Review unmatched bank transactions
              </div>
              <div class="row-meta">
                12 transactions require investigation
              </div>
            </div>

            <button
              class="secondary-btn"
              onclick="navigate('reconciliation')"
            >
              Review
            </button>
          </div>

          <div class="row">
            <div>
              <div class="row-title">
                Review 2 unresolved findings
              </div>
              <div class="row-meta">
                No final conclusion allowed yet
              </div>
            </div>

            <button
              class="secondary-btn"
              onclick="navigate('unresolved')"
            >
              Open
            </button>
          </div>

        </div>

      </div>

      <div class="panel">

        <div class="panel-head">
          <h3>Control health</h3>
        </div>

        <div class="panel-body">

          <div class="row">
            <div>
              <div class="row-title">Evidence</div>
              <div class="row-meta">Completeness</div>
            </div>
            <span class="status pass">97%</span>
          </div>

          <div class="row">
            <div>
              <div class="row-title">Dependencies</div>
              <div class="row-meta">Current state</div>
            </div>
            <span class="status pass">FRESH</span>
          </div>

          <div class="row">
            <div>
              <div class="row-title">Proof</div>
              <div class="row-meta">Available results</div>
            </div>
            <span class="status pass">READY</span>
          </div>

        </div>

      </div>

    </div>
  `;
}

function metric(label, value, meta) {

  return `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-meta">${meta}</div>
    </div>
  `;
}


/* =========================================================
   ASK ALI
========================================================= */

function renderAskALI() {

  return `
    ${pageHeader(
      "Ask ALI",
      "Tell ALI what you need investigated, reconciled or prepared."
    )}

    <div class="panel" style="max-width:760px;margin:auto;">

      <div class="panel-body">

        <div class="ali-message" style="font-size:34px;min-height:auto;">
          What should we work on?
        </div>

        <div class="ask-box" style="width:100%;margin-top:28px;">
          <input
            id="askInput"
            placeholder="Example: reconcile bank transactions for August..."
          />

          <button onclick="runAskALI()">
            Ask
          </button>
        </div>

        <div style="margin-top:28px;">

          ${[
            "Reconcile my bank transactions",
            "Find unusual transactions",
            "Prepare a period close review",
            "Show unresolved issues"
          ].map(text => `
            <button
              class="secondary-btn"
              style="margin:4px;"
              onclick="useSuggestion('${text}')"
            >
              ${text}
            </button>
          `).join("")}

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   TASKS
========================================================= */

function renderTasks() {

  return `
    ${pageHeader(
      "Tasks",
      "Agent executions and work currently assigned to ALI."
    )}

    <div class="panel">

      <div class="panel-head">
        <h3>Agent executions</h3>
        <span class="status info">LIVE</span>
      </div>

      <div class="panel-body">

        ${taskRow(
          "Bank reconciliation investigation",
          "Reconciliation Agent",
          "VALIDATING"
        )}

        ${taskRow(
          "Invoice extraction",
          "Data + OCR Agent",
          "COMPLETED"
        )}

        ${taskRow(
          "Period close readiness",
          "ALI Supervisor",
          "WAITING"
        )}

      </div>

    </div>
  `;
}

function taskRow(title, agent, status) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${title}</div>
        <div class="row-meta">${agent}</div>
      </div>

      <span class="status ${
        status === "COMPLETED"
          ? "pass"
          : status === "WAITING"
            ? "pending"
            : "info"
      }">
        ${status}
      </span>

    </div>
  `;
}


/* =========================================================
   ACTION CENTER
========================================================= */

function renderActionCenter() {

  return `
    ${pageHeader(
      "Action Center",
      "Things that need attention before work can move forward."
    )}

    <div class="panel">

      <div class="panel-body">

        ${actionRow(
          "12 unmatched bank transactions",
          "Reconciliation",
          "attention",
          "reconciliation"
        )}

        ${actionRow(
          "2 unresolved findings",
          "Investigation",
          "attention",
          "unresolved"
        )}

        ${actionRow(
          "1 journal proposal awaiting approval",
          "Human Gate",
          "pending",
          "human-gate"
        )}

      </div>

    </div>
  `;
}

function actionRow(title, type, status, route) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${title}</div>
        <div class="row-meta">${type}</div>
      </div>

      <button
        class="secondary-btn"
        onclick="navigate('${route}')"
      >
        Open
      </button>

    </div>
  `;
}


/* =========================================================
   ACTIVITY
========================================================= */

function renderActivity() {

  return `
    ${pageHeader(
      "Activity",
      "Recent system and agent activity."
    )}

    <div class="panel">

      <div class="panel-body">

        ${activity("Invoice batch extracted", "Data Agent", "2 min ago")}
        ${activity("12 transactions marked unmatched", "Reconciliation Agent", "5 min ago")}
        ${activity("Evidence registered", "Evidence Agent", "8 min ago")}
        ${activity("Validation completed", "Validation Engine", "11 min ago")}

      </div>

    </div>
  `;
}

function activity(title, actor, time) {

  return `
    <div class="row">
      <div>
        <div class="row-title">${title}</div>
        <div class="row-meta">${actor}</div>
      </div>

      <span class="row-meta">${time}</span>
    </div>
  `;
}


/* =========================================================
   DATA CENTER
========================================================= */

function renderDataCenter() {

  return `
    ${pageHeader(
      "Data Center",
      "Your controlled data ingestion and validation environment."
    )}

    <div class="metric-grid">

      ${metric("Sources", 4, "registered")}
      ${metric("Documents", state.data.documents, "processed")}
      ${metric("Transactions", state.data.transactions, "structured")}
      ${metric("Duplicates", state.data.duplicates, "detected")}

    </div>

    <div class="panel-grid">

      <div class="panel">

        <div class="panel-head">
          <h3>Ingestion</h3>

          <button
            class="secondary-btn"
            onclick="navigate('ingestion')"
          >
            Open
          </button>
        </div>

        <div class="panel-body">

          <div class="row">
            <div>
              <div class="row-title">OCR / Extraction</div>
              <div class="row-meta">
                Scanned documents supported
              </div>
            </div>

            <span class="status pass">READY</span>
          </div>

          <div class="row">
            <div>
              <div class="row-title">Validation</div>
              <div class="row-meta">
                Evidence required
              </div>
            </div>

            <span class="status pass">READY</span>
          </div>

          <div class="row">
            <div>
              <div class="row-title">Duplicate detection</div>
              <div class="row-meta">
                Hash + semantic checks
              </div>
            </div>

            <span class="status pass">READY</span>
          </div>

        </div>

      </div>

      <div class="panel">

        <div class="panel-head">
          <h3>Data Health</h3>
        </div>

        <div class="panel-body">

          <div class="row">
            <span>Integrity</span>
            <span class="status pass">PASS</span>
          </div>

          <div class="row">
            <span>Provenance</span>
            <span class="status pass">PASS</span>
          </div>

          <div class="row">
            <span>Validation</span>
            <span class="status attention">REVIEW</span>
          </div>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   INGESTION
========================================================= */

function renderIngestion() {

  return `
    ${pageHeader(
      "Ingestion",
      "Upload, extract, validate and register source data."
    )}

    <div class="processing-card">

      <h2 style="margin:0;font-size:22px;letter-spacing:-.03em;">
        Bring your data in.
      </h2>

      <p style="color:#737983;font-size:13px;line-height:1.6;">
        SPECIAL ALI does not treat uploaded files as authoritative
        until they pass the required validation and evidence process.
      </p>

      <button
        class="primary-btn"
        style="margin-top:15px;"
        onclick="openUploadDialog()"
      >
        ＋ Upload Data
      </button>

      <div style="margin-top:30px;">

        ${ingestionControl(
          "Upload",
          "Files received and security checked"
        )}

        ${ingestionControl(
          "OCR / Extraction",
          "Scanned documents and structured files"
        )}

        ${ingestionControl(
          "Classification",
          "Determine document and data type"
        )}

        ${ingestionControl(
          "Validation",
          "Check structure, fields and provenance"
        )}

        ${ingestionControl(
          "Evidence Registration",
          "Register source and evidence identity"
        )}

      </div>

    </div>
  `;
}

function ingestionControl(title, description) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${title}</div>
        <div class="row-meta">${description}</div>
      </div>

      <span class="status pass">READY</span>

    </div>
  `;
}


/* =========================================================
   DOCUMENTS
========================================================= */

function renderDocuments() {

  return `
    ${pageHeader(
      "Documents",
      "Registered documents and extraction state."
    )}

    <div class="panel">

      <div class="panel-body">

        ${documentRow(
          "invoice_001.pdf",
          "PDF · OCR",
          "VALIDATED"
        )}

        ${documentRow(
          "bank_august.xlsx",
          "Excel · Parser",
          "VALIDATED"
        )}

        ${documentRow(
          "supplier_invoice_14.png",
          "Image · OCR",
          "REVIEW"
        )}

      </div>

    </div>
  `;
}

function documentRow(name, type, status) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${name}</div>
        <div class="row-meta">${type}</div>
      </div>

      <span class="status ${
        status === "VALIDATED"
          ? "pass"
          : "attention"
      }">
        ${status}
      </span>

    </div>
  `;
}


/* =========================================================
   VALIDATION
========================================================= */

function renderValidation() {

  return `
    ${pageHeader(
      "Data Validation",
      "Validation state must come from backend execution."
    )}

    <div class="metric-grid">

      ${metric("Passed", 412, "documents")}
      ${metric("Review", 8, "documents")}
      ${metric("Unsupported", 4, "files")}
      ${metric("Duplicates", 2, "detected")}

    </div>

    <div class="panel">

      <div class="panel-head">
        <h3>Validation rules</h3>
        <span class="status pass">ACTIVE</span>
      </div>

      <div class="panel-body">

        ${validationRow("File integrity", "PASS")}
        ${validationRow("Required fields", "PASS")}
        ${validationRow("Provenance", "PASS")}
        ${validationRow("Duplicate check", "ATTENTION")}

      </div>

    </div>
  `;
}

function validationRow(title, status) {

  return `
    <div class="row">
      <span>${title}</span>

      <span class="status ${
        status === "PASS" ? "pass" : "attention"
      }">
        ${status}
      </span>
    </div>
  `;
}


/* =========================================================
   ACCOUNTING
========================================================= */

function renderAccounting() {

  return `
    ${pageHeader(
      "Accounting",
      "Accounting as the operational backbone of financial control."
    )}

    <div class="metric-grid">

      ${metric("Transactions", "1,245", "validated")}
      ${metric("Journal", "128", "entries")}
      ${metric("AR", "Rp 2.8B", "current")}
      ${metric("AP", "Rp 1.9B", "current")}

    </div>

    <div class="panel-grid">

      <div class="panel">

        <div class="panel-head">
          <h3>Accounting control</h3>
        </div>

        <div class="panel-body">

          ${controlRow("Transaction intake", "PASS")}
          ${controlRow("Reconciliation", "PASS")}
          ${controlRow("Journal proposals", "REVIEW")}
          ${controlRow("Period close", "ATTENTION")}

        </div>

      </div>

      <div class="panel">

        <div class="panel-head">
          <h3>ALI</h3>
        </div>

        <div class="panel-body">

          <p style="font-size:13px;line-height:1.7;color:#6b7280;">
            I can prepare accounting actions,
            but authoritative posting requires authorization.
          </p>

          <button
            class="primary-btn"
            onclick="navigate('journal')"
          >
            Review Journal Proposals
          </button>

        </div>

      </div>

    </div>
  `;
}

function controlRow(title, status) {

  return `
    <div class="row">
      <span>${title}</span>
      <span class="status ${
        status === "PASS"
          ? "pass"
          : "attention"
      }">${status}</span>
    </div>
  `;
}


/* =========================================================
   TRANSACTIONS
========================================================= */

function renderTransactions() {

  return `
    ${pageHeader(
      "Transactions",
      "Structured financial transactions."
    )}

    <div class="panel">

      <div class="panel-head">
        <h3>Recent transactions</h3>
        <span class="status pass">VALIDATED</span>
      </div>

      <div class="panel-body">

        ${transactionRow("TX-000124", "PT Example Supplier", "Rp 12.500.000")}
        ${transactionRow("TX-000125", "PT Example Customer", "Rp 8.400.000")}
        ${transactionRow("TX-000126", "Bank Transfer", "Rp 5.100.000")}

      </div>

    </div>
  `;
}

function transactionRow(id, party, amount) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${id}</div>
        <div class="row-meta">${party}</div>
      </div>

      <strong style="font-size:13px;">
        ${amount}
      </strong>

    </div>
  `;
}


/* =========================================================
   JOURNAL
========================================================= */

function renderJournal() {

  return `
    ${pageHeader(
      "Journal",
      "Journal proposals, approvals and authoritative posting."
    )}

    <div class="panel">

      <div class="panel-head">
        <h3>ALI journal proposal</h3>
        <span class="status attention">HUMAN GATE</span>
      </div>

      <div class="panel-body">

        <p style="font-size:13px;color:#6b7280;line-height:1.7;">
          ALI prepared this proposal from validated transactions.
          Posting has not occurred.
        </p>

        <div class="row">
          <span>Debit — Expense</span>
          <strong>Rp 25.000.000</strong>
        </div>

        <div class="row">
          <span>Credit — Payable</span>
          <strong>Rp 25.000.000</strong>
        </div>

        <div style="margin-top:20px;">

          <button
            class="primary-btn"
            onclick="navigate('human-gate')"
          >
            Review Approval
          </button>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   LEDGER
========================================================= */

function renderLedger() {

  return `
    ${pageHeader(
      "Ledger",
      "Ledger view from validated accounting state."
    )}

    <div class="panel">

      <div class="panel-body">

        ${ledgerRow("1100 · Cash", "Rp 2.450.000.000")}
        ${ledgerRow("1200 · Receivables", "Rp 2.800.000.000")}
        ${ledgerRow("2000 · Payables", "Rp 1.900.000.000")}
        ${ledgerRow("4000 · Revenue", "Rp 8.245.000.000")}

      </div>

    </div>
  `;
}

function ledgerRow(account, balance) {

  return `
    <div class="row">
      <span>${account}</span>
      <strong>${balance}</strong>
    </div>
  `;
}


/* =========================================================
   PERIOD CLOSE
========================================================= */

function renderPeriodClose() {

  return `
    ${pageHeader(
      "Period Close",
      "ALI evaluates close readiness from validated control states."
    )}

    <div class="metric-grid">

      ${metric("Readiness", "91%", "not final")}
      ${metric("Reconciliation", "PASS", "accounting")}
      ${metric("Evidence", "97%", "complete")}
      ${metric("Approvals", "3", "pending")}

    </div>

    <div class="panel">

      <div class="panel-head">
        <h3>Close readiness</h3>

        <span class="status attention">
          NOT READY
        </span>
      </div>

      <div class="panel-body">

        ${controlRow("Accounting reconciliation", "PASS")}
        ${controlRow("Bank reconciliation", "PASS")}
        ${controlRow("AP reconciliation", "PASS")}
        ${controlRow("AR reconciliation", "REVIEW")}
        ${controlRow("Accruals", "REVIEW")}

        <div
          style="
            margin-top:25px;
            padding-top:20px;
            border-top:1px solid #eee;
            font-size:13px;
            line-height:1.7;
          "
        >
          <strong>Conclusion</strong><br>
          NOT READY FOR FINAL CLOSE.
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   TAX
========================================================= */

function renderTax() {

  return `
    ${pageHeader(
      "Tax",
      "Tax is integrated with accounting, but never assumed identical to it."
    )}

    <div class="metric-grid">

      ${metric("Tax Data", "1,128", "validated")}
      ${metric("Calculations", "1,102", "validated")}
      ${metric("Unresolved", "6", "rule review")}
      ${metric("Rules", "38", "registered")}

    </div>

    <div class="panel">

      <div class="panel-head">
        <h3>Tax control state</h3>
      </div>

      <div class="panel-body">

        ${controlRow("Tax classification", "PASS")}
        ${controlRow("Rule resolution", "REVIEW")}
        ${controlRow("Tax calculation", "PASS")}
        ${controlRow("Tax reconciliation", "PASS")}

      </div>

    </div>
  `;
}


/* =========================================================
   TAX CALCULATIONS
========================================================= */

function renderTaxCalculations() {

  return `
    ${pageHeader(
      "Tax Calculations",
      "Every important tax result must trace to data, rule and calculation."
    )}

    <div class="panel">

      <div class="panel-head">
        <h3>Calculation trace</h3>
        <span class="status pass">VALIDATED</span>
      </div>

      <div class="panel-body">

        <div class="row">
          <span>Input</span>
          <span>Registered transaction data</span>
        </div>

        <div class="row">
          <span>Rule</span>
          <span>Established rule version</span>
        </div>

        <div class="row">
          <span>Formula</span>
          <span>Deterministic calculation</span>
        </div>

        <div class="row">
          <span>Validation</span>
          <span class="status pass">PASS</span>
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   TAX RULES
========================================================= */

function renderTaxRules() {

  return `
    ${pageHeader(
      "Tax Rules",
      "Versioned rules, applicability and legal provenance."
    )}

    <div class="panel">

      <div class="panel-body">

        ${ruleRow("RULE-TAX-001", "Indonesia", "REGISTERED")}
        ${ruleRow("RULE-TAX-002", "Indonesia", "REGISTERED")}
        ${ruleRow("RULE-TAX-003", "Indonesia", "REVIEW")}

      </div>

    </div>
  `;
}

function ruleRow(id, jurisdiction, status) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${id}</div>
        <div class="row-meta">${jurisdiction}</div>
      </div>

      <span class="status ${
        status === "REGISTERED"
          ? "pass"
          : "attention"
      }">
        ${status}
      </span>

    </div>
  `;
}


/* =========================================================
   INVESTIGATION
========================================================= */

function renderInvestigation() {

  return `
    ${pageHeader(
      "Investigation",
      "Observation → Hypothesis → Test → Evidence → Result → Conclusion."
    )}

    <div class="panel">

      <div class="panel-head">
        <h3>Current investigation</h3>
        <span class="status info">IN PROGRESS</span>
      </div>

      <div class="panel-body">

        ${investigationStep("Observation", "Transaction does not reconcile")}
        ${investigationStep("Hypothesis", "Possible timing difference")}
        ${investigationStep("Test", "Compare bank and source records")}
        ${investigationStep("Evidence", "2 supporting records found")}
        ${investigationStep("Result", "Partially supported")}
        ${investigationStep("Conclusion", "WAITING FOR USER")}

      </div>

    </div>
  `;
}

function investigationStep(title, value) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${title}</div>
      </div>

      <span style="font-size:12px;color:#6b7280;">
        ${value}
      </span>

    </div>
  `;
}


/* =========================================================
   RECONCILIATION
========================================================= */

function renderReconciliation() {

  return `
    ${pageHeader(
      "Reconciliation",
      "Matching must preserve uncertainty instead of hiding it."
    )}

    <div class="metric-grid">

      ${metric("Exact", 982, "matches")}
      ${metric("Probable", 21, "requires condition")}
      ${metric("Partial", 8, "requires review")}
      ${metric("No Match", 12, "requires investigation")}

    </div>

    <div class="panel">

      <div class="panel-head">
        <h3>Reconciliation status</h3>
      </div>

      <div class="panel-body">

        ${reconciliationRow("TX-000124", "EXACT")}
        ${reconciliationRow("TX-000125", "PROBABLE")}
        ${reconciliationRow("TX-000126", "CONTRADICTED")}

      </div>

    </div>
  `;
}

function reconciliationRow(id, status) {

  const className =
    status === "EXACT"
      ? "pass"
      : status === "PROBABLE"
        ? "attention"
        : "blocked";

  return `
    <div class="row">
      <span>${id}</span>
      <span class="status ${className}">
        ${status}
      </span>
    </div>
  `;
}


/* =========================================================
   FINDINGS
========================================================= */

function renderFindings() {

  return `
    ${pageHeader(
      "Findings",
      "Controlled lifecycle for investigation findings."
    )}

    <div class="panel">

      <div class="panel-body">

        ${findingRow(
          "FND-001",
          "Bank transaction mismatch",
          "INVESTIGATING"
        )}

        ${findingRow(
          "FND-002",
          "Missing supporting invoice",
          "BLOCKED"
        )}

        ${findingRow(
          "FND-003",
          "Potential duplicate transaction",
          "OPEN"
        )}

      </div>

    </div>
  `;
}

function findingRow(id, title, status) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${id} · ${title}</div>
        <div class="row-meta">
          OPEN → INVESTIGATING → RESOLVED
        </div>
      </div>

      <span class="status ${
        status === "INVESTIGATING"
          ? "info"
          : status === "BLOCKED"
            ? "blocked"
            : "attention"
      }">
        ${status}
      </span>

    </div>
  `;
}


/* =========================================================
   UNRESOLVED
========================================================= */

function renderUnresolved() {

  return `
    ${pageHeader(
      "Unresolved",
      "Unresolved cases cannot disappear and cannot become final by assumption."
    )}

    <div class="panel">

      <div class="panel-head">
        <h3>UNRESOLVED_REGISTRY</h3>
        <span class="status blocked">2 OPEN</span>
      </div>

      <div class="panel-body">

        ${findingRow(
          "UNR-001",
          "Supporting evidence conflict",
          "BLOCKED"
        )}

        ${findingRow(
          "UNR-002",
          "Tax rule applicability uncertain",
          "OPEN"
        )}

      </div>

    </div>
  `;
}


/* =========================================================
   EVIDENCE
========================================================= */

function renderEvidence() {

  return `
    ${pageHeader(
      "Evidence Registry",
      "Source-backed evidence used by the control engine."
    )}

    <div class="panel">

      <div class="panel-body">

        ${evidenceRow(
          "EV-001",
          "invoice_001.pdf",
          "VALID"
        )}

        ${evidenceRow(
          "EV-002",
          "bank_august.xlsx",
          "VALID"
        )}

        ${evidenceRow(
          "EV-003",
          "supplier_invoice_14.png",
          "REVIEW"
        )}

      </div>

    </div>
  `;
}

function evidenceRow(id, source, status) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${id}</div>
        <div class="row-meta">${source}</div>
      </div>

      <span class="status ${
        status === "VALID"
          ? "pass"
          : "attention"
      }">
        ${status}
      </span>

    </div>
  `;
}


/* =========================================================
   PROOF
========================================================= */

function renderProof() {

  return `
    ${pageHeader(
      "Proof",
      "Show why a result can be trusted."
    )}

    <div class="panel">

      <div class="panel-body">

        <div class="row">
          <strong>Input</strong>
          <span>Registered data</span>
        </div>

        <div class="row">
          <strong>Evidence</strong>
          <span>EV-001 · EV-002</span>
        </div>

        <div class="row">
          <strong>Rule</strong>
          <span>RULE-REV-001 v3</span>
        </div>

        <div class="row">
          <strong>Calculation</strong>
          <span>CALC-2026-001</span>
        </div>

        <div class="row">
          <strong>Validation</strong>
          <span class="status pass">PASS</span>
        </div>

        <div class="row">
          <strong>Dependencies</strong>
          <span class="status pass">FRESH</span>
        </div>

        <div class="row">
          <strong>Replay</strong>
          <span class="status pass">AVAILABLE</span>
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   HUMAN GATE
========================================================= */

function renderHumanGate() {

  return `
    ${pageHeader(
      "Human Gate",
      "Actions requiring authorized human decisions."
    )}

    <div class="panel">

      <div class="panel-head">
        <h3>Pending decision</h3>
        <span class="status attention">REQUIRES APPROVAL</span>
      </div>

      <div class="panel-body">

        <h3 style="font-size:17px;">
          Journal proposal · JRN-0021
        </h3>

        <p style="font-size:13px;color:#6b7280;line-height:1.7;">
          ALI prepared this action from validated data.
          Authoritative posting has not occurred.
        </p>

        <div style="margin-top:22px;">

          <button
            class="primary-btn"
            onclick="approveDemoAction()"
          >
            Approve
          </button>

          <button
            class="secondary-btn"
            onclick="showModal(
              '<h2>Rejected.</h2><p>The action remains unresolved and requires repair.</p>'
            )"
          >
            Reject
          </button>

        </div>

      </div>

    </div>
  `;
}

function approveDemoAction() {

  showModal(`
    <h2>Decision recorded.</h2>

    <p>
      In the real system this action would be sent to the
      authorized backend mutation endpoint and committed
      transactionally with an immutable audit event.
    </p>

    <span class="status info">
      DEMO FRONTEND ONLY
    </span>
  `);
}


/* =========================================================
   REPORT
========================================================= */

function renderControlReport() {

  return `
    ${pageHeader(
      "Control Report",
      "Validated control results and unresolved items."
    )}

    <div class="panel">

      <div class="panel-body">

        ${controlRow("Accounting", "PASS")}
        ${controlRow("Reconciliation", "PASS")}
        ${controlRow("Evidence", "PASS")}
        ${controlRow("Tax rule resolution", "REVIEW")}
        ${controlRow("Human decisions", "REVIEW")}

        <div style="margin-top:24px;">
          <button
            class="primary-btn"
            onclick="showModal(
              '<h2>Report ready.</h2><p>Export will be connected to the Output Gateway in the backend implementation.</p>'
            )"
          >
            Prepare Export
          </button>
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   AUDIT
========================================================= */

function renderAudit() {

  return `
    ${pageHeader(
      "Audit Trail",
      "Immutable execution and event history."
    )}

    <div class="panel">

      <div class="panel-body">

        ${auditRow(
          "EXEC-001",
          "Data ingestion",
          "COMPLETED"
        )}

        ${auditRow(
          "EXEC-002",
          "Reconciliation",
          "VALIDATING"
        )}

        ${auditRow(
          "EXEC-003",
          "Journal proposal",
          "HUMAN_GATE"
        )}

      </div>

    </div>
  `;
}

function auditRow(id, action, status) {

  return `
    <div class="row">

      <div>
        <div class="row-title">${id} · ${action}</div>
        <div class="row-meta">
          Immutable execution record
        </div>
      </div>

      <span class="status info">
        ${status}
      </span>

    </div>
  `;
}


/* =========================================================
   ACCOUNT
========================================================= */

function renderAccount() {

  return `
    ${pageHeader(
      "Account",
      "Identity, security and workspace membership."
    )}

    <div class="panel">

      <div class="panel-body">

        ${accountRow("Full Name", state.user.name)}
        ${accountRow("Email", state.user.email)}
        ${accountRow("Role", state.user.role)}
        ${accountRow("Workspace", state.user.workspace)}
        ${accountRow("Authentication", "Configured")}
        ${accountRow("Account Status", "ACTIVE")}

      </div>

    </div>
  `;
}

function accountRow(label, value) {

  return `
    <div class="row">
      <span>${label}</span>
      <strong style="font-size:12px;">
        ${escapeHTML(value || "—")}
      </strong>
    </div>
  `;
}


/* =========================================================
   WORKSPACE SETTINGS
========================================================= */

function renderWorkspaceSettings() {

  return `
    ${pageHeader(
      "Workspace",
      "Workspace identity, policy and operating configuration."
    )}

    <div class="panel">

      <div class="panel-body">

        ${accountRow(
          "Workspace",
          state.user.workspace
        )}

        ${accountRow(
          "Jurisdiction",
          "Indonesia"
        )}

        ${accountRow(
          "Currency",
          "IDR"
        )}

        ${accountRow(
          "Timezone",
          "Asia/Jakarta"
        )}

      </div>

    </div>
  `;
}


/* =========================================================
   GENERIC PAGE
========================================================= */

function renderGenericPage() {

  const label = getRouteLabel(state.route);

  return `
    ${pageHeader(
      label,
      "This module is part of the SPECIAL ALI control architecture."
    )}

    <div class="panel">

      <div class="panel-body">

        <div style="text-align:center;padding:40px 20px;">

          <div
            style="
              font-size:32px;
              letter-spacing:-.04em;
              font-weight:600;
            "
          >
            ${label}
          </div>

          <p
            style="
              max-width:500px;
              margin:15px auto;
              color:#737983;
              line-height:1.7;
              font-size:13px;
            "
          >
            This module is ready for backend execution integration.
            UI state must eventually be driven by authoritative
            backend state.
          </p>

        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   PAGE HEADER
========================================================= */

function pageHeader(title, description) {

  return `
    <div class="page-head">

      <div>

        <div class="breadcrumb">
          SPECIAL ALI / ${escapeHTML(title)}
        </div>

        <h1>${escapeHTML(title)}</h1>

        <p>
          ${escapeHTML(description)}
        </p>

      </div>

      ${
        state.activeParent
          ? `
            <button
              class="back-parent"
              onclick="goBack()"
            >
              ‹ ${escapeHTML(state.activeParent)}
            </button>
          `
          : ""
      }

    </div>
  `;
}


/* =========================================================
   ROUTE HELPERS
========================================================= */

function getRouteLabel(route) {

  for (const section of NAVIGATION) {

    for (const item of section.items) {

      if (item[0] === route) {
        return item[2];
      }

    }
  }

  return "SPECIAL ALI";
}

function navigate(route) {

  state.route = route;

  if (
    route !== "command" &&
    route !== "home" &&
    route !== "auth" &&
    route !== "onboarding"
  ) {
    state.activeParent = getParentName(route);
  }

  if (
    route === "home" ||
    route === "auth" ||
    route === "onboarding"
  ) {
    renderRoute();
    return;
  }

  renderWorkspace();
}

function renderRoute() {

  if (state.route === "home") {
    renderHome();
    return;
  }

  if (state.route === "auth") {
    renderAuth();
    return;
  }

  if (state.route === "onboarding") {
    renderOnboarding();
    return;
  }

  renderWorkspace();
}

function getParentName(route) {

  const parents = {
    transactions: "Accounting",
    journal: "Accounting",
    ledger: "Accounting",
    close: "Accounting",
    "tax-calculations": "Tax",
    "tax-rules": "Tax",
    "tax-data": "Tax",
    reconciliation: "Work",
    findings: "Work",
    unresolved: "Work",
    evidence: "Evidence",
    proof: "Evidence",
    "human-gate": "Human Gate",
    ingestion: "Data Center",
    documents: "Data Center",
    validation: "Data Center"
  };

  return parents[route] || "Command Center";
}

function goBack() {

  const map = {
    Accounting: "accounting",
    Tax: "tax",
    Work: "reconciliation",
    Evidence: "evidence",
    "Human Gate": "human-gate",
    "Data Center": "data-center",
    "Command Center": "command"
  };

  navigate(map[state.activeParent] || "command");
}


/* =========================================================
   UPLOAD
========================================================= */

function openUploadDialog() {

  showModal(`
    <h2>Upload your data.</h2>

    <p>
      Choose financial documents to start the ingestion process.
    </p>

    <input
      id="uploadInput"
      type="file"
      multiple
      accept="
        .pdf,
        .xlsx,
        .xls,
        .csv,
        .jpg,
        .jpeg,
        .png,
        .webp,
        .docx,
        .txt,
        .json,
        .xml
      "
      style="
        width:100%;
        border:1px solid #e5e7eb;
        border-radius:12px;
        padding:12px;
        margin-top:10px;
      "
    />

    <p style="font-size:11px;margin-top:10px;">
      Demo mode: files are not uploaded to a server yet.
    </p>

    <div class="modal-actions">

      <button
        class="secondary-btn"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="primary-btn"
        onclick="startUploadSimulation()"
      >
        Start Ingestion
      </button>

    </div>
  `);
}


/* =========================================================
   UPLOAD SIMULATION
========================================================= */

async function startUploadSimulation() {

  const input = $("#uploadInput");

  const count = input?.files?.length || 3;

  closeModal();

  state.data.documents += count;
  state.workspaceState = "PROCESSING";
  state.processing.running = true;

  navigate("command");

  await runProcessing(count);
}

async function runProcessing(count) {

  const content = $("#workspace-content");

  content.innerHTML = `
    <section class="ali-intro">

      <div class="ali-eyebrow">
        ALI · Data Ingestion
      </div>

      <div class="ali-message">
        I'm checking your data.
      </div>

      <div class="ali-support">
        Upload → security check → extraction/OCR →
        classification → validation → evidence.
      </div>

    </section>

    <div class="processing-card">

      <div style="display:flex;justify-content:space-between;">
        <strong>Processing ${count} file(s)</strong>
        <span id="processingPercent">0%</span>
      </div>

      <div class="progress-track">
        <div
          id="processingBar"
          class="progress-bar"
        ></div>
      </div>

      <div id="processingSteps"></div>

    </div>
  `;

  const steps = [
    ["File security check", "Checking"],
    ["File type detection", "Checking"],
    ["OCR / Extraction", "Working"],
    ["Classification", "Waiting"],
    ["Validation", "Waiting"],
    ["Duplicate detection", "Waiting"],
    ["Evidence registration", "Waiting"]
  ];

  for (let i = 0; i < steps.length; i++) {

    const progress = Math.round(
      ((i + 1) / steps.length) * 100
    );

    const stepsHTML = steps.map((step, index) => {

      let status = "WAITING";

      if (index < i) status = "DONE";
      if (index === i) status = "WORKING";

      return `
        <div class="processing-step">

          <span>${step[0]}</span>

          <span class="status ${
            status === "DONE"
              ? "pass"
              : status === "WORKING"
                ? "info"
                : "pending"
          }">
            ${status}
          </span>

        </div>
      `;

    }).join("");

    $("#processingSteps").innerHTML = stepsHTML;

    $("#processingBar").style.width = `${progress}%`;

    $("#processingPercent").textContent =
      `${progress}%`;

    await sleep(700);
  }

  state.processing.running = false;
  state.processing.progress = 100;

  state.data.processed += count;
  state.data.transactions += count * 120;

  /*
    Simulated validation outcome.
    This is UI-only demo state.
  */

  state.data.review += 1;
  state.data.duplicates += 1;

  state.workspaceState = "ATTENTION";

  await sleep(500);

  showProcessingComplete();
}


/* =========================================================
   PROCESSING COMPLETE
========================================================= */

function showProcessingComplete() {

  showModal(`
    <h2>Processing complete.</h2>

    <p>
      ${state.data.processed} document(s) passed through
      the demo ingestion pipeline.
    </p>

    <div style="margin-top:18px;">

      <div class="row">
        <span>Processed</span>
        <span class="status pass">
          ${state.data.processed}
        </span>
      </div>

      <div class="row">
        <span>Require review</span>
        <span class="status attention">
          ${state.data.review}
        </span>
      </div>

      <div class="row">
        <span>Possible duplicates</span>
        <span class="status attention">
          ${state.data.duplicates}
        </span>
      </div>

    </div>

    <p style="font-size:11px;">
      The production engine must obtain these states
      from authoritative backend execution records.
    </p>

    <div class="modal-actions">

      <button
        class="secondary-btn"
        onclick="closeModal();navigate('validation')"
      >
        Review Validation
      </button>

      <button
        class="primary-btn"
        onclick="closeModal();navigate('command')"
      >
        Continue
      </button>

    </div>
  `);
}


/* =========================================================
   COMMAND INPUT
========================================================= */

function handleCommandInput(event) {

  if (event.key === "Enter") {
    submitALICommand();
  }
}

function submitALICommand() {

  const input = $("#commandInput");

  if (!input || !input.value.trim()) {
    return;
  }

  const command = input.value.trim();

  showModal(`
    <h2>ALI received your instruction.</h2>

    <p>
      <strong>${escapeHTML(command)}</strong>
    </p>

    <p>
      In production, ALI Supervisor will translate this
      into an authorized execution plan and send it through
      the Core Execution Bus.
    </p>

    <span class="status info">
      PLANNING
    </span>
  `);
}

function runAskALI() {

  const input = $("#askInput");

  if (!input || !input.value.trim()) return;

  const command = input.value.trim();

  showModal(`
    <h2>I'm looking into that.</h2>

    <p>
      ${escapeHTML(command)}
    </p>

    <p>
      ALI will first determine intent, permissions,
      required evidence and available execution paths.
    </p>

    <span class="status info">
      PLANNING
    </span>
  `);
}

function useSuggestion(text) {

  const input = $("#askInput");

  if (input) {
    input.value = text;
  }
}


/* =========================================================
   COMMAND BAR
========================================================= */

function openCommandBar() {

  showModal(`
    <h2>Command Center</h2>

    <p>
      Tell ALI what you want to find or do.
    </p>

    <input
      id="globalCommand"
      placeholder="Search transactions, findings, evidence..."
      style="
        width:100%;
        padding:13px;
        border:1px solid #e5e7eb;
        border-radius:12px;
        margin-top:10px;
        outline:none;
      "
      onkeydown="
        if(event.key==='Enter'){
          const value=this.value;
          closeModal();
          showModal(
            '<h2>ALI is planning.</h2><p>'+escapeHTML(value)+'</p>'
          );
        }
      "
    />

    <div style="margin-top:18px;">

      ${[
        ["Upload document", "openUploadDialog()"],
        ["Open reconciliation", "closeModal();navigate('reconciliation')"],
        ["Review findings", "closeModal();navigate('findings')"],
        ["Ask ALI", "closeModal();navigate('ask')"]
      ].map(item => `
        <button
          class="secondary-btn"
          style="margin:3px;"
          onclick="${item[1]}"
        >
          ${item[0]}
        </button>
      `).join("")}

    </div>
  `);
}


/* =========================================================
   PROFILE MENU
========================================================= */

function openAccountMenu() {

  showModal(`
    <h2>${escapeHTML(state.user.name)}</h2>

    <p>
      ${escapeHTML(state.user.email)}
    </p>

    <div style="margin-top:20px;">

      <button
        class="secondary-btn"
        onclick="closeModal();navigate('account')"
      >
        Account
      </button>

      <button
        class="secondary-btn"
        onclick="closeModal();navigate('workspace')"
      >
        Workspace
      </button>

      <button
        class="secondary-btn"
        onclick="logout()"
      >
        Sign out
      </button>

    </div>
  `);
}

function logout() {

  closeModal();

  state.user = {
    name: "",
    email: "",
    role: "",
    workspace: ""
  };

  state.workspaceState = "NEW";

  navigate("home");
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function showMobileNavigation() {

  const buttons = NAVIGATION
    .flatMap(section => section.items)
    .slice(0, 12)
    .map(item => `
      <button
        class="secondary-btn"
        style="width:100%;text-align:left;margin:3px 0;"
        onclick="closeModal();navigate('${item[0]}')"
      >
        ${item[2]}
      </button>
    `)
    .join("");

  showModal(`
    <h2>Navigation</h2>

    <div style="margin-top:15px;">
      ${buttons}
    </div>
  `);
}


/* =========================================================
   MODAL SYSTEM
========================================================= */

function showModal(content) {

  const existing = document.querySelector(".modal-layer");

  if (existing) {
    existing.remove();
  }

  const layer = document.createElement("div");

  layer.className = "modal-layer";

  layer.innerHTML = `
    <div class="modal reveal">

      ${content}

    </div>
  `;

  layer.addEventListener("click", event => {

    if (event.target === layer) {
      closeModal();
    }

  });

  document.body.appendChild(layer);
}

function closeModal() {

  const modal = document.querySelector(".modal-layer");

  if (modal) {
    modal.remove();
  }
}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener("keydown", event => {

  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k"
  ) {

    event.preventDefault();

    if (
      state.route !== "home" &&
      state.route !== "auth" &&
      state.route !== "onboarding"
    ) {
      openCommandBar();
    }
  }

  if (event.key === "Escape") {
    closeModal();
  }

});


/* =========================================================
   LOCAL DEMO PERSISTENCE
========================================================= */

function saveDemoState() {

  try {

    localStorage.setItem(
      "special-ali-demo-state",
      JSON.stringify({
        user: state.user,
        workspaceState: state.workspaceState,
        data: state.data
      })
    );

  } catch (error) {

    console.warn(
      "SPECIAL ALI demo state could not be saved.",
      error
    );

  }
}

function loadDemoState() {

  try {

    const raw = localStorage.getItem(
      "special-ali-demo-state"
    );

    if (!raw) return;

    const saved = JSON.parse(raw);

    if (saved.user) {
      state.user = saved.user;
    }

    if (saved.workspaceState) {
      state.workspaceState = saved.workspaceState;
    }

    if (saved.data) {
      state.data = saved.data;
    }

  } catch (error) {

    console.warn(
      "SPECIAL ALI demo state could not be loaded.",
      error
    );

  }
}


/* =========================================================
   PERSISTENCE HOOK
========================================================= */

setInterval(saveDemoState, 3000);


/* =========================================================
   INITIALIZE
========================================================= */

loadDemoState();

renderHome();
