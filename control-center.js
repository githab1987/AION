/* ============================================================
   SPECIAL ALI
   CONTROL CENTER
   AUTHORITATIVE STATE RENDERER
============================================================ */


/* ============================================================
   LOAD AUTHORITATIVE STATE
============================================================ */

async function loadControlCenterState() {

  const workspaceId =
    state.workspace?.id;


  if (!workspaceId) {

    return {
      ok: false,
      state: [],
      error:
        "WORKSPACE_NOT_AVAILABLE"
    };

  }


  const result =
    await apiRequest(
      "/v1/control-center/state",
      {
        method: "GET"
      }
    );


  /* ----------------------------------------------------------
     RESPONSE INTEGRITY
  ---------------------------------------------------------- */

  if (
    !result ||
    result.ok !== true
  ) {

    throw new Error(
      result?.error ||
      "CONTROL_CENTER_INVALID_RESPONSE"
    );

  }


  if (
    !Array.isArray(result.state)
  ) {

    throw new Error(
      "CONTROL_CENTER_INVALID_STATE"
    );

  }


  /* ----------------------------------------------------------
     WORKSPACE INTEGRITY
  ---------------------------------------------------------- */

  if (
    result.workspace_id &&
    result.workspace_id !== workspaceId
  ) {

    throw new Error(
      "CONTROL_CENTER_WORKSPACE_MISMATCH"
    );

  }


  return result;
}


/* ============================================================
   CONTROL CENTER
============================================================ */

async function renderCommandCenter() {

  $("#content").innerHTML = `

    <div class="command-head">

      <div class="eyebrow">
        SPECIAL ALI / CONTROL CENTER
      </div>

      <h1 class="page-title">
        Financial Control
      </h1>

      <p class="page-description">
        One authoritative view of what is healthy,
        what is problematic, and what requires a decision.
      </p>

      <div
        id="controlCenterStatus"
        class="ali-line"
      >
        Reading authoritative backend state…
      </div>

    </div>


    <section
      id="controlCenterRoot"
      class="card"
      style="padding:28px"
    >

      <div class="eyebrow">
        CONTROL STATE
      </div>

      <div
        style="
          margin-top:16px;
          color:#6b7280;
          font-size:13px;
        "
      >
        Loading authoritative state…
      </div>

    </section>

  `;


  try {

    const result =
      await loadControlCenterState();


    renderControlCenterState(
      result
    );


  } catch (error) {

    renderControlCenterFailure(
      error
    );

  }

}


/* ============================================================
   AUTHORITATIVE STATE
============================================================ */

function renderControlCenterState(
  result
) {

  const root =
    $("#controlCenterRoot");

  const status =
    $("#controlCenterStatus");


  if (!root) {
    return;
  }


  const rows =
    Array.isArray(result?.state)
      ? result.state
      : [];


  /* ----------------------------------------------------------
     NO AUTHORITATIVE STATE
  ---------------------------------------------------------- */

  if (!rows.length) {

    if (status) {

      status.textContent =
        "Backend connected. No authoritative Control Center state is available.";

    }


    root.innerHTML = `

      <div class="eyebrow">
        NO AUTHORITATIVE STATE
      </div>

      <div
        style="
          margin-top:14px;
          font-size:16px;
          font-weight:600;
        "
      >
        Nothing is being assumed.
      </div>

      <div class="card-copy">

        The backend has not returned a Control Center state
        for this workspace yet.

      </div>

    `;

    return;
  }


  /* ----------------------------------------------------------
     AUTHORITATIVE ROW
  ---------------------------------------------------------- */

  const current =
    rows[0];


  if (
    !current ||
    typeof current !== "object"
  ) {

    renderControlCenterFailure(
      new Error(
        "CONTROL_CENTER_INVALID_STATE_ROW"
      )
    );

    return;
  }


  /* ----------------------------------------------------------
     STATE CARDS
  ---------------------------------------------------------- */

  const stateCards = [

    [
      "Overall",
      current.overall_state
    ],

    [
      "Evidence",
      current.evidence_state
    ],

    [
      "Accounting",
      current.accounting_state
    ],

    [
      "Tax",
      current.tax_state
    ],

    [
      "Reconciliation",
      current.reconciliation_state
    ],

    [
      "Control",
      current.control_state
    ],

    [
      "Proof",
      current.proof_state
    ],

    [
      "Decision",
      current.decision_state
    ],

    [
      "Human Gate",
      current.human_gate_state
    ],

    [
      "Audit",
      current.audit_state
    ]

  ];


  if (status) {

    status.textContent =
      `Authoritative state: ${
        current.status ||
        "UNKNOWN"
      }`;

  }


  root.innerHTML = `

    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(180px,1fr)
          );
        gap:12px;
      "
    >

      ${stateCards.map(
        ([label, value]) => `

          <div
            style="
              border:1px solid #e5e7eb;
              border-radius:14px;
              padding:16px;
              background:#fff;
            "
          >

            <div
              style="
                color:#8b929b;
                font-size:10px;
                font-weight:700;
                letter-spacing:.08em;
                text-transform:uppercase;
              "
            >
              ${escapeHTML(label)}
            </div>

            <div
              style="
                margin-top:8px;
                font-size:14px;
                font-weight:600;
              "
            >
              ${escapeHTML(
                formatControlState(value)
              )}
            </div>

          </div>

        `
      ).join("")}

    </div>

    ${renderControlCollections(
      current
    )}

  `;

}


