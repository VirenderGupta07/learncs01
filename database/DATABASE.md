# LearnCS01.com — Database Design

MongoDB via Mongoose. All models live in `backend/src/models/`. This document
explains how they relate, where transactions are required, and what indices
exist (and why).

## Collections & relationships

```
User ──< purchasedCourses[] >── Course
  │            (embedded ref + Order ref)
  │
  ├──< progress: Map<courseId, ProgressEntry> >── Course
  │       embedded subdocument, NOT a separate collection - it's
  │       per-user-per-course state that's always read/written together
  │       with the User document, so embedding avoids a join on every
  │       course-player page load.
  │
  ├──< Cart (1:1) >── Course (embedded line items)
  │
  ├──< Order (1:many) >── Course (snapshotted items, never live-joined)
  │
  ├──< Certificate (1:many, unique per [user, course]) >── Course
  │
  ├──< ChatRoom (many:many via participants[]) >── Course (optional context)
  │       └──< Message (1:many) >  -- ISOLATED collection, not embedded
  │
  └──< Notification (1:many) >

Course ──< modules[].lectures[] >  -- embedded, bounded by course authoring
                                       (not user-generated, so no unbounded
                                       growth risk)

Coupon ── referenced by Order.couponApplied (snapshot) and validated
           against live Coupon document at purchase + webhook time
```

## Why Messages are a separate collection, not embedded

Chat history is unbounded and user-generated. Embedding messages in `User`
or `ChatRoom` would hit MongoDB's 16MB document cap on any moderately active
conversation and would force loading the entire history on every fetch. The
isolated `Message` collection (indexed on `{ chatRoom: 1, createdAt: -1 }`)
supports proper cursor-based pagination and keeps `ChatRoom` documents small
(just metadata + a `lastMessage` preview).

## Why `progress` is a Map embedded on User, not a separate collection

Per-course progress (completed lectures, quiz attempts, certificate status)
is always read and written together with the user's own session — every
course-player page load needs it, and quiz submission needs to update it
atomically. Keeping it embedded avoids a join on the hottest read path in
the app, at the cost of `User` documents growing with the number of courses
a student takes (bounded in practice — even a power user with 200 purchased
courses keeps this well under MongoDB's document size limit).

## Transactional boundaries (`mongoose.startSession()` + `withTransaction`)

Three places touch more than one collection and must be atomic:

1. **Purchase initialization** (`payment.controller.js`) — creates the
   `Order` document. Single-collection, but wrapped in a session for
   consistency with the settlement path below and to make future
   multi-item-cart checkout (which will also adjust `Coupon`/`Cart`) a
   drop-in extension.
2. **Webhook settlement** (`webhook.controller.js: settleOrderPaid`) — the
   critical one: `Order.paymentStatus → 'paid'`, `User.purchasedCourses`
   push, and `Coupon.usedCount` increment all happen inside one
   transaction. If any step fails, the whole settlement rolls back, so a
   customer can never end up charged-but-locked-out or granted-access-but-
   unbilled.
3. **Quiz verification** (`quiz.controller.js`) — `User.progress` update and
   `Certificate` creation happen together, so a certificate document can
   never exist without the corresponding progress record marking the
   course passed (and vice versa).

PDF generation and S3 upload deliberately happen **outside** any
transaction, in the BullMQ worker — they're slow, external-I/O-bound
operations that have no business holding a MongoDB transaction open.

## Key indices

| Collection | Index | Purpose |
|---|---|---|
| `User` | `email` (unique) | login lookup |
| `User` | `role` | admin staff listing, instructor queries |
| `Course` | `slug` (unique) | public course page lookup |
| `Course` | `{ title, description, tags }` (text) | catalog search |
| `Course` | `{ category, isPublished }` | catalog filtering |
| `Course` | `instructor` | instructor's own course list |
| `Order` | `orderNumber` (unique) | gateway tran_id correlation |
| `Order` | `user` | billing history |
| `Order` | `paymentStatus` | admin/ops queries |
| `Order` | `sslcommerz.tranId` | webhook lookup |
| `Coupon` | `code` (unique) | redemption lookup |
| `ChatRoom` | `participants` | inbox listing, 1:1 room lookup |
| `Message` | `{ chatRoom, createdAt: -1 }` | paginated history |
| `Certificate` | `{ user, course }` (unique) | one certificate per completion |
| `Notification` | `{ recipient, isRead, createdAt: -1 }` | notification bell |

## Scaling notes (500 → 5,000 daily active users)

- **MongoDB**: a replica set is mandatory regardless of scale, since the
  transactional writes above require one (a single standalone `mongod`
  cannot run multi-document transactions). A 3-node Atlas M10/M20 replica
  set comfortably serves this range; read load can be pointed at secondaries
  later if the catalog/search endpoints become hot.
- **Connection pooling**: `maxPoolSize: 20` per Node process (see
  `config/db.js`) — with 2-4 API instances behind a load balancer, that's
  well within typical Atlas connection limits at this tier.
- **Redis**: backs BullMQ (certificate generation) and can later back
  Socket.io's Redis adapter once the API scales beyond one process, so
  WebSocket events still fan out correctly across instances.
- **Video cost**: YouTube hosting is free; S3 is pay-per-GB-stored and
  pay-per-GB-served, so the admin dashboard's choice of source per lecture
  directly controls infrastructure cost — this is why video attachment is a
  deliberate, permissioned admin action rather than an automatic instructor
  upload.
- **No sharding needed at this scale.** Revisit only if course/message
  volume grows by another order of magnitude.
