# LabLink Platform v1 PRD

## Summary
LabLink is a managed donation marketplace for surplus scientific and clinical equipment. Donor labs list available equipment, recipient institutions request items, and LabLink admins verify organizations, approve listings, arbitrate competing requests, and coordinate fulfillment. v1 is not a checkout-based ecommerce marketplace and does not process buyer-to-seller payments.

## Product Goals
- Make it easy for labs to donate usable surplus equipment.
- Help verified schools, hospitals, nonprofits, and research institutions discover and request equipment they can actually use.
- Give admins the controls needed to keep allocations fair, safe, and operationally manageable.
- Produce a measurable record of fulfilled donations and downstream impact.

## Non-Goals For v1
- No mobile app.
- No automated matching or ranking engine.
- No volunteer courier network.
- No buyer-to-seller checkout flow, tax handling, or marketplace payments.
- No open direct-message system outside listing or request workflows.

## User Roles
### Donor Lab
Organizations with surplus equipment to donate, including universities, research labs, and biotech organizations.

Core capabilities:
- Create and manage equipment listings.
- Respond to admin-reviewed recipient requests.
- Track active, matched, and completed donations.

### Recipient Institution
Verified schools, hospitals, nonprofits, community organizations, and research institutions that need equipment.

Core capabilities:
- Browse public listings.
- Submit equipment requests after institution verification.
- Track pending and fulfilled requests.
- Save listings for later.

### Admin
LabLink operators who manage trust, access, review, and fulfillment workflows.

Core capabilities:
- Verify institutions.
- Approve, reject, and moderate listings.
- Review competing requests and select recipients.
- Monitor request-linked messaging.
- Track fulfillment and maintain auditability.

## Marketplace Access And Trust Model
- Listings are publicly viewable without logging in.
- Only verified institutions can post listings or submit requests.
- New accounts enter a pending verification state until admin review is complete.
- Admin verification is required before a user can transact on behalf of an institution.
- Accounts can be suspended or restricted if an institution loses eligibility or violates platform policy.

## Product Scope
### Core v1 Workflows
1. A donor lab creates a listing and submits it for approval.
2. An admin reviews the listing and publishes it if approved.
3. A verified recipient institution browses listings and submits a request.
4. An admin reviews requests, resolves competition when multiple institutions request the same item, and selects the recipient.
5. The donor confirms the match.
6. Admin coordinates pickup or transfer manually.
7. The donation is marked complete and recorded in reporting.

### Future Phases, Not v1
- Volunteer transport network with student couriers.
- Gamification, points, and leaderboards.
- Automated matching or prioritization logic.
- Expanded payments beyond optional platform donations.

## Functional Requirements
### Authentication And Accounts
- Users can sign up and log in.
- Users select an institution type during onboarding.
- Each account belongs to an institution record.
- Institution access remains pending until admin verification.
- Admins can approve, reject, suspend, or reactivate accounts.
- Duplicate institution records should be reviewable and mergeable by admins.

### Listings
Donor labs can create, edit, and remove their own listings before fulfillment, subject to admin controls.

Required listing fields:
- Item title
- Category
- Condition
- Quantity
- Photos
- Location
- Availability window
- Description
- Dimensions and weight
- Handling requirements
- Working status
- Warranty or supporting documentation included
- Hazardous or special handling flags
- Pickup-only or shipment-possible indicator
- Donor decontamination PDF completed in the LabLink modal editor
- Donor liability release PDF completed in the LabLink modal editor

Listing rules:
- New listings enter `Pending Admin Approval`.
- Listing submission requires the donor to complete and save the active decontamination and liability PDFs before admin review.
- Completed compliance PDFs are visible to admins during listing verification and are not exposed in the public catalog.
- Material edits to a live listing after requests exist should return the listing to review before remaining available.
- Listings can be removed or expired by admins.
- If a donor removes a listing with existing requests, open requests must be closed with a clear status.

### Requests
Verified recipient institutions can submit requests for live listings.

Required request fields:
- Intended use
- Institution type
- Program or department
- Age group or learner audience, when applicable
- Urgency or needed-by date
- Delivery constraints
- Storage and readiness confirmation
- Funding or logistics notes, if relevant

Request rules:
- Multiple institutions can request the same item.
- Only admins select the final recipient in v1.
- Requests cannot be submitted by unverified users.
- Requests can be rejected, cancelled, or closed if the listing is removed or matched elsewhere.

### Messaging
- Messaging is tied to a specific listing or request thread.
- Messaging starts only after a valid request exists or an admin opens the thread.
- Admins can read active threads for safety and operational oversight.
- Admins can lock or disable a thread if it violates policy.

### Dashboards
#### Donor Dashboard
- Active listings with status, category, and posting date.
- Quick actions to edit, remove, or mark fulfilled when allowed.
- Donation history with recipient institution and fulfillment date.
- Basic impact summary, such as total items donated or institutions served.

#### Recipient Dashboard
- Pending requests with a visible status pipeline.
- Fulfilled requests archive.
- Saved or favorited listings with availability state.
- Request-linked message threads.

#### Admin Panel
- Institution verification queue.
- Listing moderation queue.
- Request management with request competition visibility.
- User management across donors and recipients.
- Conversation monitoring for active threads.
- Fulfillment tracking and status updates.

