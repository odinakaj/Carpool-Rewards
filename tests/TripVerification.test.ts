import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, boolCV, principalCV, listCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_DRIVER = 102;
const ERR_INVALID_PASSENGERS = 103;
const ERR_ORACLE_NOT_TRUSTED = 112;
const ERR_INVALID_GPS_DATA = 105;
const ERR_INVALID_DISTANCE = 106;
const ERR_INVALID_CONGESTION = 107;
const ERR_TRIP_NOT_FOUND = 109;
const ERR_INVALID_CONFIRMATIONS = 110;
const ERR_INVALID_REWARD = 111;
const ERR_DISPUTE_ALREADY_RAISED = 113;
const ERR_INVALID_DISPUTE_REASON = 114;
const ERR_INVALID_BASE_REWARD = 115;
const ERR_INVALID_MULTIPLIER = 116;
const ERR_INVALID_STATUS = 117;
const ERR_INVALID_TIMESTAMP = 118;
const ERR_MAX_TRIPS_EXCEEDED = 119;
const ERR_INVALID_ROUTE = 121;
const ERR_TRIP_ALREADY_VERIFIED = 108;

interface Trip {
  driver: string;
  passengers: string[];
  startTime: number;
  endTime: number;
  distance: number;
  congestionIndex: number;
  gpsVerified: boolean;
  status: string;
  rewardCalculated: number;
  timestamp: number;
  route: string;
  confirmations: number;
  disputed: boolean;
  disputeReason: string;
}

