(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-TRIP-ID u101)
(define-constant ERR-INVALID-DRIVER u102)
(define-constant ERR-INVALID-PASSENGERS u103)
(define-constant ERR-INVALID-ORACLE u104)
(define-constant ERR-INVALID-GPS-DATA u105)
(define-constant ERR-INVALID-DISTANCE u106)
(define-constant ERR-INVALID-CONGESTION u107)
(define-constant ERR-TRIP-ALREADY-VERIFIED u108)
(define-constant ERR-TRIP-NOT-FOUND u109)
(define-constant ERR-INVALID-CONFIRMATIONS u110)
(define-constant ERR-INVALID-REWARD u111)
(define-constant ERR-ORACLE-NOT-TRUSTED u112)
(define-constant ERR-DISPUTE-ALREADY_RAISED u113)
(define-constant ERR-INVALID-DISPUTE-REASON u114)
(define-constant ERR-INVALID-BASE-REWARD u115)
(define-constant ERR-INVALID-MULTIPLIER u116)
(define-constant ERR-INVALID-STATUS u117)
(define-constant ERR-INVALID-TIMESTAMP u118)
(define-constant ERR-MAX-TRIPS_EXCEEDED u119)
(define-constant ERR-INVALID-PASSENGER-COUNT u120)
(define-constant ERR-INVALID-ROUTE u121)
(define-constant ERR-INVALID-START-TIME u122)
(define-constant ERR-INVALID-END-TIME u123)
(define-constant ERR-INVALID-TOKEN-CONTRACT u124)
(define-constant ERR-TRANSFER-FAILED u125)

(define-data-var next-trip-id uint u0)
(define-data-var max-trips uint u100000)
(define-data-var base-reward-rate uint u10)
(define-data-var congestion-multiplier uint u2)
(define-data-var trusted-oracle principal tx-sender)
(define-data-var token-contract principal tx-sender)
(define-data-var admin principal tx-sender)

(define-map trips
  uint
  {
    driver: principal,
    passengers: (list 10 principal),
    start-time: uint,
    end-time: uint,
    distance: uint,
    congestion-index: uint,
    gps-verified: bool,
    status: (string-ascii 20),
    reward-calculated: uint,
    timestamp: uint,
    route: (string-utf8 200),
    confirmations: uint,
    disputed: bool,
    dispute-reason: (string-utf8 100)
  }
)

(define-map oracle-submissions
  uint
  {
    oracle: principal,
    gps-data: bool,
    distance: uint,
    congestion: uint,
    submit-time: uint
  }
)

(define-read-only (get-trip (id uint))
  (map-get? trips id)
)

(define-read-only (get-oracle-submission (id uint))
  (map-get? oracle-submissions id)
)

(define-read-only (get-trip-count)
  (var-get next-trip-id)
)

(define-private (validate-trip-id (id uint))
  (if (< id (var-get next-trip-id))
      (ok true)
      (err ERR-INVALID-TRIP-ID))
)

(define-private (validate-driver (driver principal))
  (if (not (is-eq driver tx-sender))
      (ok true)
      (err ERR-INVALID-DRIVER))
)

(define-private (validate-passengers (passengers (list 10 principal)))
  (if (and (> (len passengers) u0) (<= (len passengers) u10))
      (ok true)
      (err ERR-INVALID-PASSENGERS))
)

(define-private (validate-oracle (oracle principal))
  (if (is-eq oracle (var-get trusted-oracle))
      (ok true)
      (err ERR-ORACLE-NOT-TRUSTED))
)

(define-private (validate-gps (gps bool))
  (if gps
      (ok true)
      (err ERR-INVALID-GPS-DATA))
)

(define-private (validate-distance (dist uint))
  (if (> dist u0)
      (ok true)
      (err ERR-INVALID-DISTANCE))
)

(define-private (validate-congestion (cong uint))
  (if (and (>= cong u0) (<= cong u100))
      (ok true)
      (err ERR-INVALID-CONGESTION))
)

(define-private (validate-confirmations (confs uint) (pass-count uint))
  (if (>= confs (/ pass-count u2))
      (ok true)
      (err ERR-INVALID-CONFIRMATIONS))
)

(define-private (validate-reward (reward uint))
  (if (> reward u0)
      (ok true)
      (err ERR-INVALID-REWARD))
)

(define-private (validate-dispute-reason (reason (string-utf8 100)))
  (if (> (len reason) u0)
      (ok true)
      (err ERR-INVALID-DISPUTE-REASON))
)

(define-private (validate-status (status (string-ascii 20)))
  (if (or (is-eq status "pending") (is-eq status "verified") (is-eq status "disputed"))
      (ok true)
      (err ERR-INVALID-STATUS))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-passenger-count (count uint))
  (if (and (> count u0) (<= count u10))
      (ok true)
      (err ERR-INVALID-PASSENGER-COUNT))
)

(define-private (validate-route (route (string-utf8 200)))
  (if (> (len route) u0)
      (ok true)
      (err ERR-INVALID-ROUTE))
)

(define-private (validate-start-end-times (start uint) (end uint))
  (if (and (> start u0) (> end start))
      (ok true)
      (err ERR-INVALID-START-TIME))
)

(define-public (set-trusted-oracle (new-oracle principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set trusted-oracle new-oracle)
    (ok true)
  )
)

