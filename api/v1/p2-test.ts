(function () {
"use strict";

function createStyles() {
if (document.getElementById("p2-test-ui-style")) return;

const style = document.createElement("style");
style.id = "p2-test-ui-style";

style.textContent = `
  #p2TestLauncher {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 9998;
    border: 0;
    border-radius: 12px;
    padding: 11px 15px;
    background: #111827;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,.20);
  }

  #p2TestPanel {
    position: fixed;
    right: 18px;
    bottom: 70px;
    width: min(420px, calc(100vw - 36px));
    max-height: 70vh;
    overflow: auto;
    z-index: 9999;
    display: none;
    background: #ffffff;
    color: #111827;
    border: 1px solid #d1d5db;
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 18px 50px rgba(0,0,0,.25);
    font-family: system-ui, sans-serif;
  }

  #p2TestPanel h3 {
    margin: 0 0 6px;
    font-size: 17px;
  }

  #p2TestPanel .p2-subtitle {
    margin-bottom: 14px;
    color: #6b7280;
    font-size: 12px;
  }

  #p2RunButton {
    width: 100%;
    border: 0;
    border-radius: 10px;
    padding: 11px;
    background: #2563eb;
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;
  }

  #p2RunButton:disabled {
    opacity: .55;
    cursor: wait;
  }

  #p2Summary {
    margin: 14px 0;
    padding: 10px;
    border-radius: 10px;
    background: #f3f4f6;
    font-size: 13px;
  }

  .p2-result {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
  }

  .p2-result:last-child {
    border-bottom: 0;
  }

  .p2-pass {
    color: #15803d;
    font-weight: 700;
  }

  .p2-fail {
    color: #dc2626;
    font-weight: 700;
  }

  .p2-skipped {
    color: #b45309;
    font-weight: 700;
  }

  #p2TestClose {
    float: right;
    border: 0;
    background: transparent;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
  }

  #p2TestMessage {
    margin-top: 12px;
    font-size: 12px;
    color: #6b7280;
  }

  .p2-diagnostic {
    margin-top: 8px;
    padding: 8px;
    border-radius: 8px;
    background: #f9fafb;
    font-size: 11px;
    line-height: 1.5;
    word-break: break-word;
  }
`;

document.head.appendChild(style);

}

function createUI() {
if (document.getElementById("p2TestLauncher")) return;

createStyles();

const launcher = document.createElement("button");
launcher.id = "p2TestLauncher";
launcher.type = "button";
launcher.textContent = "P2 Test";

const panel = document.createElement("div");
panel.id = "p2TestPanel";

panel.innerHTML = `
  <button id="p2TestClose" type="button" aria-label="Close">×</button>

  <h3>P2 Authorization Test</h3>

  <div class="p2-subtitle">
    Live authorization boundary test. Access token is never displayed.
  </div>

  <button id="p2RunButton" type="button">
    Jalankan P2 Test
  </button>

  <div id="p2TestMessage"></div>
  <div id="p2Summary"></div>
  <div id="p2Results"></div>
`;

document.body.appendChild(launcher);
document.body.appendChild(panel);

launcher.addEventListener("click", function () {
  panel.style.display =
    panel.style.display === "none" || !panel.style.display
      ? "block"
      : "none";
});

document
  .getElementById("p2TestClose")
  .addEventListener("click", function () {
    panel.style.display = "none";
  });

document
  .getElementById("p2RunButton")
  .addEventListener("click", runP2Test);

}

async function refreshAuthenticationSession() {
if (
typeof supabaseClient === "undefined" ||
!supabaseClient
) {
throw new Error(
"P2_AUTH_CLIENT_UNAVAILABLE"
);
}

const {
  data,
  error
} = await supabaseClient.auth.getSession();

if (error) {
  throw new Error(
    "P2_SESSION_READ_FAILED"
  );
}

if (!data?.session) {
  throw new Error(
    "P2_SESSION_MISSING"
  );
}

/*
 * Force a refresh when Supabase reports an expiring/expired
 * access token. The token itself is never displayed.
 */
const expiresAt =
  Number(data.session.expires_at || 0);

const now =
  Math.floor(Date.now() / 1000);

let session =
  data.session;

if (
  !expiresAt ||
  expiresAt <= now + 60
) {
  const refreshed =
    await supabaseClient.auth.refreshSession();

  if (refreshed.error) {
    throw new Error(
      "P2_SESSION_REFRESH_FAILED"
    );
  }

  if (!refreshed.data?.session) {
    throw new Error(
      "P2_SESSION_REFRESH_EMPTY"
    );
  }

  session =
    refreshed.data.session;
}

/*
 * Keep application state synchronized with the session that
 * will be used by apiRequest().
 */
if (
  typeof state !== "undefined"
) {
  state.session =
    session;

  state.user =
    session.user || null;
}

return session;

}

async function bootstrapWorkspace() {
if (typeof apiRequest !== "function") {
throw new Error(
"P2_API_CLIENT_UNAVAILABLE"
);
}

const result =
  await apiRequest(
    "/me",
    {
      method: "GET"
    },
    false
  );

if (!result) {
  throw new Error(
    "P2_ME_EMPTY_RESPONSE"
  );
}

if (
  result.ok === false
) {
  throw new Error(
    "P2_ME_REJECTED"
  );
}

if (
  typeof state !== "undefined" &&
  result.workspace
) {
  state.workspace =
    result.workspace;
}

if (
  !result.workspace?.id
) {
  throw new Error(
    "P2_WORKSPACE_MISSING"
  );
}

return result;

}

async function runP2Test() {
const button =
document.getElementById(
"p2RunButton"
);

const message =
  document.getElementById(
    "p2TestMessage"
  );

const summary =
  document.getElementById(
    "p2Summary"
  );

const resultsContainer =
  document.getElementById(
    "p2Results"
  );

button.disabled = true;
button.textContent = "Menjalankan...";

message.textContent =
  "Memverifikasi session dan workspace...";

summary.innerHTML = "";
resultsContainer.innerHTML = "";

try {
  if (
    typeof apiRequest !== "function"
  ) {
    throw new Error(
      "P2_API_CLIENT_UNAVAILABLE"
    );
  }

  await refreshAuthenticationSession();

  await bootstrapWorkspace();

  message.textContent =
    "Session valid. Workspace valid. Menjalankan AUTH-001–012...";

  const response =
    await apiRequest(
      "/p2-test",
      {
        method: "POST"
      },
      true
    );

  if (
    !response ||
    !response.results
  ) {
    throw new Error(
      "P2_INVALID_RESPONSE"
    );
  }

  const s =
    response.summary || {};

  summary.innerHTML = `
    <strong>P2 Authorization</strong><br>
    Total: ${Number(s.total || 0)}
    &nbsp;|&nbsp;
    PASS: ${Number(s.passed || 0)}
    &nbsp;|&nbsp;
    FAIL: ${Number(s.failed || 0)}
    &nbsp;|&nbsp;
    SKIPPED: ${Number(s.skipped || 0)}
  `;

  resultsContainer.innerHTML =
    response.results
      .map(function (result) {
        const statusClass =
          result.status === "PASS"
            ? "p2-pass"
            : result.status === "FAIL"
              ? "p2-fail"
              : "p2-skipped";

        return `
          <div class="p2-result">
            <span>
              <strong>${escapeHtml(result.id)}</strong><br>
              ${escapeHtml(result.expected)}
              →
              ${escapeHtml(result.actual)}
            </span>

            <span class="${statusClass}">
              ${escapeHtml(result.status)}
            </span>
          </div>
        `;
      })
      .join("");

  message.textContent =
    response.ok
      ? "P2 selesai. Tidak ada authorization failure."
      : "P2 selesai. Ada test yang gagal.";
} catch (error) {
  const safeMessage =
    error &&
    typeof error.message === "string"
      ? error.message
      : "P2 test gagal dijalankan.";

  message.textContent =
    safeMessage;

  summary.innerHTML = `
    <strong>P2 tidak selesai.</strong>
    <div class="p2-diagnostic">
      Bootstrap gagal sebelum AUTH-001–012 dijalankan.
      Error: ${escapeHtml(safeMessage)}
    </div>
  `;
} finally {
  button.disabled = false;
  button.textContent =
    "Jalankan P2 Test";
}

}

function escapeHtml(value) {
return String(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function waitForApplication() {
let attempts = 0;

const timer =
  setInterval(function () {
    attempts += 1;

    if (
      typeof apiRequest === "function" &&
      typeof supabaseClient !== "undefined" &&
      supabaseClient &&
      document.body
    ) {
      clearInterval(timer);
      createUI();
    }

    if (attempts >= 40) {
      clearInterval(timer);
    }
  }, 250);

}

if (
document.readyState === "loading"
) {
document.addEventListener(
"DOMContentLoaded",
waitForApplication
);
} else {
waitForApplication();
}
})();
