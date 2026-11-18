import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../Redux/store";
import { setToken } from "../slices/authSLice";
import {
  RENEWAL_RETRY_DELAY_MS,
  expireSession,
  isTokenExpired,
  msUntilRenewal,
  readStoredToken,
  renewSession,
} from "../utils/session";

/**
 * Keeps the signed-in session alive for as long as the tab is being used.
 *
 * Mounted once, by ProtectedRoute, so it covers every authenticated screen and
 * survives navigation between them. It renews the token a few minutes before
 * `exp`, so no screen ever meets a 401 it cannot explain, and it gives up
 * honestly — at the login screen, with a reason — once the token is genuinely
 * past expiry.
 *
 * The timer is a self-rescheduling chain rather than an interval: each run
 * decides when the next one is due from the token actually in hand, which is
 * what makes it correct after a laptop sleep, a renewal that failed, or a
 * token picked up from another tab.
 */
export const useSessionRenewal = () => {
  const dispatch = useDispatch();
  const reduxToken = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const run = async () => {
      if (cancelled) return;

      const token = readStoredToken();

      // Signed out rather than expired; the route guard owns that case.
      if (!token) return;

      if (isTokenExpired(token)) {
        expireSession();

        return;
      }

      const due = msUntilRenewal(token) ?? 0;

      if (due > 0) {
        window.clearTimeout(timer);
        timer = window.setTimeout(run, due);

        return;
      }

      // A success stores a new token, which re-runs this effect through redux
      // and schedules the next renewal from the new `exp`.
      if (await renewSession()) return;
      if (cancelled) return;

      // The API refusing us has already ended the session inside
      // renewSession. Reaching here means the call did not land — offline, or
      // the API restarting — while the token is still good for a few minutes,
      // so there is time to try again.
      window.clearTimeout(timer);
      timer = window.setTimeout(run, RENEWAL_RETRY_DELAY_MS);
    };

    /**
     * Browsers throttle timers in background tabs and freeze them while the
     * machine sleeps, so a tab coming back may be well past its renewal point.
     * Checking on wake is what keeps a long-idle tab from returning dead.
     */
    const onWake = () => {
      if (document.visibilityState === "hidden") return;

      void run();
    };

    /** A renewal in another tab is this tab's new token too. */
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "token" || event.storageArea !== localStorage) return;
      if (!event.newValue || event.newValue === reduxToken) return;

      dispatch(setToken(event.newValue));
    };

    void run();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("storage", onStorage);
    };
  }, [dispatch, reduxToken]);
};

export default useSessionRenewal;
