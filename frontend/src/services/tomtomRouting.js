import axios from "axios";

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || "";

/**
 * Calculates fuel liters and FASTag toll cost for a given highway distance
 */
function calculateEconomics(distanceKm) {
    const carMileage = 16; // 16 km/L
    const tollRatePerKm = 1.8; // ₹1.80/km standard 4-lane NHAI toll rate

    const fuelLiters = Math.round(distanceKm / carMileage);
    // Tolls apply on long-distance highway routes; if distance is 0 or negligible, no toll
    const tollCost = distanceKm >= 15 ? Math.round(distanceKm * tollRatePerKm) : 0;
    const tollString = tollCost > 0 ? `₹${tollCost.toLocaleString("en-IN")}` : "No Tolls";

    return { fuelLiters, tollCost, tollString };
}

/**
 * Formats seconds into "Xh Ym"
 */
function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.round((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Fetches real-world highway driving routes (Fastest vs Cheapest/Shortest).
 *
 * @param {Array<[number, number]>} coordinates - Ordered sequence of [lat, lng]
 * @returns {Promise<{
 *   routes: Array<{
 *     id: string,
 *     label: string,
 *     tag: string,
 *     realDistanceKm: number,
 *     travelTimeSeconds: number,
 *     durationString: string,
 *     fuelNeeded: number,
 *     tollCost: number,
 *     tollString: string,
 *     curvedCoordinates: Array<[number, number]>,
 *     isFastest: boolean,
 *     isCheapest: boolean
 *   }>,
 *   activeRouteIndex: number
 * } | null>}
 */
export async function fetchRealHighwayRoutes(coordinates) {
    if (!coordinates || coordinates.length < 2) return null;

    const validCoords = coordinates.filter(
        (c) => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1])
    );
    if (validCoords.length < 2) return null;

    // Helper to extract polyline coordinates from TomTom route
    const extractTomTomPoints = (route) => {
        const points = [];
        if (route.legs && route.legs.length > 0) {
            route.legs.forEach((leg) => {
                if (leg.points && leg.points.length > 0) {
                    leg.points.forEach((pt) => {
                        points.push([pt.latitude, pt.longitude]);
                    });
                }
            });
        }
        return points;
    };

    // 1. Try TomTom Dual (Fastest + Shortest/Cheapest) Routing APIs in parallel
    if (TOMTOM_API_KEY && TOMTOM_API_KEY.trim() !== "") {
        try {
            const locationsParam = validCoords
                .map(([lat, lon]) => `${lat},${lon}`)
                .join(":");

            const urlFastest = `https://api.tomtom.com/routing/1/calculateRoute/${locationsParam}/json?key=${TOMTOM_API_KEY}&routeType=fastest&maxAlternatives=2&traffic=true&travelMode=car`;
            const urlShortest = `https://api.tomtom.com/routing/1/calculateRoute/${locationsParam}/json?key=${TOMTOM_API_KEY}&routeType=shortest&traffic=true&travelMode=car`;

            const [fastestRes, shortestRes] = await Promise.allSettled([
                axios.get(urlFastest, { timeout: 8000 }),
                axios.get(urlShortest, { timeout: 8000 }),
            ]);

            const collectedRoutes = [];

            // Add routes from fastest query
            if (fastestRes.status === "fulfilled" && fastestRes.value?.data?.routes) {
                fastestRes.value.data.routes.forEach((r, idx) => {
                    const distKm = r.summary?.lengthInMeters ? Math.round((r.summary.lengthInMeters / 1000) * 10) / 10 : 0;
                    const durationSec = r.summary?.travelTimeInSeconds || 0;
                    const pts = extractTomTomPoints(r);
                    if (pts.length >= 2 && distKm > 0) {
                        collectedRoutes.push({
                            source: "fastest",
                            distKm,
                            durationSec,
                            points: pts,
                        });
                    }
                });
            }

            // Add routes from shortest query
            if (shortestRes.status === "fulfilled" && shortestRes.value?.data?.routes) {
                shortestRes.value.data.routes.forEach((r) => {
                    const distKm = r.summary?.lengthInMeters ? Math.round((r.summary.lengthInMeters / 1000) * 10) / 10 : 0;
                    const durationSec = r.summary?.travelTimeInSeconds || 0;
                    const pts = extractTomTomPoints(r);
                    if (pts.length >= 2 && distKm > 0) {
                        collectedRoutes.push({
                            source: "shortest",
                            distKm,
                            durationSec,
                            points: pts,
                        });
                    }
                });
            }

            if (collectedRoutes.length > 0) {
                // Find fastest (minimum duration) and shortest (minimum distance)
                let fastestCandidate = collectedRoutes[0];
                let shortestCandidate = collectedRoutes[0];

                collectedRoutes.forEach((r) => {
                    if (r.durationSec < fastestCandidate.durationSec) {
                        fastestCandidate = r;
                    }
                    if (r.distKm < shortestCandidate.distKm) {
                        shortestCandidate = r;
                    }
                });

                const distDifference = Math.round((fastestCandidate.distKm - shortestCandidate.distKm) * 10) / 10;
                const timeDifference = Math.round((shortestCandidate.durationSec - fastestCandidate.durationSec) / 60);

                const finalRoutes = [];

                // If shortest is genuinely different by at least 1.5 km or significant time
                if (distDifference >= 1.5 && timeDifference >= 2) {
                    const fastestEcon = calculateEconomics(fastestCandidate.distKm);
                    const shortestEcon = calculateEconomics(shortestCandidate.distKm);
                    const savedToll = Math.round(fastestEcon.tollCost - shortestEcon.tollCost);

                    // 1. ⚡ Fastest Route
                    finalRoutes.push({
                        id: "fastest",
                        label: "⚡ Fastest Route",
                        tag: timeDifference > 0 ? `${timeDifference} min faster` : "Express Highway",
                        realDistanceKm: fastestCandidate.distKm,
                        travelTimeSeconds: fastestCandidate.durationSec,
                        durationString: formatDuration(fastestCandidate.durationSec),
                        fuelNeeded: fastestEcon.fuelLiters,
                        tollCost: fastestEcon.tollCost,
                        tollString: fastestEcon.tollString,
                        curvedCoordinates: fastestCandidate.points,
                        isFastest: true,
                        isCheapest: false,
                    });

                    // 2. 💰 Cheapest Route
                    finalRoutes.push({
                        id: "cheapest",
                        label: "💰 Cheapest Route",
                        tag: savedToll > 0 ? `Saves ${distDifference} km & ₹${savedToll} toll` : `Saves ${distDifference} km`,
                        realDistanceKm: shortestCandidate.distKm,
                        travelTimeSeconds: shortestCandidate.durationSec,
                        durationString: formatDuration(shortestCandidate.durationSec),
                        fuelNeeded: shortestEcon.fuelLiters,
                        tollCost: shortestEcon.tollCost,
                        tollString: shortestEcon.tollString,
                        curvedCoordinates: shortestCandidate.points,
                        isFastest: false,
                        isCheapest: true,
                    });
                } else {
                    // Single optimal route that is BOTH fastest and cheapest
                    const econ = calculateEconomics(fastestCandidate.distKm);
                    finalRoutes.push({
                        id: "fastest",
                        label: "⚡ Fastest & 💰 Cheapest Route",
                        tag: "Optimal Speed & Lowest Toll • All Stops Covered",
                        realDistanceKm: fastestCandidate.distKm,
                        travelTimeSeconds: fastestCandidate.durationSec,
                        durationString: formatDuration(fastestCandidate.durationSec),
                        fuelNeeded: econ.fuelLiters,
                        tollCost: econ.tollCost,
                        tollString: econ.tollString,
                        curvedCoordinates: fastestCandidate.points,
                        isFastest: true,
                        isCheapest: true,
                    });
                }

                return {
                    routes: finalRoutes,
                    activeRouteIndex: 0,
                };
            }
        } catch (err) {
            console.warn("TomTom Routing error:", err.message);
        }
    }

    // 2. Fallback to OpenStreetMap / OSRM with alternatives=true
    try {
        const osrmCoords = validCoords.map(([lat, lon]) => `${lon},${lat}`).join(";");
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson&alternatives=true`;
        const response = await axios.get(osrmUrl, { timeout: 8000 });

        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const rawRoutes = response.data.routes.map((r) => {
                const rawCoords = r.geometry?.coordinates || [];
                const curvedPoints = rawCoords.map(([lon, lat]) => [lat, lon]);
                const distKm = r.distance ? Math.round((r.distance / 1000) * 10) / 10 : 0;
                const durationSec = Math.round(r.duration || 0);
                return { distKm, durationSec, points: curvedPoints };
            }).filter(r => r.points.length >= 2 && r.distKm > 0);

            if (rawRoutes.length > 0) {
                let fastestCandidate = rawRoutes[0];
                let shortestCandidate = rawRoutes[0];

                rawRoutes.forEach((r) => {
                    if (r.durationSec < fastestCandidate.durationSec) fastestCandidate = r;
                    if (r.distKm < shortestCandidate.distKm) shortestCandidate = r;
                });

                const distDiff = Math.round((fastestCandidate.distKm - shortestCandidate.distKm) * 10) / 10;
                const timeDiff = Math.round((shortestCandidate.durationSec - fastestCandidate.durationSec) / 60);

                const finalRoutes = [];

                if (rawRoutes.length > 1 && distDiff >= 1.5 && timeDiff >= 2) {
                    const fastestEcon = calculateEconomics(fastestCandidate.distKm);
                    const shortestEcon = calculateEconomics(shortestCandidate.distKm);
                    const savedToll = Math.round(fastestEcon.tollCost - shortestEcon.tollCost);

                    finalRoutes.push({
                        id: "fastest",
                        label: "⚡ Fastest Route",
                        tag: timeDiff > 0 ? `${timeDiff} min faster` : "Express Highway",
                        realDistanceKm: fastestCandidate.distKm,
                        travelTimeSeconds: fastestCandidate.durationSec,
                        durationString: formatDuration(fastestCandidate.durationSec),
                        fuelNeeded: fastestEcon.fuelLiters,
                        tollCost: fastestEcon.tollCost,
                        tollString: fastestEcon.tollString,
                        curvedCoordinates: fastestCandidate.points,
                        isFastest: true,
                        isCheapest: false,
                    });

                    finalRoutes.push({
                        id: "cheapest",
                        label: "💰 Cheapest Route",
                        tag: savedToll > 0 ? `Saves ${distDiff} km & ₹${savedToll} toll` : `Saves ${distDiff} km`,
                        realDistanceKm: shortestCandidate.distKm,
                        travelTimeSeconds: shortestCandidate.durationSec,
                        durationString: formatDuration(shortestCandidate.durationSec),
                        fuelNeeded: shortestEcon.fuelLiters,
                        tollCost: shortestEcon.tollCost,
                        tollString: shortestEcon.tollString,
                        curvedCoordinates: shortestCandidate.points,
                        isFastest: false,
                        isCheapest: true,
                    });
                } else {
                    const econ = calculateEconomics(fastestCandidate.distKm);
                    finalRoutes.push({
                        id: "fastest",
                        label: "⚡ Fastest & 💰 Cheapest Route",
                        tag: "Optimal Speed & Lowest Toll • All Stops Covered",
                        realDistanceKm: fastestCandidate.distKm,
                        travelTimeSeconds: fastestCandidate.durationSec,
                        durationString: formatDuration(fastestCandidate.durationSec),
                        fuelNeeded: econ.fuelLiters,
                        tollCost: econ.tollCost,
                        tollString: econ.tollString,
                        curvedCoordinates: fastestCandidate.points,
                        isFastest: true,
                        isCheapest: true,
                    });
                }

                return {
                    routes: finalRoutes,
                    activeRouteIndex: 0,
                };
            }
        }
    } catch (osrmErr) {
        console.warn("OSRM Routing failed:", osrmErr.message);
    }

    return null;
}

/**
 * Backwards-compatible single route fetcher
 */
export async function fetchRealHighwayRoute(coordinates) {
    const res = await fetchRealHighwayRoutes(coordinates);
    if (res && res.routes && res.routes.length > 0) {
        return res.routes[0];
    }
    return null;
}

