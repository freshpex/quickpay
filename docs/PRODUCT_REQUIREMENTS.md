You are the lead software architect, full-stack engineer, product designer, and motion designer for QUICK PAY.

Build the application in this workspace. Do not only describe a plan or generate a landing page. Implement the marketing website, customer application, admin application, backend API, database models, integrations, tests, and documentation.

Read existing repository instructions and inspect the workspace before making changes. Preserve useful existing work.

Make sensible implementation decisions and continue working without repeatedly asking for approval. Ask only when a missing business decision or credential genuinely blocks dependent work, and continue other work while waiting.

Treat the following requirements as acceptance criteria.

1. PRODUCT AND AUDIENCE

Quick Pay is a payment platform for people in Nigeria.

Users should be able to:

- Create an account and verify their contact details.
- Deposit money into their wallet.
- Withdraw money to a Nigerian bank account.
- Buy airtime and data.
- Pay electricity, television, internet, education, and other supported Nigerian bills.
- Buy gift cards.
- Sell supported gift cards and receive payment after verification.
- Exchange supported gift-card value into naira through a clear quote and settlement process.
- Refer people and earn rewards when those people complete qualifying bill payments.
- View transactions, receipts, rewards, and support requests.

Use NGN as the default currency, Nigerian phone-number handling, and Africa/Lagos for user-facing local times. Store timestamps consistently in UTC.

“Pay anything” is the product ambition. Build an extensible service catalog that can grow as providers and business agreements become available. Only show a service as available when its integration and configuration support it.

Treat broader currency exchanges as a separately controlled capability with explicit supported pairs, quote rules, settlement rules, and verified provider support. Do not silently interpret “exchange” as permission to create a cryptocurrency trading platform.

Use simple English that ordinary Nigerian customers can understand.

2. REQUIRED TECHNOLOGY

Use:

- Next.js with TypeScript for the frontend.
- Next.js with TypeScript and Route Handlers for the backend HTTP API.
- Next.js App Router.
- Tailwind CSS throughout the frontend.
- PostgreSQL with a suitable typed ORM and migrations.
- Schema validation for API requests, forms, and environment variables.
- Accessible UI primitives where helpful.
- Motion for React and/or GSAP with ScrollTrigger for advanced animation.
- A durable background-job system for provider processing, notifications, retries, and reconciliation.

Check current official documentation before selecting dependency versions and framework APIs.

Use a monorepo with clear application and package boundaries. Prefer pnpm workspaces unless the existing repository has another established package manager.

Suggested applications:

- apps/web: marketing website, authentication, customer dashboard, admin interface.
- apps/api: Next.js backend exposing /api/v1.
- apps/worker: background processing when a separate worker process is required.

The worker supports the Next.js backend. Do not replace the requested API with an unrelated backend framework.

Shared packages may include:

- API contracts and validation schemas.
- A generated or typed API client.
- Database access and migrations.
- Reusable UI primitives.
- Shared linting and TypeScript configuration.

Keep database access, provider secrets, and server-only code out of browser-safe packages.

3. ARCHITECTURE AND FUTURE MOBILE APP

Use a modular monolith with clear domain boundaries and a versioned API that a future mobile app can consume.

Use TOGAF-inspired architectural thinking:

- Business capabilities and workflows.
- Application boundaries and responsibilities.
- Data ownership and lifecycle.
- Technology and deployment architecture.
- Security and operational controls.
- Architecture decision records.

Do not confuse a folder tree with TOGAF compliance. Document the architectural decisions and keep the implementation practical.

The future mobile application must be able to use the same backend without depending on Next.js pages, React components, browser cookies alone, or Server Actions.

All core business operations must be accessible through the versioned API. Design authentication so secure browser sessions and a future mobile token flow can be supported through the same identity system.

Use these backend modules where applicable:

- auth
- users
- verification
- wallets
- ledger
- deposits
- withdrawals
- payments
- billers
- airtime
- data
- gift-cards
- exchanges
- referrals
- rewards
- notifications
- support
- admin
- audit

Each module owns its relevant routes, schemas, services, repository code, domain logic, documentation, middleware, jobs, and tests.

Do not put every service in a global services folder, every middleware in one global middleware folder, and every controller in one global controllers folder.

