function normalizeInverse(value, min, max) {
    if (max === min)
        return 1;
    return (max - value) / (max - min);
}
function normalize(value, min, max) {
    if (max === min)
        return 1;
    return (value - min) / (max - min);
}
function roundScore(value) {
    return Number(value.toFixed(2));
}
function weightedAverage(state, metrics) {
    const weightSum = Object.values(state.weights).reduce((sum, current) => sum + current, 0);
    const normalizedWeight = weightSum > 0 ? weightSum : 1;
    const score = (state.weights.price * metrics.price +
        state.weights.review * metrics.review +
        state.weights.route * metrics.route +
        state.weights.location * metrics.location +
        state.weights.comfort * metrics.comfort) /
        normalizedWeight;
    return roundScore(Math.max(0, Math.min(1, score)));
}
export function scoreFlights(state, flights) {
    if (flights.length === 0)
        return [];
    const minPrice = Math.min(...flights.map((flight) => flight.price.amount));
    const maxPrice = Math.max(...flights.map((flight) => flight.price.amount));
    const minDuration = Math.min(...flights.map((flight) => flight.durationMinutes ?? 999));
    const maxDuration = Math.max(...flights.map((flight) => flight.durationMinutes ?? 999));
    const scored = flights.map((flight) => {
        const priceMetric = normalizeInverse(flight.price.amount, minPrice, maxPrice);
        const durationMetric = normalizeInverse(flight.durationMinutes ?? maxDuration, minDuration, maxDuration);
        const transferMetric = flight.transfers === 0 ? 1 : flight.transfers === 1 ? 0.7 : 0.4;
        const routeMetric = roundScore((durationMetric + transferMetric) / 2);
        const comfortMetric = (flight.summary.includes("프리미엄") ? 0.95 : 0.7) +
            (flight.transfers === 0 ? 0.05 : 0);
        const score = weightedAverage(state, {
            price: priceMetric,
            review: 0.6,
            route: routeMetric,
            location: 0.5,
            comfort: Math.min(1, comfortMetric),
        });
        return {
            ...flight,
            score,
            badges: [...new Set(flight.badges)],
        };
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored[0]) {
        scored[0].badges = [...new Set(["best_value", ...scored[0].badges])];
    }
    return scored;
}
export function scoreStays(state, stays) {
    if (stays.length === 0)
        return [];
    const minPrice = Math.min(...stays.map((stay) => stay.pricePerNight.amount));
    const maxPrice = Math.max(...stays.map((stay) => stay.pricePerNight.amount));
    const minRating = Math.min(...stays.map((stay) => stay.rating));
    const maxRating = Math.max(...stays.map((stay) => stay.rating));
    const scored = stays.map((stay) => {
        const priceMetric = normalizeInverse(stay.pricePerNight.amount, minPrice, maxPrice);
        const reviewMetric = normalize(stay.rating, minRating, maxRating);
        const locationMetric = stay.location.area.toLowerCase().includes("center") ? 0.95 : 0.75;
        const comfortMetric = Math.min(1, stay.rating / 5 + (stay.pricePerNight.amount > minPrice ? 0.05 : 0));
        const score = weightedAverage(state, {
            price: priceMetric,
            review: reviewMetric,
            route: 0.75,
            location: locationMetric,
            comfort: comfortMetric,
        });
        return {
            ...stay,
            score,
            badges: [...new Set(stay.badges)],
        };
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored[0]) {
        scored[0].badges = [...new Set(["best_match", ...scored[0].badges])];
    }
    return scored;
}