/* ============================================================
   COLLECTIONS
============================================================ */

function renderControlCollections(
  current
) {

  const blockers =
    Array.isArray(
      current.blockers
    )
      ? current.blockers
      : [];


  const unresolved =
    Array.isArray(
      current.unresolved_items
    )
      ? current.unresolved_items
      : [];


  const warnings =
    Array.isArray(
      current.warnings
    )
      ? current.warnings
      : [];


  const actions =
    Array.isArray(
      current.available_actions
    )
      ? current.available_actions
      : [];


  return `

    <div
      style="
        margin-top:24px;
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(220px,1fr)
          );
        gap:16px;
      "
    >

      ${controlCollection(
        "Blockers",
        blockers,
        "No active blockers."
      )}

      ${controlCollection(
        "Unresolved",
        unresolved,
        "No unresolved items."
      )}

      ${controlCollection(
        "Warnings",
        warnings,
        "No warnings."
      )}

      ${controlCollection(
        "Available Actions",
        actions,
        "No action currently available."
      )}

    </div>


    <div
      style="
        margin-top:22px;
        padding-top:18px;
        border-top:1px solid #e5e7eb;
        color:#6b7280;
        font-size:11px;
        line-height:1.7;
      "
    >

      Source:
      ${escapeHTML(
        current.source_execution_id ||
        "backend-control-center"
      )}

      <br />

      State version:
      ${escapeHTML(
        String(
          current.state_version ??
          "—"
        )
      )}

      <br />

      Deterministic:
      ${
        current.deterministic
          ? "YES"
          : "NO"
      }

      <br />

      State hash:

      <span class="mono">

        ${escapeHTML(
          current.state_hash ||
          "—"
        )}

      </span>

    </div>

  `;

}


/* ============================================================
   COLLECTION CARD
============================================================ */

function controlCollection(
  title,
  items,
  emptyMessage
) {

  const values =
    items.length
      ? items
      : [emptyMessage];


  return `

    <div
      style="
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:18px;
      "
    >

      <div
        style="
          font-size:12px;
          font-weight:700;
        "
      >
        ${escapeHTML(title)}
      </div>


      <div
        style="
          margin-top:12px;
          display:grid;
          gap:8px;
        "
      >

        ${values.map(
          item => `

            <div
              style="
                padding:9px 11px;
                background:#f7f8fa;
                border-radius:9px;
                font-size:11px;
                color:#4b5563;
              "
            >

              ${escapeHTML(
                safeControlValue(item)
              )}

            </div>

          `
        ).join("")}

      </div>

    </div>

  `;

}


/* ============================================================
   SAFE VALUE
============================================================ */

function safeControlValue(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "NOT_REPORTED";

  }


  if (
    typeof value === "string"
  ) {

    return value;

  }


  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {

    return String(value);

  }


  try {

    return JSON.stringify(
      value
    );

  } catch {

    return "UNSERIALIZABLE_VALUE";

  }

}


/* ============================================================
   SAFE STATE FORMAT
============================================================ */

function formatControlState(
  value
) {

  return safeControlValue(
    value
  );

}


/* ============================================================
   FAILURE
============================================================ */

function renderControlCenterFailure(
  error
) {

  const root =
    $("#controlCenterRoot");

  const status =
    $("#controlCenterStatus");


  if (status) {

    status.textContent =
      "Control Center could not obtain authoritative state.";

  }


  if (!root) {
    return;
  }


  let message =
    "CONTROL_CENTER_UNAVAILABLE";


  try {

    message =
      normalizeError(error);

  } catch {

    message =
      "CONTROL_CENTER_UNAVAILABLE";

  }


  root.innerHTML = `

    <div class="eyebrow">
      CONTROL CENTER BLOCKED
    </div>


    <h2
      style="
        margin-top:12px;
        font-size:20px;
      "
    >
      No state was fabricated.
    </h2>


    <div class="card-copy">

      The backend did not provide a valid
      authoritative Control Center response.

    </div>


    <div
      style="
        margin-top:16px;
        color:#c93636;
        font-size:12px;
      "
    >

      ${escapeHTML(
        message
      )}

    </div>

  `;

}


/* ============================================================
   PUBLIC API
============================================================ */

window.SPECIAL_ALI_CONTROL_CENTER = {

  refresh:
    renderCommandCenter,

  load:
    loadControlCenterState

};