interface OracleSubmission {
  oracle: string;
  gpsData: boolean;
  distance: number;
  congestion: number;
  submitTime: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class TripVerificationMock {
  state: {
    nextTripId: number;
    maxTrips: number;
    baseRewardRate: number;
    congestionMultiplier: number;
    trustedOracle: string;
    tokenContract: string;
    admin: string;
    trips: Map<number, Trip>;
    oracleSubmissions: Map<number, OracleSubmission>;
  } = {
    nextTripId: 0,
    maxTrips: 100000,
    baseRewardRate: 10,
    congestionMultiplier: 2,
    trustedOracle: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    tokenContract: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    trips: new Map(),
    oracleSubmissions: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
  tokenMints: Array<{ amount: number; toDriver: string; toPassengers: string[] }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextTripId: 0,
      maxTrips: 100000,
      baseRewardRate: 10,
      congestionMultiplier: 2,
      trustedOracle: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      tokenContract: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      trips: new Map(),
      oracleSubmissions: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    this.tokenMints = [];
  }

  setTrustedOracle(newOracle: string): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: false };
    this.state.trustedOracle = newOracle;
    return { ok: true, value: true };
  }

  setTokenContract(newContract: string): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: false };
    this.state.tokenContract = newContract;
    return { ok: true, value: true };
  }

  setBaseRewardRate(newRate: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: false };
    if (newRate <= 0) return { ok: false, value: false };
    this.state.baseRewardRate = newRate;
    return { ok: true, value: true };
  }

  setCongestionMultiplier(newMult: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: false };
    if (newMult <= 0) return { ok: false, value: false };
    this.state.congestionMultiplier = newMult;
    return { ok: true, value: true };
  }

  initiateTrip(driver: string, passengers: string[], route: string, startTime: number): Result<number> {
    if (this.state.nextTripId >= this.state.maxTrips) return { ok: false, value: ERR_MAX_TRIPS_EXCEEDED };
    if (driver === this.caller) return { ok: false, value: ERR_INVALID_DRIVER };
    if (passengers.length <= 0 || passengers.length > 10) return { ok: false, value: ERR_INVALID_PASSENGERS };
    if (route.length <= 0) return { ok: false, value: ERR_INVALID_ROUTE };
    if (startTime < this.blockHeight) return { ok: false, value: ERR_INVALID_TIMESTAMP };
    const id = this.state.nextTripId;
    this.state.trips.set(id, {
      driver,
      passengers,
      startTime,
      endTime: 0,
      distance: 0,
      congestionIndex: 0,
      gpsVerified: false,
      status: "pending",
      rewardCalculated: 0,
      timestamp: this.blockHeight,
      route,
      confirmations: 0,
      disputed: false,
      disputeReason: "",
    });
    this.state.nextTripId++;
    return { ok: true, value: id };
  }

  submitOracleData(tripId: number, gps: boolean, distance: number, congestion: number, endTime: number): Result<boolean> {
    const trip = this.state.trips.get(tripId);
    if (!trip) return { ok: false, value: false };
    if (this.caller !== this.state.trustedOracle) return { ok: false, value: false };
    if (!gps) return { ok: false, value: false };
    if (distance <= 0) return { ok: false, value: false };
    if (congestion < 0 || congestion > 100) return { ok: false, value: false };
    if (endTime < this.blockHeight) return { ok: false, value: false };
    if (trip.status !== "pending") return { ok: false, value: false };
    this.state.oracleSubmissions.set(tripId, {
      oracle: this.caller,
      gpsData: gps,
      distance,
      congestion,
      submitTime: this.blockHeight,
    });
    this.state.trips.set(tripId, { ...trip, endTime, distance, congestionIndex: congestion, gpsVerified: gps });
    return { ok: true, value: true };
  }

  confirmTrip(tripId: number): Result<boolean> {
    const trip = this.state.trips.get(tripId);
    if (!trip) return { ok: false, value: false };
    if (this.caller !== trip.driver && !trip.passengers.includes(this.caller)) return { ok: false, value: false };
    if (trip.status !== "pending") return { ok: false, value: false };
    if (!trip.gpsVerified) return { ok: false, value: false };
    this.state.trips.set(tripId, { ...trip, confirmations: trip.confirmations + 1 });
    return { ok: true, value: true };
  }

  verifyTrip(tripId: number): Result<number> {
    const trip = this.state.trips.get(tripId);
    if (!trip) return { ok: false, value: ERR_TRIP_NOT_FOUND };
    if (this.caller !== trip.driver) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (trip.confirmations < Math.floor(trip.passengers.length / 2)) return { ok: false, value: ERR_INVALID_CONFIRMATIONS };
    if (trip.disputed) return { ok: false, value: ERR_DISPUTE_ALREADY_RAISED };
    if (trip.status === "verified") return { ok: false, value: ERR_TRIP_ALREADY_VERIFIED };
    const reward = this.calculateReward(trip.distance, trip.passengers.length, trip.congestionIndex);
    if (reward <= 0) return { ok: false, value: ERR_INVALID_REWARD };
    this.tokenMints.push({ amount: reward, toDriver: trip.driver, toPassengers: trip.passengers });
    this.state.trips.set(tripId, { ...trip, status: "verified", rewardCalculated: reward, timestamp: this.blockHeight });
    return { ok: true, value: reward };
  }

  calculateReward(distance: number, passengerCount: number, congestionIndex: number): number {
    const base = distance * passengerCount * this.state.baseRewardRate;
    const congBonus = base * (congestionIndex / 100) * this.state.congestionMultiplier;
    return base + congBonus;
  }

  disputeTrip(tripId: number, reason: string): Result<boolean> {
    const trip = this.state.trips.get(tripId);
    if (!trip) return { ok: false, value: false };
    if (this.caller !== trip.driver && !trip.passengers.includes(this.caller)) return { ok: false, value: false };
    if (trip.status !== "pending") return { ok: false, value: false };
    if (trip.disputed) return { ok: false, value: false };
    if (reason.length <= 0) return { ok: false, value: false };
    this.state.trips.set(tripId, { ...trip, disputed: true, disputeReason: reason, status: "disputed" });
    return { ok: true, value: true };
  }

  getTrip(id: number): Trip | undefined {
    return this.state.trips.get(id);
  }

  getOracleSubmission(id: number): OracleSubmission | undefined {
    return this.state.oracleSubmissions.get(id);
  }

  getTripCount(): Result<number> {
    return { ok: true, value: this.state.nextTripId };
  }
}