Shared infrastructure belongs in a shared infrastructure area. Feature-specific implementation belongs inside its feature.

4. REQUIRED FOLDER STRUCTURE

Follow this pattern, adapting names to the actual application:

apps/
web/
src/
app/
(marketing)/
(auth)/
(customer)/
admin/
features/
landing/
components/
hero/
Hero.tsx
index.ts
service-marquee/
ServiceMarquee.tsx
index.ts
stacked-cards/
StackedCards.tsx
index.ts
walking-story/
WalkingStory.tsx
index.ts
animations/
hooks/
LandingPage.tsx
index.ts
auth/
components/
sign-up-form/
SignUpForm.tsx
index.ts
sign-in-form/
SignInForm.tsx
index.ts
schemas/
hooks/
api/
types/
index.ts
wallet/
components/
balance-card/
BalanceCard.tsx
index.ts
tabs/
transactions-tab/
TransactionsTab.tsx
index.ts
modals/
deposit-modal/
DepositModal.tsx
index.ts
withdrawal-modal/
WithdrawalModal.tsx
index.ts
hooks/
schemas/
api/
types/
WalletPage.tsx
index.ts
bills/
gift-cards/
referrals/
settings/
support/
admin/
features/
reward-rules/
users/
transactions/
service-catalog/
gift-card-review/
components/
ui/
button/
input/
password-input/
checkbox/
dialog/
layout/
header/
footer/
sidebar/
mobile-navigation/
feedback/
toast/
empty-state/
loading-state/
error-state/
navigation/
protected-route/
breadcrumbs/
lib/
providers/

api/
src/
app/
api/
v1/
payments/
route.ts
payments/
[paymentId]/
route.ts
v1/
modules/
payments/
routes/
create-payment/
handler.ts
index.ts
get-payment/
handler.ts
index.ts
docs/
payments.openapi.ts
index.ts
schemas/
create-payment.schema.ts
index.ts
services/
create-payment/
create-payment.service.ts
index.ts
domain/
payment-state/
payment-state.ts
index.ts
repositories/
payment.repository.ts
index.ts
middleware/
payment-permissions/
payment-permissions.ts
index.ts
providers/
jobs/
tests/
index.ts
wallets/
referrals/
rewards/
gift-cards/
admin/
shared/
auth/
errors/
logging/
idempotency/
infrastructure/
observability/

packages/
contracts/
api-client/
database/
ui/
config/

docs/
architecture/
decisions/
integrations/
operations/

Next.js requires route.ts files inside its routing directory. Keep those files thin and delegate to the appropriate module handlers.

Keep page.tsx files thin too. They should compose feature components.

Create subfolders when they contain real responsibilities. Do not generate empty folders merely to make the project look large.

Use index.ts files for deliberate public exports. Avoid circular barrel imports.

Do not force backend modules to contain frontend-style components. Use backend components only where they represent actual composable server behavior.

5. VISUAL DIRECTION: EXPRESSIVE AND FULL OF MOTION

This is a firm creative requirement:

I WANT A VISUALLY RICH, ANIMATION-HEAVY WEBSITE.

Do not simplify it into a restrained, static fintech template. Do not reduce the motion because you personally prefer minimal design.

For visitors using normal motion settings, intentionally favor abundant animation, layered scenes, bold typography, expressive transitions, and rich visual storytelling.

Choose a distinctive brand direction and implement it consistently:

- Strong typography.
- Confident colors.
- Large visual compositions.
- Real photography and people.
- Layered product demonstrations.
- Contrasting section backgrounds.
- Carefully designed cards and controls.
- Distinctive section transitions.
- A polished mobile experience.

Avoid making the whole website a repeated grid of rounded cards.

Required landing-page experiences:

A. Animated hero

- Large, readable headline.
- Clear primary and secondary actions.
- Layered wallet, bill, receipt, or gift-card previews.
- Coordinated entrance animation.
- Ambient looping motion that continues after entry.
- Real human photography or footage integrated into the composition.

B. Moving service and brand strip

- Actual logos for supported services.
- Continuous movement with pause controls where needed.
- Correct proportions and clear labels.

C. Scroll-stacked cards

- At least three substantial cards that visibly stack over one another as the visitor scrolls.
- Each card explains a real product capability.
- Use deliberate depth, scaling, and transitions.

