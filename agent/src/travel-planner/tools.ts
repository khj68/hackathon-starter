import { FlightResult, RouteDraftDay, StayResult } from "./schema.js";

export interface FlightSearchInput {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  seatClass: string;
  maxTransfers: number | null;
}

export interface StaySearchInput {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  stayLevel: string;
}

export interface RouteDraftInput {
  destination: string;
  purposeTags: string[];
  mustVisit: string[];
  maxDailyWalkKm: number | null;
  days: number;
  stayArea?: string;
}

export interface TravelToolProvider {
  searchFlights(input: FlightSearchInput): Promise<FlightResult[]>;
  searchStays(input: StaySearchInput): Promise<StayResult[]>;
  draftRoute(input: RouteDraftInput): Promise<RouteDraftDay[]>;
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
}

function buildFlightSearchUrl(input: FlightSearchInput, transfers: number): string {
  const origin = input.origin?.trim() || "Anywhere";
  const destination = input.destination?.trim() || "Destination";
  const dateLabel =
    input.startDate && input.endDate
      ? `${input.startDate} to ${input.endDate}`
      : input.startDate || "anytime";
  const cabin = input.seatClass || "economy";
  const transferLabel = transfers === 0 ? "direct" : `${transfers} stop`;
  const query = `Flights from ${origin} to ${destination} on ${dateLabel} for ${input.adults} adults ${input.children} children ${cabin} ${transferLabel}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

function buildBookingUrl(input: StaySearchInput, area: string): string {
  const destination = encodeURIComponent(`${input.destination} ${area}`.trim());
  return `https://www.booking.com/searchresults.html?ss=${destination}&checkin=${input.startDate}&checkout=${input.endDate}&group_adults=${input.adults}&group_children=${input.children}`;
}

function buildMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export class MockTravelToolProvider implements TravelToolProvider {
  async searchFlights(input: FlightSearchInput): Promise<FlightResult[]> {
    const seed = hashSeed(`${input.origin}-${input.destination}-${input.startDate}-${input.endDate}`);
    const basePrice = 240000 + (seed % 120000);

    const options: FlightResult[] = [
      {
        id: "f_1",
        summary: `${input.origin || "미정"} → ${input.destination}, 직항, 2h 20m`,
        price: { amount: basePrice, currency: "KRW" },
        provider: "Skyscanner",
        score: 0,
        url: buildFlightSearchUrl(input, 0),
        badges: ["direct"],
        transfers: 0,
        durationMinutes: 140,
      },
      {
        id: "f_2",
        summary: `${input.origin || "미정"} → ${input.destination}, 1회 경유, 5h 40m`,
        price: { amount: Math.max(90000, basePrice - 70000), currency: "KRW" },
        provider: "Skyscanner",
        score: 0,
        url: buildFlightSearchUrl(input, 1),
        badges: ["low_price"],
        transfers: 1,
        durationMinutes: 340,
      },
      {
        id: "f_3",
        summary: `${input.origin || "미정"} → ${input.destination}, 직항, 2h 10m (프리미엄 편의)`,
        price: { amount: basePrice + 110000, currency: "KRW" },
        provider: "Skyscanner",
        score: 0,
        url: buildFlightSearchUrl(input, 0),
        badges: ["comfort"],
        transfers: 0,
        durationMinutes: 130,
      },
    ];

    if (input.maxTransfers !== null) {
      return options.filter((option) => (option.transfers ?? 99) <= input.maxTransfers!);
    }

    return options;
  }

  async searchStays(input: StaySearchInput): Promise<StayResult[]> {
    const seed = hashSeed(`${input.destination}-${input.startDate}-${input.endDate}`);
    const basePrice = 130000 + (seed % 90000);

    const options: StayResult[] = [
      {
        id: "h_1",
        name: `${input.destination} Central Hotel`,
        rating: 4.6,
        pricePerNight: { amount: basePrice + 30000, currency: "KRW" },
        location: { area: "City Center", lat: 35.0, lng: 139.0 },
        provider: "Booking",
        score: 0,
        url: buildBookingUrl(input, "City Center"),
        badges: ["great_location", "high_review"],
      },
      {
        id: "h_2",
        name: `${input.destination} Value Stay`,
        rating: 4.1,
        pricePerNight: { amount: Math.max(80000, basePrice - 25000), currency: "KRW" },
        location: { area: "Transit Hub", lat: 35.1, lng: 139.05 },
        provider: "Hotels.com",
        score: 0,
        url: `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(input.destination)}`,
        badges: ["best_value"],
      },
      {
        id: "h_3",
        name: `${input.destination} Signature Resort`,
        rating: 4.8,
        pricePerNight: { amount: basePrice + 140000, currency: "KRW" },
        location: { area: "Scenic District", lat: 35.2, lng: 139.1 },
        provider: "Agoda",
        score: 0,
        url: `https://www.agoda.com/search?city=${encodeURIComponent(input.destination)}`,
        badges: ["premium", "high_review"],
      },
    ];

    if (input.stayLevel === "3_star") {
      return options.slice(0, 2);
    }

    if (input.stayLevel === "5_star" || input.stayLevel === "pool_villa") {
      return [options[2], options[0]].filter(Boolean) as StayResult[];
    }

    return options;
  }

  async draftRoute(input: RouteDraftInput): Promise<RouteDraftDay[]> {
    const days = Math.max(1, Math.min(input.days, 3));
    const mustVisit = input.mustVisit.length > 0 ? input.mustVisit : ["메인 스팟"];
    const route: RouteDraftDay[] = [];

    const stayAreaLabel = input.stayArea?.trim() || "접근성 좋은 중심지";
    for (let day = 1; day <= days; day += 1) {
      route.push({
        day,
        title: day === 1 ? "도착 + 가벼운 이동" : `${day}일차 추천 동선`,
        items: [
          { time: "10:00", name: `숙소 체크인 (${stayAreaLabel})`, type: "stay" },
          {
            time: "11:30",
            name: mustVisit[(day - 1) % mustVisit.length],
            type: "place",
            url: buildMapsUrl(`${input.destination} ${stayAreaLabel} ${mustVisit[(day - 1) % mustVisit.length]}`),
          },
          {
            time: "15:00",
            name: input.purposeTags.includes("food") ? "현지 인기 맛집" : "핵심 관광지",
            type: "place",
            url: buildMapsUrl(
              `${input.destination} ${stayAreaLabel} ${input.purposeTags.includes("food") ? "restaurant" : "attraction"}`
            ),
          },
        ],
      });
    }

    return route;
  }
}