describe("TripVerification", () => {
  let contract: TripVerificationMock;

  beforeEach(() => {
    contract = new TripVerificationMock();
    contract.reset();
  });

  it("initiates a trip successfully", () => {
    contract.caller = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    const result = contract.initiateTrip("ST2DRIVER", ["ST3PASS1", "ST4PASS2"], "Route A to B", 100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const trip = contract.getTrip(0);
    expect(trip?.driver).toBe("ST2DRIVER");
    expect(trip?.passengers).toEqual(["ST3PASS1", "ST4PASS2"]);
    expect(trip?.route).toBe("Route A to B");
    expect(trip?.startTime).toBe(100);
    expect(trip?.status).toBe("pending");
  });

  it("rejects invalid passengers in initiation", () => {
    contract.caller = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    const result = contract.initiateTrip("ST2DRIVER", [], "Route A to B", 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PASSENGERS);
  });

  it("submits oracle data successfully", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    contract.caller = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    const result = contract.submitOracleData(0, true, 50, 80, 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const trip = contract.getTrip(0);
    expect(trip?.gpsVerified).toBe(true);
    expect(trip?.distance).toBe(50);
    expect(trip?.congestionIndex).toBe(80);
    expect(trip?.endTime).toBe(200);
    const submission = contract.getOracleSubmission(0);
    expect(submission?.gpsData).toBe(true);
    expect(submission?.distance).toBe(50);
    expect(submission?.congestion).toBe(80);
  });

  it("rejects untrusted oracle submission", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    contract.caller = "ST5FAKE";
    const result = contract.submitOracleData(0, true, 50, 80, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("confirms trip successfully", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1", "ST4PASS2"], "Route", 100);
    contract.submitOracleData(0, true, 50, 80, 200);
    contract.caller = "ST3PASS1";
    const result = contract.confirmTrip(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const trip = contract.getTrip(0);
    expect(trip?.confirmations).toBe(1);
  });

  it("rejects confirmation from unauthorized user", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    contract.submitOracleData(0, true, 50, 80, 200);
    contract.caller = "ST5FAKE";
    const result = contract.confirmTrip(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("verifies trip successfully", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    contract.submitOracleData(0, true, 50, 80, 200);
    contract.caller = "ST3PASS1";
    contract.confirmTrip(0);
    contract.caller = "ST2DRIVER";
    const result = contract.verifyTrip(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(50 * 1 * 10 + (50 * 1 * 10) * (80 / 100) * 2);
    const trip = contract.getTrip(0);
    expect(trip?.status).toBe("verified");
    expect(trip?.rewardCalculated).toBe(result.value);
    expect(contract.tokenMints).toEqual([{ amount: result.value, toDriver: "ST2DRIVER", toPassengers: ["ST3PASS1"] }]);
  });

  it("rejects verification without enough confirmations", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1", "ST4PASS2"], "Route", 100);
    contract.submitOracleData(0, true, 50, 80, 200);
    contract.caller = "ST2DRIVER";
    const result = contract.verifyTrip(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CONFIRMATIONS);
  });

  it("disputes trip successfully", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    contract.caller = "ST3PASS1";
    const result = contract.disputeTrip(0, "Invalid route");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const trip = contract.getTrip(0);
    expect(trip?.disputed).toBe(true);
    expect(trip?.disputeReason).toBe("Invalid route");
    expect(trip?.status).toBe("disputed");
  });

  it("rejects duplicate dispute", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    contract.caller = "ST3PASS1";
    contract.disputeTrip(0, "Invalid route");
    const result = contract.disputeTrip(0, "Another reason");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets base reward rate successfully", () => {
    const result = contract.setBaseRewardRate(20);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.baseRewardRate).toBe(20);
  });

  it("rejects base reward rate change by non-admin", () => {
    contract.caller = "ST5FAKE";
    const result = contract.setBaseRewardRate(20);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("calculates reward correctly", () => {
    const reward = contract.calculateReward(100, 3, 50);
    expect(reward).toBe(100 * 3 * 10 + (100 * 3 * 10) * (50 / 100) * 2);
  });

  it("gets trip count correctly", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route1", 100);
    contract.initiateTrip("ST2DRIVER", ["ST4PASS2"], "Route2", 200);
    const result = contract.getTripCount();
    expect(result.value).toBe(2);
  });

  it("rejects max trips exceeded", () => {
    contract.state.maxTrips = 1;
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    const result = contract.initiateTrip("ST2DRIVER", ["ST4PASS2"], "Route2", 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_TRIPS_EXCEEDED);
  });

  it("rejects invalid dispute reason", () => {
    contract.initiateTrip("ST2DRIVER", ["ST3PASS1"], "Route", 100);
    contract.caller = "ST3PASS1";
    const result = contract.disputeTrip(0, "");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});