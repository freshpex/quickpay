# ADR 0001: Next.js modular monolith and explicit HTTP boundary

Accepted for this implementation. Use separate web and API Next.js apps, with thin route handlers delegating to feature modules. Browser-safe contracts do not export server modules. A future mobile app uses the same `/api/v1` operations and Better Auth bearer session flow. This preserves the requested framework without coupling business operations to React or cookie-only sessions.

Tradeoff: two Next.js services add deployment work. They keep secret-bearing modules and web rendering clearly separated. A web rewrite provides same-origin browser access.
