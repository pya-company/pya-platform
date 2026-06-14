// @pya-company/reviews — 5-star reviews + running-average rounding.
//
// Pyaeats-app has the canonical implementation in
// `apps/api/src/features/reviews/reviews.repo.ts`. The shape is already
// generic — `targetId` works for any reviewable entity. Phase 6 moves it
// here, parameterises the SQL table name (`store_reviews` ↔ `reviews`),
// and exposes `createReviewsRepo({ db, tableName })`.

export {}