### Equipment Request Board
Recipients can post wanted-item requests for equipment that is not currently listed.

Rules:
- Request board posts are visible to verified donor labs and admins.
- Donors can respond by creating a new listing tied to the request board post.
- Request board activity does not bypass listing approval or recipient verification.

### Payments
- Stripe is optional and limited to platform donations to LabLink.
- v1 does not support buyer-to-seller equipment payments.

## Lifecycle Definitions
### Listing Lifecycle
`Draft -> Pending Admin Approval -> Live -> Under Review -> Matched/Reserved -> Fulfilled -> Removed/Expired`

Definitions:
- `Draft`: donor has not submitted the listing.
- `Pending Admin Approval`: awaiting moderation before publication.
- `Live`: publicly visible and requestable.
- `Under Review`: at least one request exists and allocation is being evaluated.
- `Matched/Reserved`: recipient selected and item is no longer open to new matches.
- `Fulfilled`: transfer completed and recorded.
- `Removed/Expired`: listing withdrawn, rejected, or timed out.

### Request Lifecycle
`Submitted -> Admin Review -> Awaiting Donor Confirmation -> Approved/Matched -> Pickup/Transfer Coordination -> Completed -> Rejected/Cancelled`

Definitions:
- `Submitted`: recipient completed the request form.
- `Admin Review`: request is being assessed, potentially alongside competing requests.
- `Awaiting Donor Confirmation`: admin selected a recipient and is waiting on donor acknowledgement.
- `Approved/Matched`: donor and admin confirmed the match.
- `Pickup/Transfer Coordination`: logistics are being handled manually.
- `Completed`: recipient received the item and fulfillment is closed.
- `Rejected/Cancelled`: request will not proceed.

## Admin Review And Allocation Criteria
Admins should use documented criteria when choosing among eligible recipients:
- Mission fit
- Expected educational, clinical, or research impact
- Recipient urgency
- Recipient storage and operational readiness
- Geographic feasibility
- Donor constraints and preferences

## Edge Cases And Policy Decisions
- If multiple recipients request the same item, admins review all requests before selecting one recipient.
- If a donor edits a listing after requests exist, admins may require re-approval before the listing remains live.
- If a donor removes a listing after requests exist, those requests should move to a closed or cancelled state with an explanation.
- If an institution is verified and later loses eligibility, admins can suspend the account and freeze open activity.
- Listings may include multiple units, partial quantities, or bundled accessories and must represent that clearly.
- Oversized, fragile, regulated, or training-dependent equipment requires explicit handling notes and may be restricted by admins.
- Misleading photos or incomplete safety information can trigger listing rejection or removal.
- If a matched recipient cannot coordinate pickup within the agreed window, admins can cancel the match and reassign the item.
- If either side becomes unresponsive, admins can enforce timeout policies and close the transaction.
- Messaging that attempts to bypass platform rules or contains inappropriate content can be reviewed, locked, or removed by admins.
- Recipient permissions should account for district-level or institution-level authority rather than assuming any individual user can request on behalf of the organization.
- Public visitors can browse but must create and verify an account before requesting or posting.
- Duplicate accounts from the same institution must be reviewable by admins to avoid fragmented history.
- Request board posts and direct listings must not create duplicate active fulfillment paths for the same item.
- Completed donations should store enough confirmation data for impact reporting even without integrated shipping workflows.

## Non-Functional Requirements
- Role-based access control across public, pending-verification, verified donor, verified recipient, and admin states.
- Audit trail for admin actions, including verification, approvals, rejections, suspensions, and status changes.
- Image upload limits and basic validation for file type and size.
- Search and filter performance appropriate for a public catalog experience.
- Moderation and reporting capability for listings and messages.
- Email notifications for account verification, listing approval, request status changes, and fulfillment milestones.

## Pages And Visibility
### Public
- Home / landing page
- Browse equipment
- Item detail
- About / FAQ
- Sign up / log in

### Verified Donor
- Post equipment
- Donor dashboard
- Listing detail and messaging for owned listings

### Verified Recipient
- Request equipment
- Recipient dashboard
- Saved listings
- Request detail and messaging for owned requests

### Admin
- Admin panel
- Verification queue
- Listing moderation queue
- Request management
- Conversation monitoring

## Success Metrics
- Number of verified donor institutions
- Number of verified recipient institutions
- Number of approved live listings
- Request-to-match conversion rate
- Fulfilled donations
- Time from listing submission to approval
- Time from request submission to match decision
- Reported recipient impact

## Suggested Tech Stack
### Frontend
- Next.js with React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Figma for design workflows
- Vercel for hosting

### Backend
- FastAPI
- PostgreSQL via Supabase
- SQLAlchemy
- Amazon S3 for file and image storage
- Supabase authentication
- Stripe only for optional platform donations

## Delivery Notes For Engineering
- Treat the product as a managed marketplace, not a standard ecommerce checkout system.
- Use donor and recipient terminology throughout product and code.
- Build explicit status models for accounts, listings, and requests.
- Keep messaging scoped to request workflows.
- Keep the volunteer transport concept out of the initial implementation.
