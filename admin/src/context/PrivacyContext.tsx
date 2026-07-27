"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/** Tempo em que valores/dados ficam visíveis após o operador revelar pelo olho do header. */
export const PRIVACY_REVEAL_MS = 30_000;

interface PrivacyContextType {
  privacyMode: boolean;
  togglePrivacy: () => void;
  sensitiveHidden: boolean;
  toggleSensitive: () => void;
  /** Conta VIEWER: olho travado fechado, sem toggle. */
  privacyLocked: boolean;
  /** Duração da revelação temporária (ms). */
  revealMs: number;
}

const PrivacyContext = createContext<PrivacyContextType>({
  privacyMode: true,
  togglePrivacy: () => {},
  sensitiveHidden: true,
  toggleSensitive: () => {},
  privacyLocked: false,
  revealMs: PRIVACY_REVEAL_MS,
});

function clearTimer(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function PrivacyProvider({
  children,
  privacyLocked = false,
}: {
  children: React.ReactNode;
  privacyLocked?: boolean;
}) {
  const [privacyMode, setPrivacyMode] = useState(true);
  const [sensitiveHidden, setSensitiveHidden] = useState(true);
  const privacyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensitiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hidePrivacy = useCallback(() => {
    clearTimer(privacyTimerRef);
    setPrivacyMode(true);
    try {
      localStorage.setItem("unghero_privacy_v2", "true");
    } catch {
      /* ignore */
    }
    document.body.classList.add("privacy-active");
  }, []);

  const hideSensitive = useCallback(() => {
    clearTimer(sensitiveTimerRef);
    setSensitiveHidden(true);
    try {
      localStorage.setItem("unghero_sensitive_hidden", "true");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (privacyLocked) {
      clearTimer(privacyTimerRef);
      clearTimer(sensitiveTimerRef);
      setPrivacyMode(true);
      setSensitiveHidden(true);
      document.body.classList.add("privacy-active");
      document.body.classList.add("viewer-privacy-lock");
      return () => {
        document.body.classList.remove("viewer-privacy-lock");
      };
    }

    document.body.classList.remove("viewer-privacy-lock");
    // Sempre começa oculto — revelação é temporária (não restaura "mostrar" do localStorage).
    hidePrivacy();
    hideSensitive();

    return () => {
      clearTimer(privacyTimerRef);
      clearTimer(sensitiveTimerRef);
    };
  }, [privacyLocked, hidePrivacy, hideSensitive]);

  const togglePrivacy = () => {
    if (privacyLocked) return;
    setPrivacyMode((prev) => {
      const nextHidden = !prev;
      if (nextHidden) {
        clearTimer(privacyTimerRef);
        try {
          localStorage.setItem("unghero_privacy_v2", "true");
        } catch {
          /* ignore */
        }
        document.body.classList.add("privacy-active");
        return true;
      }
      try {
        localStorage.setItem("unghero_privacy_v2", "false");
      } catch {
        /* ignore */
      }
      document.body.classList.remove("privacy-active");
      clearTimer(privacyTimerRef);
      privacyTimerRef.current = setTimeout(() => {
        hidePrivacy();
      }, PRIVACY_REVEAL_MS);
      return false;
    });
  };

  const toggleSensitive = () => {
    if (privacyLocked) return;
    setSensitiveHidden((prev) => {
      const nextHidden = !prev;
      if (nextHidden) {
        clearTimer(sensitiveTimerRef);
        try {
          localStorage.setItem("unghero_sensitive_hidden", "true");
        } catch {
          /* ignore */
        }
        return true;
      }
      try {
        localStorage.setItem("unghero_sensitive_hidden", "false");
      } catch {
        /* ignore */
      }
      clearTimer(sensitiveTimerRef);
      sensitiveTimerRef.current = setTimeout(() => {
        hideSensitive();
      }, PRIVACY_REVEAL_MS);
      return false;
    });
  };

  return (
    <PrivacyContext.Provider
      value={{
        privacyMode: privacyLocked ? true : privacyMode,
        togglePrivacy,
        sensitiveHidden: privacyLocked ? true : sensitiveHidden,
        toggleSensitive,
        privacyLocked,
        revealMs: PRIVACY_REVEAL_MS,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