D. Pinned product story

- A section that remains in place while scrolling advances through several product states.
- Synchronize the headline, product preview, and supporting copy.
- Keep all content readable without animation.

E. Walking-person sequence

- Use properly licensed footage, a transparent person cutout, or a suitable image sequence.
- Make the person travel through the scene as scrolling advances.
- Coordinate the person’s movement with the surrounding content.
- Do not substitute a generic walking-person icon.

F. Changing call to action

- Change the CTA presentation or supporting text as visitors move through the product story.
- Keep the destination and current action understandable.
- Preserve keyboard focus and stable accessible names.

G. Gift-card showcase

- Animated card fans, overlapping cards, flips, or a horizontal reveal.
- Use genuine supported gift-card brand assets.

H. Referral story

- Show the sequence from invitation to qualifying bill payment to earned reward.
- Use animated connections, receipts, progress, or wallet movement.
- Any displayed reward must reflect an active rule or be clearly identified as an illustration.

I. Human video or animated media

- Include relevant short video loops, GIFs, or image sequences.
- Prefer efficient video formats for large animated content.
- Use muted inline playback where appropriate.
- Include poster images and fallbacks.

J. Additional motion throughout

- Section reveals.
- Hover and press feedback.
- Animated navigation.
- Transaction status transitions.
- Background movement.
- Progress indicators.
- Carefully chosen text transitions.

Deliver at least 10 distinct motion treatments. Simple fade-ins repeated everywhere do not satisfy this requirement.

Do not stop after animating only the hero.

6. MOTION QUALITY, MOBILE, AND ACCESSIBILITY

Preserve the abundance of motion while engineering it properly.

- Respect prefers-reduced-motion with a complete alternative experience.
- Provide pause controls for persistent motion where appropriate.
- Avoid flashing content.
- Do not hijack normal scrolling.
- Do not make animation completion a requirement for using a button or form.
- Avoid running expensive off-screen animations.
- Clean up animation subscriptions and scroll triggers.
- Prefer transforms and opacity when practical.
- Adapt pinned and horizontal scenes for narrow screens.
- Do not load large desktop videos unnecessarily on mobile.
- Preserve content when videos fail or JavaScript is unavailable.

The marketing site can be theatrical. Payment screens must still let users complete tasks quickly and understand what is happening.

7. REAL IMAGES, LOGOS, AND MEDIA

Search online for suitable real media.

Use:

- Real photography relevant to Nigerian users.
- Real people and everyday settings.
- Authentic supported service logos.
- Real gift-card brand assets.
- Properly licensed video, GIFs, or image sequences.

Do not use:

- AI-generated people or lifestyle photography.
- Invented provider logos.
- Broken image URLs.
- Placeholder image services.
- Random unrelated stock photos.
- A set of generic illustrations as the entire visual identity.
- Fabricated partner claims.

Prefer official brand resources and reputable licensed media sources.

Record source URLs, usage rights, and required attribution in an asset register. Store and serve assets according to their licenses. Optimize dimensions and formats.

Create a deliberate Quick Pay wordmark if a brand asset does not exist. Clearly distinguish our own branding from third-party trademarks.

Do not imply that displaying a company’s logo establishes a commercial partnership.

8. ICONS AND WRITING

Do not use Sparkles icons anywhere.

Do not decorate unrelated features with random stars, magic wands, rockets, or AI-themed icons.

Use a consistent modern icon set and choose icons that match the actual action:

- Phone for airtime.
- Appropriate utility symbols for bills.
- Wallet for wallet actions.
- Bank for bank transfers.
- Gift card for gift-card actions.

Use real brand logos for service selection when available.

Customer copy must be short, natural, and clear.

Good examples:

- “Pay your bills in a few taps.”
- “Add money.”
- “Withdraw to your bank.”
- “Buy airtime.”
- “Check your payment.”
- “Invite friends. Earn rewards.”

Avoid:

- “Unlock seamless financial empowerment.”
- “Revolutionize your financial journey.”
- “Experience the future of limitless possibilities.”
- Excessive technical language.
- Unnecessary em dashes.
- Fake testimonials, customer counts, awards, or success statistics.

Do not expose provider errors, stack traces, or internal infrastructure details in customer messages.

