var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { j as jsxDevRuntimeExports } from "./index-3d3f4530.js";
import { r as reactExports, R as React } from "./vendor-2603d756.js";
import { N as NDKPrivateKeySigner, a as NDKNip07Signer, b as NSMClient, W as WordleNSMConnector, g as getWordleDashboardServices, i as initializeLogging, l as logStateTransition, c as logGameEvent, G as GameStatus, d as WordGrid, K as Keyboard, D as DeveloperDashboardToggle, e as WordleExporter, M as ModularDeveloperDashboard, w as wordleMachine } from "./styles-713b10cd.js";
import "./nsm-a0c8a1fa.js";
import { c as createActor } from "./state-d52c1337.js";
const NostrLogin = ({
  authService,
  className = ""
}) => {
  const [authState, setAuthState] = reactExports.useState(authService.getAuthState());
  const [nsecInput, setNsecInput] = reactExports.useState("");
  const [isLoading, setIsLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [success, setSuccess] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const handleAuthChange = (newState) => {
      setAuthState(newState);
      setIsLoading(false);
      setError(null);
      if (newState.isAuthenticated) {
        setSuccess(`Logged in as ${newState.npub}`);
        setNsecInput("");
      }
    };
    authService.addEventListener("login", handleAuthChange);
    authService.addEventListener("logout", handleAuthChange);
    authService.addEventListener("error", handleAuthChange);
    return () => {
      authService.removeEventListener("login", handleAuthChange);
      authService.removeEventListener("logout", handleAuthChange);
      authService.removeEventListener("error", handleAuthChange);
    };
  }, [authService]);
  const handleNsecLogin = async () => {
    if (!nsecInput.trim()) {
      setError("Please enter your private key");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await authService.loginWithNsec(nsecInput.trim());
      if (!result.success) {
        setError(result.error || "Login failed");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Unexpected error during login");
      setIsLoading(false);
    }
  };
  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await authService.loginWithNip07();
      if (!result.success) {
        setError(result.error || "Extension login failed");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Unexpected error during extension login");
      setIsLoading(false);
    }
  };
  const handleLogout = () => {
    authService.logout();
    setSuccess(null);
    setError(null);
  };
  const handleNsecInputChange = (e) => {
    setNsecInput(e.target.value);
    if (error)
      setError(null);
    if (success)
      setSuccess(null);
  };
  if (authState.isAuthenticated) {
    return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: `nostr-login authenticated ${className}`, children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "user-info", children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "connection-status", children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "status-indicator connected" }, void 0, false, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
            lineNumber: 107,
            columnNumber: 13
          }, globalThis),
          "Connected as:"
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 106,
          columnNumber: 11
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "npub", title: authState.npub || "", children: authState.npub }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 110,
          columnNumber: 11
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "method", children: [
          "Method: ",
          authState.method === "nsec" ? "Private Key" : "Browser Extension"
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 113,
          columnNumber: 11
        }, globalThis)
      ] }, void 0, true, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
        lineNumber: 105,
        columnNumber: 9
      }, globalThis),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "button",
        {
          className: "logout-button",
          onClick: handleLogout,
          disabled: isLoading,
          children: "Logout"
        },
        void 0,
        false,
        {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 117,
          columnNumber: 9
        },
        globalThis
      )
    ] }, void 0, true, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
      lineNumber: 104,
      columnNumber: 7
    }, globalThis);
  }
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: `nostr-login unauthenticated ${className}`, children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h3", { children: "Login to Nostr" }, void 0, false, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
      lineNumber: 131,
      columnNumber: 7
    }, globalThis),
    error && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "error-message", role: "alert", children: error }, void 0, false, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
      lineNumber: 134,
      columnNumber: 9
    }, globalThis),
    success && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "success-message", role: "status", children: success }, void 0, false, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
      lineNumber: 140,
      columnNumber: 9
    }, globalThis),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "login-method nsec-login", children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h4", { children: "Private Key (nsec)" }, void 0, false, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
        lineNumber: 147,
        columnNumber: 9
      }, globalThis),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "security-warning", children: "⚠️ Warning: Never share your private key with anyone!" }, void 0, false, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
        lineNumber: 148,
        columnNumber: 9
      }, globalThis),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "input",
        {
          type: "password",
          placeholder: "nsec1...",
          value: nsecInput,
          onChange: handleNsecInputChange,
          className: "nsec-input",
          disabled: isLoading,
          "aria-label": "Enter your Nostr private key"
        },
        void 0,
        false,
        {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 152,
          columnNumber: 9
        },
        globalThis
      ),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "button",
        {
          onClick: handleNsecLogin,
          disabled: isLoading || !nsecInput.trim(),
          className: "login-button nsec-button",
          children: isLoading ? "Logging in..." : "Login with nsec"
        },
        void 0,
        false,
        {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 162,
          columnNumber: 9
        },
        globalThis
      )
    ] }, void 0, true, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
      lineNumber: 146,
      columnNumber: 7
    }, globalThis),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "login-method extension-login", children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h4", { children: "Extension Login" }, void 0, false, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
        lineNumber: 173,
        columnNumber: 9
      }, globalThis),
      authService.isNip07Available() ? /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "button",
        {
          onClick: handleExtensionLogin,
          disabled: isLoading,
          className: "login-button extension-button",
          children: isLoading ? "Connecting..." : "Login with Extension"
        },
        void 0,
        false,
        {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 176,
          columnNumber: 11
        },
        globalThis
      ) : /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "extension-unavailable", children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { children: "No Nostr extension found" }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 185,
          columnNumber: 13
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("p", { className: "help-text", children: [
          "Install a Nostr extension like",
          " ",
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("a", { href: "https://getalby.com", target: "_blank", rel: "noopener noreferrer", children: "Alby" }, void 0, false, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
            lineNumber: 188,
            columnNumber: 15
          }, globalThis),
          " or ",
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("a", { href: "https://github.com/fiatjaf/nos2x", target: "_blank", rel: "noopener noreferrer", children: "nos2x" }, void 0, false, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
            lineNumber: 192,
            columnNumber: 15
          }, globalThis)
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
          lineNumber: 186,
          columnNumber: 13
        }, globalThis)
      ] }, void 0, true, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
        lineNumber: 184,
        columnNumber: 11
      }, globalThis)
    ] }, void 0, true, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
      lineNumber: 172,
      columnNumber: 7
    }, globalThis),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("style", { jsx: true, children: `
        .nostr-login {
          padding: 1rem;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          background: #fff;
          margin: 1rem 0;
        }

        .nostr-login h3 {
          margin-top: 0;
          color: #1a202c;
        }

        .error-message {
          background: #fed7d7;
          color: #c53030;
          padding: 0.75rem;
          border-radius: 4px;
          margin: 0.5rem 0;
        }

        .success-message {
          background: #c6f6d5;
          color: #22543d;
          padding: 0.75rem;
          border-radius: 4px;
          margin: 0.5rem 0;
        }

        .login-method {
          margin: 1.5rem 0;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f7fafc;
        }

        .login-method h4 {
          margin-top: 0;
          color: #2d3748;
        }

        .security-warning {
          background: #fed7d7;
          color: #744210;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
          margin: 0.5rem 0;
        }

        .nsec-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9rem;
          margin: 0.5rem 0;
        }

        .nsec-input:focus {
          outline: none;
          border-color: #3182ce;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        }

        .login-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          background: #3182ce;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .login-button:hover:not(:disabled) {
          background: #2c5282;
        }

        .login-button:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }

        .extension-unavailable {
          color: #718096;
        }

        .help-text {
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .help-text a {
          color: #3182ce;
          text-decoration: underline;
        }

        .authenticated .user-info {
          margin-bottom: 1rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }

        .status-indicator.connected {
          background: #48bb78;
        }

        .npub {
          font-family: monospace;
          background: #edf2f7;
          padding: 0.5rem;
          border-radius: 4px;
          word-break: break-all;
          margin: 0.5rem 0;
        }

        .method {
          color: #718096;
          font-size: 0.9rem;
          margin: 0;
        }

        .logout-button {
          background: #e53e3e;
        }

        .logout-button:hover:not(:disabled) {
          background: #c53030;
        }
      ` }, void 0, false, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
      lineNumber: 200,
      columnNumber: 7
    }, globalThis)
  ] }, void 0, true, {
    fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NostrLogin.tsx",
    lineNumber: 130,
    columnNumber: 5
  }, globalThis);
};
const NSMStatus = ({ className = "", authService }) => {
  const [authState, setAuthState] = reactExports.useState(authService.getAuthState());
  const [showLogin, setShowLogin] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const handleAuthChange = (newState) => {
      setAuthState(newState);
      if (newState.isAuthenticated) {
        setShowLogin(false);
      }
    };
    authService.addEventListener("login", handleAuthChange);
    authService.addEventListener("logout", handleAuthChange);
    return () => {
      authService.removeEventListener("login", handleAuthChange);
      authService.removeEventListener("logout", handleAuthChange);
    };
  }, [authService]);
  const handleLoginClick = () => {
    setShowLogin(true);
  };
  const handleCloseLogin = () => {
    setShowLogin(false);
  };
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(jsxDevRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: `nsm-status ${className}`, children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "nsm-status-text", children: authState.isAuthenticated ? /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(jsxDevRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "status-indicator connected" }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
          lineNumber: 46,
          columnNumber: 15
        }, globalThis),
        "NSM: Connected"
      ] }, void 0, true, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
        lineNumber: 45,
        columnNumber: 13
      }, globalThis) : /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(jsxDevRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "status-indicator disconnected" }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
          lineNumber: 51,
          columnNumber: 15
        }, globalThis),
        "NSM: Not Connected"
      ] }, void 0, true, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
        lineNumber: 50,
        columnNumber: 13
      }, globalThis) }, void 0, false, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
        lineNumber: 43,
        columnNumber: 9
      }, globalThis),
      authState.isAuthenticated ? /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "user-info", children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { className: "user-npub", title: authState.npub || "", children: [
          authState.npub?.slice(0, 16),
          "..."
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
          lineNumber: 59,
          columnNumber: 13
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          "button",
          {
            className: "nsm-logout-button",
            onClick: () => authService.logout(),
            "aria-label": "Logout from Nostr",
            children: "Logout"
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
            lineNumber: 62,
            columnNumber: 13
          },
          globalThis
        )
      ] }, void 0, true, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
        lineNumber: 58,
        columnNumber: 11
      }, globalThis) : /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
        "button",
        {
          className: "nsm-login-button",
          onClick: handleLoginClick,
          "aria-label": "Login to Nostr",
          children: "Login"
        },
        void 0,
        false,
        {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
          lineNumber: 71,
          columnNumber: 11
        },
        globalThis
      )
    ] }, void 0, true, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
      lineNumber: 42,
      columnNumber: 7
    }, globalThis),
    showLogin && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "login-modal", children: [
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "login-modal-backdrop", onClick: handleCloseLogin }, void 0, false, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
        lineNumber: 83,
        columnNumber: 11
      }, globalThis),
      /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "login-modal-content", children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "login-modal-header", children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h3", { children: "Connect to Nostr" }, void 0, false, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
            lineNumber: 86,
            columnNumber: 15
          }, globalThis),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
            "button",
            {
              className: "close-button",
              onClick: handleCloseLogin,
              "aria-label": "Close login modal",
              children: "×"
            },
            void 0,
            false,
            {
              fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
              lineNumber: 87,
              columnNumber: 15
            },
            globalThis
          )
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
          lineNumber: 85,
          columnNumber: 13
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(NostrLogin, { authService }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
          lineNumber: 95,
          columnNumber: 13
        }, globalThis)
      ] }, void 0, true, {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
        lineNumber: 84,
        columnNumber: 11
      }, globalThis)
    ] }, void 0, true, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
      lineNumber: 82,
      columnNumber: 9
    }, globalThis),
    /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("style", { jsx: true, children: `
        .nsm-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          font-size: 0.9rem;
        }

        .nsm-status-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.connected {
          background: #48bb78;
        }

        .status-indicator.disconnected {
          background: #e53e3e;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-npub {
          font-family: monospace;
          font-size: 0.8rem;
          color: #718096;
        }

        .nsm-login-button,
        .nsm-logout-button {
          padding: 0.4rem 0.8rem;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          background: #fff;
          color: #2d3748;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nsm-login-button {
          border-color: #3182ce;
          color: #3182ce;
        }

        .nsm-login-button:hover {
          background: #3182ce;
          color: white;
        }

        .nsm-logout-button {
          border-color: #e53e3e;
          color: #e53e3e;
        }

        .nsm-logout-button:hover {
          background: #e53e3e;
          color: white;
        }

        .login-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .login-modal-content {
          position: relative;
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .login-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .login-modal-header h3 {
          margin: 0;
          color: #1a202c;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #718096;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #2d3748;
        }
      ` }, void 0, false, {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
      lineNumber: 100,
      columnNumber: 7
    }, globalThis)
  ] }, void 0, true, {
    fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMStatus.tsx",
    lineNumber: 41,
    columnNumber: 5
  }, globalThis);
};
class NostrAuthService {
  constructor() {
    __publicField(this, "authState", {
      isAuthenticated: false,
      npub: null,
      method: null,
      signer: null
    });
    __publicField(this, "listeners", /* @__PURE__ */ new Map());
    this.listeners.set("login", /* @__PURE__ */ new Set());
    this.listeners.set("logout", /* @__PURE__ */ new Set());
    this.listeners.set("error", /* @__PURE__ */ new Set());
  }
  /**
   * Validate nsec key format
   */
  validateNsecKey(nsecKey) {
    if (!nsecKey || typeof nsecKey !== "string") {
      return false;
    }
    if (!nsecKey.startsWith("nsec1") || nsecKey.length < 60) {
      return false;
    }
    return true;
  }
  /**
   * Check if NIP-07 extension is available
   */
  isNip07Available() {
    return typeof window !== "undefined" && typeof window.nostr !== "undefined" && typeof window.nostr.getPublicKey === "function";
  }
  /**
   * Login with nsec private key
   */
  async loginWithNsec(nsecKey) {
    try {
      if (!this.validateNsecKey(nsecKey)) {
        return {
          success: false,
          error: "Invalid nsec key format"
        };
      }
      const signer = this.createPrivateKeySigner(nsecKey);
      const user = await signer.user();
      const npub = user.npub;
      this.authState = {
        isAuthenticated: true,
        npub,
        method: "nsec",
        signer
      };
      this.notifyListeners("login", this.authState);
      return {
        success: true,
        npub,
        method: "nsec"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to login with nsec: ${errorMessage}`
      };
    }
  }
  /**
   * Login with NIP-07 browser extension
   */
  async loginWithNip07() {
    try {
      if (!this.isNip07Available()) {
        return {
          success: false,
          error: "NIP-07 extension not found. Please install a Nostr extension like Alby or nos2x."
        };
      }
      const signer = this.createNip07Signer();
      await signer.blockUntilReady();
      const user = await signer.user();
      const npub = user.npub;
      this.authState = {
        isAuthenticated: true,
        npub,
        method: "nip07",
        signer
      };
      this.notifyListeners("login", this.authState);
      return {
        success: true,
        npub,
        method: "nip07"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to login with extension: ${errorMessage}`
      };
    }
  }
  /**
   * Logout and clear authentication state
   */
  logout() {
    this.authState = {
      isAuthenticated: false,
      npub: null,
      method: null,
      signer: null
    };
    this.notifyListeners("logout", this.authState);
  }
  /**
   * Get current authentication state
   */
  getAuthState() {
    return { ...this.authState };
  }
  /**
   * Get current signer for NDK
   */
  getSigner() {
    return this.authState.signer || null;
  }
  /**
   * Add event listener for auth state changes
   */
  addEventListener(event, listener) {
    this.listeners.get(event)?.add(listener);
  }
  /**
   * Remove event listener
   */
  removeEventListener(event, listener) {
    this.listeners.get(event)?.delete(listener);
  }
  /**
   * Private helper to create NDK private key signer
   */
  createPrivateKeySigner(nsecKey) {
    return new NDKPrivateKeySigner(nsecKey);
  }
  /**
   * Private helper to create NDK NIP-07 signer
   */
  createNip07Signer() {
    return new NDKNip07Signer();
  }
  /**
   * Private helper to notify listeners
   */
  notifyListeners(event, state) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error(`Error in auth listener for ${event}:`, error);
        }
      });
    }
  }
}
class NSMAuthIntegration {
  constructor(authService) {
    __publicField(this, "nsmClient", null);
    this.authService = authService;
    this.authService.addEventListener("login", this.handleLogin.bind(this));
    this.authService.addEventListener("logout", this.handleLogout.bind(this));
  }
  /**
   * Create or recreate NSM client with current signer
   */
  async updateNSMClient() {
    const signer = this.authService.getSigner();
    if (signer) {
      this.nsmClient = new NSMClient({
        autoConnect: true,
        ndk: void 0,
        // Let NSMClient create NDK instance with signer
        privateKey: void 0,
        useNip07: void 0
      });
      this.nsmClient["ndk"].signer = signer;
      try {
        await this.nsmClient.connect();
        console.log("NSM client connected with authenticated signer");
      } catch (error) {
        console.warn("Failed to connect NSM client:", error);
      }
    } else {
      this.nsmClient = null;
    }
  }
  async handleLogin() {
    await this.updateNSMClient();
  }
  handleLogout() {
    this.nsmClient = null;
  }
  /**
   * Get the current NSM client instance
   */
  getNSMClient() {
    return this.nsmClient;
  }
  /**
   * Check if NSM is ready for publishing (authenticated + connected)
   */
  isReadyForPublishing() {
    return this.authService.getAuthState().isAuthenticated && this.nsmClient !== null;
  }
  /**
   * Get connection status for display
   */
  getConnectionStatus() {
    const authState = this.authService.getAuthState();
    return {
      isAuthenticated: authState.isAuthenticated,
      isConnected: this.nsmClient !== null,
      canPublish: this.isReadyForPublishing(),
      npub: authState.npub
    };
  }
}
class WordleNSMSetup {
  constructor(nsmAuthIntegration, actor) {
    __publicField(this, "nsmConnector", null);
    this.nsmAuthIntegration = nsmAuthIntegration;
    this.actor = actor;
    const authService = this.nsmAuthIntegration["authService"];
    authService.addEventListener("login", this.handleAuthLogin.bind(this));
    authService.addEventListener("logout", this.handleAuthLogout.bind(this));
  }
  async handleAuthLogin() {
    const nsmClient = this.nsmAuthIntegration.getNSMClient();
    if (nsmClient && !this.nsmConnector) {
      try {
        console.log("Setting up NSM connector with authenticated client");
        this.nsmConnector = new WordleNSMConnector(nsmClient, this.actor);
        await this.nsmConnector.initialize();
        console.log("NSM connector initialized successfully");
      } catch (error) {
        console.error("Failed to initialize NSM connector:", error);
        this.nsmConnector = null;
      }
    }
  }
  handleAuthLogout() {
    if (this.nsmConnector) {
      console.log("Disconnecting NSM connector due to logout");
      this.nsmConnector.disconnect();
      this.nsmConnector = null;
    }
  }
  /**
   * Get current connection status
   */
  getConnectionStatus() {
    const authStatus = this.nsmAuthIntegration.getConnectionStatus();
    return {
      isAuthenticated: authStatus.isAuthenticated,
      isNSMConnected: this.nsmConnector?.isConnected || false,
      canPublish: authStatus.canPublish && (this.nsmConnector?.isConnected || false)
    };
  }
  /**
   * Force reconnection (useful for debugging)
   */
  async reconnect() {
    if (this.nsmAuthIntegration.isReadyForPublishing()) {
      await this.handleAuthLogin();
    }
  }
  /**
   * Clean up connections
   */
  cleanup() {
    if (this.nsmConnector) {
      this.nsmConnector.disconnect();
      this.nsmConnector = null;
    }
  }
}
const App = () => {
  const [actor] = reactExports.useState(() => createActor(wordleMachine));
  const [state, setState] = reactExports.useState(() => actor.getSnapshot());
  const [isDashboardVisible, setIsDashboardVisible] = reactExports.useState(true);
  const [dashboardServices] = reactExports.useState(() => getWordleDashboardServices({
    enableEventLogging: true,
    enableTimeTravel: true,
    enableInspector: true,
    enableAutoConnect: false
    // We'll connect manually after actor starts
  }));
  const [authService] = reactExports.useState(() => new NostrAuthService());
  const [nsmAuthIntegration] = reactExports.useState(() => new NSMAuthIntegration(authService));
  const [wordleNSMSetup] = reactExports.useState(() => new WordleNSMSetup(nsmAuthIntegration, actor));
  reactExports.useEffect(() => {
    initializeLogging();
    actor.start();
    let previousState = actor.getSnapshot().value;
    let previousContext = actor.getSnapshot().context;
    const subscription = actor.subscribe((snapshot) => {
      if (snapshot.value !== previousState) {
        logStateTransition(
          String(previousState),
          String(snapshot.value),
          snapshot.context
        );
        previousState = snapshot.value;
      }
      if (snapshot.context.currentGuess !== previousContext.currentGuess) {
        logGameEvent(`Typed: "${snapshot.context.currentGuess}"`, {
          currentGuess: snapshot.context.currentGuess,
          letterCount: snapshot.context.currentGuess.length,
          attemptNumber: snapshot.context.attemptNumber
        });
      }
      previousContext = snapshot.context;
      setState(snapshot);
    });
    dashboardServices.connectToActor(actor);
    return () => {
      subscription.unsubscribe();
      actor.stop();
      dashboardServices.cleanup();
      wordleNSMSetup.cleanup();
    };
  }, [actor, dashboardServices, wordleNSMSetup]);
  const wordGrid = React.useMemo(() => {
    const grid = [];
    for (const guess of state.context.guesses) {
      grid.push(guess.word.split(""));
    }
    if (state.value === "playing") {
      const currentRow = state.context.currentGuess.split("");
      while (currentRow.length < 5) {
        currentRow.push(null);
      }
      grid.push(currentRow);
    }
    while (grid.length < 6) {
      grid.push([null, null, null, null, null]);
    }
    return grid;
  }, [state.context.guesses, state.context.currentGuess, state.value]);
  const statusGrid = React.useMemo(() => {
    const grid = [];
    for (const guess of state.context.guesses) {
      grid.push(guess.letterStatus);
    }
    while (grid.length < 6) {
      grid.push([null, null, null, null, null]);
    }
    return grid;
  }, [state.context.guesses]);
  const keyboardStatus = React.useMemo(() => {
    const keyStatus = {};
    for (const guess of state.context.guesses) {
      for (let i = 0; i < guess.word.length; i++) {
        const letter = guess.word[i];
        const status = guess.letterStatus[i];
        if (keyStatus[letter] === "correct")
          continue;
        if (keyStatus[letter] === "present" && status === "absent")
          continue;
        if (status) {
          keyStatus[letter] = status;
        }
      }
    }
    return keyStatus;
  }, [state.context.guesses]);
  const handleKeyPress = reactExports.useCallback((letter) => {
    actor.send({ type: "KEYPRESS", letter });
  }, [actor]);
  const handleBackspace = reactExports.useCallback(() => {
    actor.send({ type: "BACKSPACE" });
  }, [actor]);
  const handleEnter = reactExports.useCallback(() => {
    actor.send({ type: "SUBMIT_GUESS" });
  }, [actor]);
  const handleReset = reactExports.useCallback(() => {
    actor.send({ type: "RESET_GAME" });
  }, [actor]);
  const handleKeyDown = reactExports.useCallback((event) => {
    const key = event.key.toUpperCase();
    if (key === "ENTER") {
      event.preventDefault();
      handleEnter();
    } else if (key === "BACKSPACE") {
      event.preventDefault();
      handleBackspace();
    } else if (/^[A-Z]$/.test(key)) {
      event.preventDefault();
      handleKeyPress(key);
    }
  }, [handleEnter, handleBackspace, handleKeyPress]);
  const handleDashboardToggle = reactExports.useCallback((isVisible) => {
    setIsDashboardVisible(isVisible);
  }, []);
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
    "main",
    {
      className: "app app-compact",
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      role: "main",
      "aria-label": "Wordle game",
      "aria-describedby": "game-instructions",
      children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("header", { className: "app-header", children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h1", { children: "Wordle" }, void 0, false, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
            lineNumber: 196,
            columnNumber: 9
          }, globalThis),
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(NSMStatus, { authService }, void 0, false, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
            lineNumber: 197,
            columnNumber: 9
          }, globalThis)
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
          lineNumber: 195,
          columnNumber: 7
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { id: "game-instructions", className: "sr-only", children: "Guess the 5-letter word in 6 attempts. Use your keyboard or click the virtual keyboard. Green letters are correct, yellow letters are in the word but wrong position, gray letters are not in the word." }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
          lineNumber: 200,
          columnNumber: 7
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          GameStatus,
          {
            gameState: state.value,
            attemptNumber: state.context.attemptNumber,
            hiddenWord: state.context.hiddenWord,
            onReset: handleReset
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
            lineNumber: 206,
            columnNumber: 7
          },
          globalThis
        ),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(WordGrid, { wordGrid, statusGrid }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
          lineNumber: 213,
          columnNumber: 7
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          Keyboard,
          {
            keyboardStatus,
            onKeyPress: handleKeyPress,
            onBackspace: handleBackspace,
            onEnter: handleEnter
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
            lineNumber: 215,
            columnNumber: 7
          },
          globalThis
        ),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          DeveloperDashboardToggle,
          {
            onToggle: handleDashboardToggle,
            initiallyVisible: isDashboardVisible
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
            lineNumber: 223,
            columnNumber: 7
          },
          globalThis
        ),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          WordleExporter,
          {
            actor,
            showCodeViewer: false,
            enableGameShortcuts: true
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
            lineNumber: 229,
            columnNumber: 7
          },
          globalThis
        ),
        isDashboardVisible && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          ModularDeveloperDashboard,
          {
            eventLogService: dashboardServices.eventLogService,
            timeTravelService: dashboardServices.timeTravelService,
            inspectorService: dashboardServices.inspectorService,
            connectInspector: dashboardServices.connectInspector,
            openVisualizer: dashboardServices.openVisualizer,
            className: "wordle-dashboard"
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
            lineNumber: 237,
            columnNumber: 9
          },
          globalThis
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/App.tsx",
      lineNumber: 187,
      columnNumber: 5
    },
    globalThis
  );
};
export {
  App
};
//# sourceMappingURL=App-690dceda.js.map