(define-public (set-token-contract (new-contract principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set token-contract new-contract)
    (ok true)
  )
)

(define-public (set-base-reward-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-rate u0) (err ERR-INVALID-BASE-REWARD))
    (var-set base-reward-rate new-rate)
    (ok true)
  )
)

(define-public (set-congestion-multiplier (new-mult uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-mult u0) (err ERR-INVALID-MULTIPLIER))
    (var-set congestion-multiplier new-mult)
    (ok true)
  )
)

(define-public (initiate-trip (driver principal) (passengers (list 10 principal)) (route (string-utf8 200)) (start-time uint))
  (let ((next-id (var-get next-trip-id)))
    (asserts! (< next-id (var-get max-trips)) (err ERR-MAX-TRIPS-EXCEEDED))
    (try! (validate-driver driver))
    (try! (validate-passengers passengers))
    (try! (validate-route route))
    (try! (validate-timestamp start-time))
    (map-set trips next-id
      {
        driver: driver,
        passengers: passengers,
        start-time: start-time,
        end-time: u0,
        distance: u0,
        congestion-index: u0,
        gps-verified: false,
        status: "pending",
        reward-calculated: u0,
        timestamp: block-height,
        route: route,
        confirmations: u0,
        disputed: false,
        dispute-reason: ""
      }
    )
    (var-set next-trip-id (+ next-id u1))
    (print { event: "trip-initiated", id: next-id })
    (ok next-id)
  )
)

(define-public (submit-oracle-data (trip-id uint) (gps bool) (distance uint) (congestion uint) (end-time uint))
  (let ((trip (unwrap! (map-get? trips trip-id) (err ERR-TRIP-NOT-FOUND))))
    (try! (validate-oracle tx-sender))
    (try! (validate-gps gps))
    (try! (validate-distance distance))
    (try! (validate-congestion congestion))
    (try! (validate-timestamp end-time))
    (asserts! (is-eq (get status trip) "pending") (err ERR-INVALID-STATUS))
    (map-set oracle-submissions trip-id
      {
        oracle: tx-sender,
        gps-data: gps,
        distance: distance,
        congestion: congestion,
        submit-time: block-height
      }
    )
    (map-set trips trip-id
      (merge trip
        {
          end-time: end-time,
          distance: distance,
          congestion-index: congestion,
          gps-verified: gps
        }
      )
    )
    (print { event: "oracle-data-submitted", id: trip-id })
    (ok true)
  )
)

(define-public (confirm-trip (trip-id uint))
  (let ((trip (unwrap! (map-get? trips trip-id) (err ERR-TRIP-NOT-FOUND))))
    (asserts! (or (is-eq tx-sender (get driver trip)) (is-some (index-of? (get passengers trip) tx-sender))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status trip) "pending") (err ERR-INVALID-STATUS))
    (asserts! (get gps-verified trip) (err ERR-INVALID-GPS-DATA))
    (map-set trips trip-id
      (merge trip { confirmations: (+ (get confirmations trip) u1) })
    )
    (print { event: "trip-confirmed", id: trip-id, confirmer: tx-sender })
    (ok true)
  )
)

(define-public (verify-trip (trip-id uint))
  (let ((trip (unwrap! (map-get? trips trip-id) (err ERR-TRIP-NOT-FOUND)))
        (pass-count (len (get passengers trip)))
        (reward (calculate-reward (get distance trip) pass-count (get congestion-index trip))))
    (asserts! (is-eq tx-sender (get driver trip)) (err ERR-NOT-AUTHORIZED))
    (try! (validate-confirmations (get confirmations trip) pass-count))
    (asserts! (not (get disputed trip)) (err ERR-DISPUTE-ALREADY_RAISED))
    (asserts! (not (is-eq (get status trip) "verified")) (err ERR-TRIP-ALREADY-VERIFIED))
    (try! (validate-reward reward))
    (try! (contract-call? .token-incentive mint reward (get driver trip) (get passengers trip)))
    (map-set trips trip-id
      (merge trip
        {
          status: "verified",
          reward-calculated: reward,
          timestamp: block-height
        }
      )
    )
    (print { event: "trip-verified", id: trip-id, reward: reward })
    (ok reward)
  )
)

(define-read-only (calculate-reward (distance uint) (passenger-count uint) (congestion-index uint))
  (let ((base (* distance passenger-count (var-get base-reward-rate)))
        (cong-bonus (* base (/ congestion-index u100) (var-get congestion-multiplier))))
    (+ base cong-bonus)
  )
)

(define-public (dispute-trip (trip-id uint) (reason (string-utf8 100)))
  (let ((trip (unwrap! (map-get? trips trip-id) (err ERR-TRIP-NOT-FOUND))))
    (asserts! (or (is-eq tx-sender (get driver trip)) (is-some (index-of? (get passengers trip) tx-sender))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status trip) "pending") (err ERR-INVALID-STATUS))
    (asserts! (not (get disputed trip)) (err ERR-DISPUTE-ALREADY_RAISED))
    (try! (validate-dispute-reason reason))
    (map-set trips trip-id
      (merge trip
        {
          disputed: true,
          dispute-reason: reason,
          status: "disputed"
        }
      )
    )
    (print { event: "trip-disputed", id: trip-id, reason: reason })
    (ok true)
  )
)