9. AUTHENTICATION AND ACCOUNT SECURITY

Implement:

- Sign up.
- Sign in.
- Contact verification.
- Forgot password.
- Reset password.
- Secure session handling.
- Logout.
- Account settings.
- Appropriate transaction authorization.

The signup form must include:

- Full name.
- Email.
- Nigerian phone number.
- Password.
- Confirm password.
- Optional referral code.
- An unchecked checkbox accepting Terms and Conditions and the Privacy Policy, with working links.

Record the accepted policy version and timestamp.

Every password field must have an accessible eye/show-hide button, including confirm password and password-reset screens.

Create one reusable PasswordInput component and use it consistently.

Requirements:

- Correct autocomplete attributes.
- Password-manager support.
- Clear password requirements.
- Server-side validation.
- Field-specific errors.
- Keyboard-accessible controls.
- Loading and disabled states.
- Rate limiting.
- Secure password hashing through an established authentication implementation.
- Secure, HttpOnly cookies for browser sessions.
- CSRF protection where applicable.

Require stronger authentication for administrators. Enforce authorization on the server, not only through hidden navigation or frontend route guards.

Use roles and explicit permissions. A logged-in customer must never gain admin privileges by changing client state.

10. CUSTOMER APPLICATION

Build complete responsive screens for:

- Dashboard.
- Wallet.
- Deposit.
- Withdrawal.
- Airtime.
- Data.
- Bill categories and billers.
- Gift-card buying.
- Gift-card selling.
- Supported exchanges.
- Referral and reward history.
- Transaction history.
- Transaction details and receipts.
- Notifications.
- Profile and security.
- Saved beneficiaries.
- Support requests.

Bill-payment flow:

1. Choose a category and provider.
2. Enter the required account, phone, meter, or smartcard details.
3. Validate the beneficiary when the provider supports it.
4. Select the amount or plan.
5. Review beneficiary, amount, fees, and total.
6. Authorize payment.
7. Show an accurate processing state.
8. Provide confirmation and a receipt when verified.

Display electricity tokens and similar fulfillment details securely and clearly.

Gift-card selling must include:

- Supported brand and region.
- Card type.
- Amount.
- Quote and expiry.
- Required evidence or secure upload.
- Review status.
- Acceptance or rejection with a reason.
- Settlement status.
- A support/dispute path.

Never automatically credit a gift-card sale merely because a user uploaded an image.

11. ADMIN APPLICATION AND CONFIGURABLE REWARDS

Build a protected admin interface with permission-controlled access to:

- Users and verification.
- Transactions.
- Deposits and withdrawals.
- Service catalog and availability.
- Fees and limits.
- Gift-card products and rates.
- Gift-card sale reviews.
- Exchange quotes and supported capabilities.
- Referral and reward settings.
- Support.
- Audit history.
- Operational and reconciliation issues.

Referral logic must be editable by authorized admins without a code deployment.

Support configuration for:

- Percentage reward.
- Fixed naira reward.
- Which party receives the reward.
- Eligible bill categories and services.
- First qualifying payment or recurring qualifying payments.
- Minimum payment amount.
- Whether the calculation uses payment value or platform revenue.
- A maximum reward per transaction.
- Per-user and campaign caps.
- Start and end dates.
- Pending/holding period.
- Claiming and withdrawal eligibility.
- Enable/disable controls.
- Effective date and rule version.

Use a structured, validated rules model. Never execute arbitrary admin-written JavaScript or eval expressions.

Provide:

- Human-readable rule summaries.
- A preview calculator using sample transaction amounts.
- Clear validation of conflicting or incomplete settings.
- Audit records identifying who changed what and when.
- Permission checks on every relevant endpoint.

Persist the applicable reward-rule version with each reward. New settings must not silently rewrite historical rewards.

Award rewards only for verified qualifying transactions.

Handle:

- Duplicate events.
- Self-referrals.
- Repeated claims.
- Failed and reversed payments.
- Refund-related reward reversals.
- Suspicious referral activity.
- Concurrent processing.

Do not hardcode a reward percentage in frontend copy.

12. PAYMENTS, WALLETS, AND FINANCIAL CORRECTNESS

Treat financial correctness as a core requirement.

