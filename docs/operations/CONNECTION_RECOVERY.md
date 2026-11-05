# Connection recovery

The website and native app share `createConnectionRecovery` from the browser-safe API client. It probes the existing public `/api/v1/health` endpoint before requests when readiness has not been confirmed within the last minute. Concurrent callers share one bounded probe. Normal activity refreshes the readiness timestamp; there is no periodic keep-awake ping.

After 500 ms the apps show **Securing connection…** and explain that they are getting things ready. After 15 seconds the message acknowledges the longer wait. Probes have a 12-second timeout, wait three seconds between attempts and stop after two minutes. A failed check offers Try again. Offline detection stops submissions instead of holding them for replay. Inputs and the current page remain in place. Sign-in and signup buttons reflect the connection phase while their own submissions are busy. Native splash hiding allows the connection feedback to become visible during session restoration.

GET/HEAD requests can be repeated once after a transport/gateway interruption and successful readiness check. POST/PATCH/DELETE and all other writes are **never automatically repeated after dispatch**. Unknown write outcomes stay unknown; financial flows retain their original idempotency reference and recover authoritative status. Signup advises checking email or signing in before another submission if its dispatched response was lost. Genuine JSON API validation, permission and provider errors retain their existing handling.

Readiness is a connectivity check, not an additional security handshake or authentication proof. Backend authorization remains unchanged. Native Better Auth requests use the same connection coordinator through its custom fetch integration with automatic fetch retries disabled. Existing signed credentials stay in SecureStore. Failed readiness never revokes a session or clears private data; actual server revocation still does.

There are no global server-connecting banners. Auth forms keep their inline button loading state while waiting for readiness. Native queries invalidate after a failed connection recovers; session screens retain their reconnect action.

The website is a Next.js static export on Render's CDN. It loads independently of the backend. The same-origin `/api/v1/*` rewrite forwards requests to the API; only API operations can wait for its free service to wake up. See [Render deployment](RENDER.md).
