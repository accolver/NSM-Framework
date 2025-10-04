import { j as jsxDevRuntimeExports } from "./index-3d3f4530.js";
import { g as getWordleDashboardServices, f as createWordleMachine, i as initializeLogging, l as logStateTransition, G as GameStatus, d as WordGrid, K as Keyboard, D as DeveloperDashboardToggle, e as WordleExporter, M as ModularDeveloperDashboard, b as NSMClient, W as WordleNSMConnector, h as createWordleNSMDefinition } from "./styles-713b10cd.js";
import "./nsm-a0c8a1fa.js";
import { r as reactExports, R as React } from "./vendor-2603d756.js";
import { c as createActor } from "./state-d52c1337.js";
const NSMWordleApp = ({
  enableNSM = false,
  relayUrls = ["wss://relay.damus.io"],
  privateKey
}) => {
  const actorRef = reactExports.useRef(null);
  const [state, setState] = reactExports.useState(null);
  const [nsmClient, setNSMClient] = reactExports.useState(null);
  const [nsmConnector, setNSMConnector] = reactExports.useState(null);
  const [nsmStatus, setNSMStatus] = reactExports.useState(
    "disconnected"
  );
  const [error, setError] = reactExports.useState(null);
  const [isLoggedIn, setIsLoggedIn] = reactExports.useState(false);
  const [userPubkey, setUserPubkey] = reactExports.useState(null);
  const mainRef = reactExports.useRef(null);
  const [isDashboardVisible, setIsDashboardVisible] = reactExports.useState(true);
  const [dashboardServices] = reactExports.useState(
    () => getWordleDashboardServices({
      enableEventLogging: true,
      enableTimeTravel: true,
      enableInspector: true,
      enableAutoConnect: false
    })
  );
  reactExports.useEffect(() => {
    if (!actorRef.current) {
      actorRef.current = createActor(createWordleMachine());
      actorRef.current.start();
    }
    initializeLogging();
    const actor = actorRef.current;
    const initialSnapshot = actor.getSnapshot();
    setState(initialSnapshot);
    let previousState = initialSnapshot.value;
    const subscription = actor.subscribe((snapshot) => {
      if (snapshot.value !== previousState) {
        logStateTransition(String(previousState), String(snapshot.value), snapshot.context);
        previousState = snapshot.value;
      }
      setState(snapshot);
    });
    dashboardServices.connectToActor(actor);
    return () => {
      subscription.unsubscribe();
      dashboardServices.cleanup();
    };
  }, [dashboardServices]);
  reactExports.useEffect(() => {
    return () => {
      if (actorRef.current) {
        actorRef.current.stop();
        actorRef.current = null;
      }
    };
  }, []);
  reactExports.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [enableNSM]);
  const handleNostrLogin = async () => {
    if (!NSMClient.isNip07Available()) {
      setError(
        "No Nostr extension found. Please install Alby, nos2x, or another NIP-07 extension."
      );
      return;
    }
    try {
      setNSMStatus("connecting");
      setError(null);
      const client = new NSMClient({
        relayUrls: relayUrls || ["wss://relay.damus.io"],
        autoConnect: false,
        useNip07: true
      });
      const hasPermission = await client.requestNip07Permission();
      if (!hasPermission) {
        setError("Permission denied by Nostr extension");
        setNSMStatus("disconnected");
        return;
      }
      const pubkey = await client.getUserPublicKey();
      if (pubkey) {
        setUserPubkey(pubkey);
        setIsLoggedIn(true);
      }
      const connector = new WordleNSMConnector(client, actorRef.current);
      try {
        await connector.initialize();
        setNSMStatus("connected");
      } catch (connectionError) {
        console.warn("NSM connection failed:", connectionError);
        setNSMStatus("disconnected");
        setError("Failed to connect to relays");
      }
      setNSMClient(client);
      setNSMConnector(connector);
      try {
        await createWordleNSMDefinition();
      } catch (defError) {
        console.warn("Could not publish NSM definition:", defError);
      }
    } catch (err) {
      console.error("Failed to login with Nostr:", err);
      setError(err instanceof Error ? err.message : "Failed to login");
      setNSMStatus("error");
    }
  };
  const handleNostrLogout = () => {
    if (nsmConnector) {
      nsmConnector.disconnect();
    }
    setNSMClient(null);
    setNSMConnector(null);
    setIsLoggedIn(false);
    setUserPubkey(null);
    setNSMStatus("disconnected");
    setError(null);
  };
  const wordGrid = React.useMemo(() => {
    if (!state)
      return Array(6).fill([null, null, null, null, null]);
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
  }, [state?.context?.guesses, state?.context?.currentGuess, state?.value]);
  const statusGrid = React.useMemo(() => {
    if (!state)
      return Array(6).fill([null, null, null, null, null]);
    const grid = [];
    for (const guess of state.context.guesses) {
      grid.push(guess.letterStatus);
    }
    while (grid.length < 6) {
      grid.push([null, null, null, null, null]);
    }
    return grid;
  }, [state?.context?.guesses]);
  const keyboardStatus = React.useMemo(() => {
    if (!state)
      return {};
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
  }, [state?.context?.guesses]);
  const handleKeyPress = reactExports.useCallback((letter) => {
    if (!actorRef.current)
      return;
    actorRef.current.send({ type: "KEYPRESS", letter });
  }, []);
  const handleBackspace = reactExports.useCallback(() => {
    if (!actorRef.current)
      return;
    actorRef.current.send({ type: "BACKSPACE" });
  }, []);
  const handleEnter = reactExports.useCallback(() => {
    if (!actorRef.current)
      return;
    actorRef.current.send({ type: "SUBMIT_GUESS" });
  }, []);
  const handleReset = reactExports.useCallback(() => {
    if (!actorRef.current)
      return;
    actorRef.current.send({ type: "RESET_GAME" });
  }, []);
  const handleKeyDown = reactExports.useCallback(
    (event) => {
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
    },
    [handleEnter, handleBackspace, handleKeyPress]
  );
  const renderNSMStatus = () => {
    if (!enableNSM)
      return null;
    const statusColors = {
      disconnected: "#666",
      connecting: "#f39c12",
      connected: "#27ae60",
      error: "#e74c3c"
    };
    return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
      "div",
      {
        className: "nsm-status",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "8px",
          backgroundColor: "#2a2a2a",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#ffffff",
          minWidth: "200px"
        },
        children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { style: { display: "flex", alignItems: "center", gap: "6px" }, children: [
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
              "div",
              {
                style: {
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: statusColors[nsmStatus]
                }
              },
              void 0,
              false,
              {
                fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
                lineNumber: 332,
                columnNumber: 11
              },
              globalThis
            ),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { style: { color: "#ffffff", fontSize: "11px" }, children: [
              "NSM: ",
              nsmStatus
            ] }, void 0, true, {
              fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
              lineNumber: 340,
              columnNumber: 11
            }, globalThis),
            error && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { style: { color: "#ff6b6b", fontSize: "10px" }, children: [
              "(",
              error,
              ")"
            ] }, void 0, true, {
              fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
              lineNumber: 341,
              columnNumber: 21
            }, globalThis)
          ] }, void 0, true, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 331,
            columnNumber: 9
          }, globalThis),
          !isLoggedIn ? /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
            "button",
            {
              onClick: handleNostrLogin,
              disabled: nsmStatus === "connecting",
              style: {
                padding: "4px 8px",
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
                opacity: nsmStatus === "connecting" ? 0.5 : 1
              },
              children: nsmStatus === "connecting" ? "Connecting..." : "Login with Nostr"
            },
            void 0,
            false,
            {
              fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
              lineNumber: 345,
              columnNumber: 11
            },
            globalThis
          ) : /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { style: { fontSize: "10px", color: "#aaa" }, children: userPubkey ? `${userPubkey.substring(0, 6)}...${userPubkey.substring(userPubkey.length - 6)}` : "Connected" }, void 0, false, {
              fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
              lineNumber: 364,
              columnNumber: 13
            }, globalThis),
            /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
              "button",
              {
                onClick: handleNostrLogout,
                style: {
                  padding: "2px 6px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "10px"
                },
                children: "Logout"
              },
              void 0,
              false,
              {
                fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
                lineNumber: 369,
                columnNumber: 13
              },
              globalThis
            )
          ] }, void 0, true, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 363,
            columnNumber: 11
          }, globalThis),
          !NSMClient.isNip07Available() && !isLoggedIn && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { style: { fontSize: "10px", color: "#aaa", marginTop: "2px" }, children: "Install Nostr extension for multiplayer" }, void 0, false, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 387,
            columnNumber: 11
          }, globalThis)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
        lineNumber: 317,
        columnNumber: 7
      },
      globalThis
    );
  };
  const handleDashboardToggle = reactExports.useCallback((isVisible) => {
    setIsDashboardVisible(isVisible);
  }, []);
  return /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
    "main",
    {
      ref: mainRef,
      className: "app app-compact",
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      role: "main",
      "aria-label": "Wordle game with NSM integration",
      "aria-describedby": "game-instructions",
      children: [
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { className: "app-header", children: [
          /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("h1", { children: [
            "Wordle ",
            enableNSM && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("span", { style: { fontSize: "0.6em", color: "#666" }, children: "NSM" }, void 0, false, {
              fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
              lineNumber: 410,
              columnNumber: 34
            }, globalThis)
          ] }, void 0, true, {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 410,
            columnNumber: 9
          }, globalThis),
          enableNSM && renderNSMStatus()
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
          lineNumber: 409,
          columnNumber: 7
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV("div", { id: "game-instructions", className: "sr-only", children: [
          "Guess the 5-letter word in 6 attempts. Use your keyboard or click the virtual keyboard. Green letters are correct, yellow letters are in the word but wrong position, gray letters are not in the word.",
          enableNSM && " This game is connected to the NSM network for distributed state management."
        ] }, void 0, true, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
          lineNumber: 414,
          columnNumber: 7
        }, globalThis),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          GameStatus,
          {
            gameState: state?.value || "playing",
            attemptNumber: state?.context?.attemptNumber || 0,
            hiddenWord: state?.context?.hiddenWord || "",
            onReset: handleReset
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 422,
            columnNumber: 7
          },
          globalThis
        ),
        /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(WordGrid, { wordGrid, statusGrid }, void 0, false, {
          fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
          lineNumber: 429,
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
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 431,
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
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 439,
            columnNumber: 7
          },
          globalThis
        ),
        actorRef.current && /* @__PURE__ */ jsxDevRuntimeExports.jsxDEV(
          WordleExporter,
          {
            actor: actorRef.current,
            showCodeViewer: false,
            enableGameShortcuts: true
          },
          void 0,
          false,
          {
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 446,
            columnNumber: 9
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
            fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
            lineNumber: 455,
            columnNumber: 9
          },
          globalThis
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alancolver/dev/nostr/nsm/apps/poc-wordle/src/components/NSMWordleApp.tsx",
      lineNumber: 400,
      columnNumber: 5
    },
    globalThis
  );
};
export {
  NSMWordleApp
};
//# sourceMappingURL=NSMWordleApp-9974bbac.js.map