- Store money using integer minor units or an exact decimal representation.
- Never use floating-point arithmetic for balances or fees.
- Use an immutable double-entry ledger.
- Keep available funds, reserved funds, and reward balances explicit.
- Derive or maintain balances through transactional ledger operations.
- Prevent double spending under concurrent requests.
- Use database transactions and appropriate locking or concurrency controls.
- Require idempotency for money-moving requests.
- Persist provider references and internal references.
- Deduplicate webhook processing.
- Authenticate provider webhooks using current official instructions.
- Verify amount, currency, destination, and transaction identity before posting funds.
- Never credit money based only on a browser redirect or frontend success message.

Model transaction states explicitly:

- Created.
- Awaiting authorization.
- Processing.
- Successful.
- Failed.
- Reversed.
- Cancelled where applicable.

A timeout does not automatically mean failure. Keep uncertain transactions pending until reconciled.

For withdrawals:

- Validate the destination.
- Reserve the funds atomically.
- Initiate the transfer safely.
- Settle or release the reservation according to verified final status.

Do not hold a database transaction open across a slow provider request. Use durable orchestration and an outbox or equivalent reliable mechanism.

Refunds and corrections must create compensating entries. Do not erase financial history.

Implement scheduled reconciliation and an admin workflow for unresolved transactions.

Administrators must not edit wallet balance fields directly. Any authorized adjustment must have a reason, appropriate permissions, and corresponding ledger entries.

13. PROVIDER INTEGRATIONS

Research current official provider documentation before implementing integrations.

Evaluate appropriate providers for:

- Collections and deposits.
- Nigerian bank withdrawals.
- Bill payments.
- Airtime and data.
- Gift-card purchasing.
- Gift-card resale or an explicit internal review workflow.
- Identity verification where required.

Paystack and VTpass are examples to investigate, not assumptions that one account or provider supports every requirement.

Build replaceable provider adapters with typed contracts. Keep provider-specific payloads out of domain logic and frontend components.

Load service availability and plan catalogs from supported provider APIs where practical.

Do not invent:

- API endpoints.
- Provider credentials.
- Gift-card resale capabilities.
- Bank account details.
- Successful financial transactions.

If credentials or commercial access are missing:

- Complete the adapter structure and configuration.
- Provide explicitly isolated sandbox/local development behavior.
- Keep simulated outcomes out of live mode.
- Disable unconfigured live operations with useful messages.
- Document the exact remaining setup.
- Continue implementing work that does not depend on the missing access.

Never silently fall back from live payments to mock success.

14. TAILWIND AND REUSABLE COMPONENTS

Use Tailwind utilities for:

- Layout.
- Spacing.
- Typography.
- Colors.
- Responsive behavior.
- Hover and focus states.
- Standard transitions.
- Borders, shadows, and visual effects.

Use reusable design tokens and variants.

Do not create plain CSS files for styling that Tailwind can express.

A small global stylesheet may contain required Tailwind imports, theme tokens, and necessary global defaults. Custom CSS is acceptable only for a concrete limitation that Tailwind and the chosen animation tools cannot reasonably address. Document the reason.

Use animation libraries for complex motion rather than scattering imperative animation code throughout components.

Build reusable components for:

- Password inputs.
- Form fields.
- Buttons.
- Dialogs.
- Drawers.
- Status badges.
- Money display.
- Provider selectors.
- Transaction summaries.
- Receipts.
- Tables.
- Empty, loading, and error states.

Keep feature-specific components within their owning feature.

Avoid giant files containing an entire application, all dialogs, all forms, and all business logic.

15. RESPONSIVE BEHAVIOR AND FEEDBACK

Design for mobile first and verify at approximately:

- 360px.
- 390px.
- 768px.
- 1024px.
- 1440px.

Requirements:

- No accidental horizontal overflow.
- Comfortable touch targets.
- Useful mobile navigation.
- Responsive forms and dialogs.
- Tables that become usable cards or appropriately scrollable views.
- No crowded rows of action buttons.
- Labels for important controls.
- Accessible focus states.
- Clear loading, empty, success, pending, and error states.

Use top-right toast feedback on larger screens and an appropriate visible position on mobile. Keep field errors beside their fields.

Payment status changes must be announced accessibly.

16. SECURITY AND OPERATIONS

Implement relevant controls for:

- Input validation.
- Resource ownership.
- Admin permissions.
- Rate limiting.
- Secret handling.
- Sensitive-data redaction.
- Secure file uploads.
- Private access to gift-card evidence.
- Encryption for sensitive stored values.
- Dependency hygiene.
- Structured logs.
- Correlation IDs.
- Health checks.
- Job retries and failed-job handling.
- Backups and migrations.
- Separate development, staging, and production configuration.

Do not put secrets in source control or expose server secrets through public environment variables.

Use hosted payment collection where appropriate rather than handling raw card data.

Document provider onboarding, verification, operating permissions, privacy, and policy decisions that require business review before launch. Do not invent licenses, regulatory approval, or legal claims.

17. TESTING AND PROOF

Run checks appropriate to the implementation:

- Lint.
- Type checking.
- Production builds.
- Focused unit tests.
- Database integration tests.
- API authorization tests.
- Browser end-to-end tests.

Financial tests must cover:

- Duplicate deposits.
- Duplicate webhooks.
- Invalid webhook authentication.
- Incorrect amount or currency.
- Concurrent withdrawal requests.
- Insufficient funds.
- Provider timeouts.
- Failed and reversed transfers.
- Reward duplication.
- Rule-version changes.
- Refund-related reward reversals.
- Unauthorized admin access.
- Cross-user resource access.

Browser checks must cover:

- Signup and password controls.
- Confirm-password validation.
- Terms acceptance.
- Bill-payment flow.
- Withdrawal flow.
- Referral-rule editing.
- Mobile navigation.
- Landing-page motion.
- Reduced-motion behavior.
- Missing or failed media.
- Narrow-screen layouts.

Actually inspect the rendered application. Do not claim visual quality from code inspection alone.

Record which checks passed and distinguish:

- Local simulated behavior.
- Provider sandbox verification.
- Live provider verification.
- Browser verification.
- Production deployment verification.

Do not describe the product as production-ready when critical integrations or operational checks remain unverified.

18. DELIVERY WORKFLOW

Start by:

1. Inspecting the workspace and repository instructions.
2. Writing a concise implementation plan.
3. Defining the architecture and domain model.
4. Creating a visual direction and explicit motion checklist.
5. Implementing the application in working increments.

Build the expressive landing page early, then continue through the customer flows, backend, admin tools, financial handling, and verification.

Do not spend the entire task producing architecture documents while leaving the application unbuilt.

Maintain a persistent checklist so requirements are not lost during a long implementation.

Do not stop at:

- A static landing page.
- A dashboard with fake balances.
- Decorative forms with no backend behavior.
- An admin page that cannot save settings.
- Mock provider responses presented as real integrations.
- A folder tree with empty implementation files.

Deliver:

- Working source code.
- Database migrations.
- Safe development seed data.
- An environment-variable example without secrets.
- Setup and run instructions.
- OpenAPI/Swagger documentation.
- Architecture and integration documentation.
- Asset source and license records.
- Test results.
- Browser screenshots or other available visual evidence.
- A precise list of unresolved external dependencies.

Persist the important project rules in an appropriate repository instruction file so future work follows the same structure, visual direction, and security requirements.

For the Frontend
Role Colour Hex
Main brand, primary buttons Violet #6D28D9
Dark sections, footer Deep purple #2E1065
Main background Warm white #FAF9FF
Promotional accents, referral highlights Lime #D9F86C
Main text Dark ink #191425
Use white text on violet buttons and dark text on lime backgrounds. Keep green for successful payments, amber for pending payments, and red for errors.
For the landing page, alternate warm-white sections with bold violet and deep-purple scenes. Let photography, moving cards, and occasional lime accents bring the energy.
violet as the identity, lime as the accent. Avoid covering everything in pale lavender or making every section a purple gradient.

FINAL ACCEPTANCE RULE

Quick Pay must look expressive, modern, human, and full of movement.

The normal-motion landing page must contain the requested stacked cards, changing CTA, walking-person story, real media, animated gift cards, and multiple scroll-driven scenes.

Do not quietly turn my request into a minimal website.

At the same time, the payment system must have clear states, reliable financial records, secure permissions, editable referral rules, and an API architecture that supports a future mobile app.

Begin implementation now.
