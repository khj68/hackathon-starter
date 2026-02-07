import { z } from "zod";
export declare const StageSchema: z.ZodEnum<{
    collect_intent: "collect_intent";
    collect_dates: "collect_dates";
    collect_region: "collect_region";
    collect_weights: "collect_weights";
    search: "search";
    recommend: "recommend";
}>;
export declare const QuestionOptionSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>;
export declare const QuestionSchema: z.ZodObject<{
    id: z.ZodString;
    text: z.ZodString;
    options: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>;
    allowFreeText: z.ZodBoolean;
}, z.core.$strip>;
export declare const TripSchema: z.ZodObject<{
    region: z.ZodObject<{
        country: z.ZodDefault<z.ZodString>;
        city: z.ZodDefault<z.ZodString>;
        freeText: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    dates: z.ZodObject<{
        start: z.ZodDefault<z.ZodString>;
        end: z.ZodDefault<z.ZodString>;
        flexibleDays: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    travelers: z.ZodObject<{
        adults: z.ZodDefault<z.ZodNumber>;
        children: z.ZodDefault<z.ZodNumber>;
        notes: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    origin: z.ZodObject<{
        city: z.ZodDefault<z.ZodString>;
        airportCode: z.ZodDefault<z.ZodString>;
        freeText: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    purposeTags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    budgetStyle: z.ZodDefault<z.ZodEnum<{
        "": "";
        budget: "budget";
        balanced: "balanced";
        premium: "premium";
    }>>;
    stayLevel: z.ZodDefault<z.ZodEnum<{
        "": "";
        "3_star": "3_star";
        "4_star": "4_star";
        "5_star": "5_star";
        pool_villa: "pool_villa";
    }>>;
    seatClass: z.ZodDefault<z.ZodEnum<{
        "": "";
        economy: "economy";
        business: "business";
        first: "first";
    }>>;
    pace: z.ZodDefault<z.ZodEnum<{
        "": "";
        balanced: "balanced";
        tight: "tight";
        relaxed: "relaxed";
    }>>;
    constraints: z.ZodObject<{
        maxTransfers: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        avoidRedEye: z.ZodDefault<z.ZodBoolean>;
        maxDailyWalkKm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        mustVisit: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const WeightsSchema: z.ZodObject<{
    price: z.ZodNumber;
    review: z.ZodNumber;
    route: z.ZodNumber;
    location: z.ZodNumber;
    comfort: z.ZodNumber;
}, z.core.$strip>;
export declare const WeightKeySchema: z.ZodEnum<{
    price: "price";
    review: "review";
    route: "route";
    location: "location";
    comfort: "comfort";
}>;
export declare const WeightRationaleSchema: z.ZodObject<{
    key: z.ZodEnum<{
        price: "price";
        review: "review";
        route: "route";
        location: "location";
        comfort: "comfort";
    }>;
    reason: z.ZodString;
}, z.core.$strip>;
export declare const DialogStateSchema: z.ZodObject<{
    lastAskedQuestionIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    questionAttempts: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    reasoningLog: z.ZodDefault<z.ZodArray<z.ZodString>>;
    assumptions: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const PlannerStateSchema: z.ZodObject<{
    trip: z.ZodObject<{
        region: z.ZodObject<{
            country: z.ZodDefault<z.ZodString>;
            city: z.ZodDefault<z.ZodString>;
            freeText: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>;
        dates: z.ZodObject<{
            start: z.ZodDefault<z.ZodString>;
            end: z.ZodDefault<z.ZodString>;
            flexibleDays: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>;
        travelers: z.ZodObject<{
            adults: z.ZodDefault<z.ZodNumber>;
            children: z.ZodDefault<z.ZodNumber>;
            notes: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>;
        origin: z.ZodObject<{
            city: z.ZodDefault<z.ZodString>;
            airportCode: z.ZodDefault<z.ZodString>;
            freeText: z.ZodDefault<z.ZodString>;
        }, z.core.$strip>;
        purposeTags: z.ZodDefault<z.ZodArray<z.ZodString>>;
        budgetStyle: z.ZodDefault<z.ZodEnum<{
            "": "";
            budget: "budget";
            balanced: "balanced";
            premium: "premium";
        }>>;
        stayLevel: z.ZodDefault<z.ZodEnum<{
            "": "";
            "3_star": "3_star";
            "4_star": "4_star";
            "5_star": "5_star";
            pool_villa: "pool_villa";
        }>>;
        seatClass: z.ZodDefault<z.ZodEnum<{
            "": "";
            economy: "economy";
            business: "business";
            first: "first";
        }>>;
        pace: z.ZodDefault<z.ZodEnum<{
            "": "";
            balanced: "balanced";
            tight: "tight";
            relaxed: "relaxed";
        }>>;
        constraints: z.ZodObject<{
            maxTransfers: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            avoidRedEye: z.ZodDefault<z.ZodBoolean>;
            maxDailyWalkKm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            mustVisit: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    weights: z.ZodObject<{
        price: z.ZodNumber;
        review: z.ZodNumber;
        route: z.ZodNumber;
        location: z.ZodNumber;
        comfort: z.ZodNumber;
    }, z.core.$strip>;
    weightRationale: z.ZodArray<z.ZodObject<{
        key: z.ZodEnum<{
            price: "price";
            review: "review";
            route: "route";
            location: "location";
            comfort: "comfort";
        }>;
        reason: z.ZodString;
    }, z.core.$strip>>;
    dialog: z.ZodDefault<z.ZodObject<{
        lastAskedQuestionIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
        questionAttempts: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        reasoningLog: z.ZodDefault<z.ZodArray<z.ZodString>>;
        assumptions: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const PriceSchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodString;
}, z.core.$strip>;
export declare const FlightResultSchema: z.ZodObject<{
    id: z.ZodString;
    summary: z.ZodString;
    price: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, z.core.$strip>;
    provider: z.ZodString;
    score: z.ZodNumber;
    url: z.ZodString;
    badges: z.ZodArray<z.ZodString>;
    transfers: z.ZodOptional<z.ZodNumber>;
    durationMinutes: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const StayResultSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    rating: z.ZodNumber;
    pricePerNight: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, z.core.$strip>;
    location: z.ZodObject<{
        area: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, z.core.$strip>;
    provider: z.ZodString;
    score: z.ZodNumber;
    url: z.ZodString;
    badges: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const RouteItemSchema: z.ZodObject<{
    time: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        flight: "flight";
        stay: "stay";
        place: "place";
        move: "move";
        meal: "meal";
        activity: "activity";
    }>;
    url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RouteDraftDaySchema: z.ZodObject<{
    day: z.ZodNumber;
    title: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        time: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<{
            flight: "flight";
            stay: "stay";
            place: "place";
            move: "move";
            meal: "meal";
            activity: "activity";
        }>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ResultsSchema: z.ZodObject<{
    flights: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        summary: z.ZodString;
        price: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
        }, z.core.$strip>;
        provider: z.ZodString;
        score: z.ZodNumber;
        url: z.ZodString;
        badges: z.ZodArray<z.ZodString>;
        transfers: z.ZodOptional<z.ZodNumber>;
        durationMinutes: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    stays: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        rating: z.ZodNumber;
        pricePerNight: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
        }, z.core.$strip>;
        location: z.ZodObject<{
            area: z.ZodString;
            lat: z.ZodNumber;
            lng: z.ZodNumber;
        }, z.core.$strip>;
        provider: z.ZodString;
        score: z.ZodNumber;
        url: z.ZodString;
        badges: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    routeDraft: z.ZodArray<z.ZodObject<{
        day: z.ZodNumber;
        title: z.ZodString;
        items: z.ZodArray<z.ZodObject<{
            time: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<{
                flight: "flight";
                stay: "stay";
                place: "place";
                move: "move";
                meal: "meal";
                activity: "activity";
            }>;
            url: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const UICardSchema: z.ZodObject<{
    type: z.ZodEnum<{
        flight: "flight";
        stay: "stay";
        place: "place";
    }>;
    refId: z.ZodString;
    ctaLabel: z.ZodString;
}, z.core.$strip>;
export declare const AgentResponseSchema: z.ZodObject<{
    type: z.ZodLiteral<"agent_response">;
    stage: z.ZodEnum<{
        collect_intent: "collect_intent";
        collect_dates: "collect_dates";
        collect_region: "collect_region";
        collect_weights: "collect_weights";
        search: "search";
        recommend: "recommend";
    }>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        options: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>;
        allowFreeText: z.ZodBoolean;
    }, z.core.$strip>>;
    state: z.ZodObject<{
        trip: z.ZodObject<{
            region: z.ZodObject<{
                country: z.ZodDefault<z.ZodString>;
                city: z.ZodDefault<z.ZodString>;
                freeText: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>;
            dates: z.ZodObject<{
                start: z.ZodDefault<z.ZodString>;
                end: z.ZodDefault<z.ZodString>;
                flexibleDays: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>;
            travelers: z.ZodObject<{
                adults: z.ZodDefault<z.ZodNumber>;
                children: z.ZodDefault<z.ZodNumber>;
                notes: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>;
            origin: z.ZodObject<{
                city: z.ZodDefault<z.ZodString>;
                airportCode: z.ZodDefault<z.ZodString>;
                freeText: z.ZodDefault<z.ZodString>;
            }, z.core.$strip>;
            purposeTags: z.ZodDefault<z.ZodArray<z.ZodString>>;
            budgetStyle: z.ZodDefault<z.ZodEnum<{
                "": "";
                budget: "budget";
                balanced: "balanced";
                premium: "premium";
            }>>;
            stayLevel: z.ZodDefault<z.ZodEnum<{
                "": "";
                "3_star": "3_star";
                "4_star": "4_star";
                "5_star": "5_star";
                pool_villa: "pool_villa";
            }>>;
            seatClass: z.ZodDefault<z.ZodEnum<{
                "": "";
                economy: "economy";
                business: "business";
                first: "first";
            }>>;
            pace: z.ZodDefault<z.ZodEnum<{
                "": "";
                balanced: "balanced";
                tight: "tight";
                relaxed: "relaxed";
            }>>;
            constraints: z.ZodObject<{
                maxTransfers: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                avoidRedEye: z.ZodDefault<z.ZodBoolean>;
                maxDailyWalkKm: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                mustVisit: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>;
        }, z.core.$strip>;
        weights: z.ZodObject<{
            price: z.ZodNumber;
            review: z.ZodNumber;
            route: z.ZodNumber;
            location: z.ZodNumber;
            comfort: z.ZodNumber;
        }, z.core.$strip>;
        weightRationale: z.ZodArray<z.ZodObject<{
            key: z.ZodEnum<{
                price: "price";
                review: "review";
                route: "route";
                location: "location";
                comfort: "comfort";
            }>;
            reason: z.ZodString;
        }, z.core.$strip>>;
        dialog: z.ZodDefault<z.ZodObject<{
            lastAskedQuestionIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
            questionAttempts: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            reasoningLog: z.ZodDefault<z.ZodArray<z.ZodString>>;
            assumptions: z.ZodDefault<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    results: z.ZodObject<{
        flights: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            summary: z.ZodString;
            price: z.ZodObject<{
                amount: z.ZodNumber;
                currency: z.ZodString;
            }, z.core.$strip>;
            provider: z.ZodString;
            score: z.ZodNumber;
            url: z.ZodString;
            badges: z.ZodArray<z.ZodString>;
            transfers: z.ZodOptional<z.ZodNumber>;
            durationMinutes: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        stays: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            rating: z.ZodNumber;
            pricePerNight: z.ZodObject<{
                amount: z.ZodNumber;
                currency: z.ZodString;
            }, z.core.$strip>;
            location: z.ZodObject<{
                area: z.ZodString;
                lat: z.ZodNumber;
                lng: z.ZodNumber;
            }, z.core.$strip>;
            provider: z.ZodString;
            score: z.ZodNumber;
            url: z.ZodString;
            badges: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>;
        routeDraft: z.ZodArray<z.ZodObject<{
            day: z.ZodNumber;
            title: z.ZodString;
            items: z.ZodArray<z.ZodObject<{
                time: z.ZodString;
                name: z.ZodString;
                type: z.ZodEnum<{
                    flight: "flight";
                    stay: "stay";
                    place: "place";
                    move: "move";
                    meal: "meal";
                    activity: "activity";
                }>;
                url: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    ui: z.ZodObject<{
        cards: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<{
                flight: "flight";
                stay: "stay";
                place: "place";
            }>;
            refId: z.ZodString;
            ctaLabel: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type Stage = z.infer<typeof StageSchema>;
export type WeightKey = z.infer<typeof WeightKeySchema>;
export type PlannerState = z.infer<typeof PlannerStateSchema>;
export type PlannerWeights = z.infer<typeof WeightsSchema>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type PlannerQuestion = z.infer<typeof QuestionSchema>;
export type FlightResult = z.infer<typeof FlightResultSchema>;
export type StayResult = z.infer<typeof StayResultSchema>;
export type RouteDraftDay = z.infer<typeof RouteDraftDaySchema>;
export declare const DEFAULT_WEIGHTS: PlannerWeights;
export declare const EMPTY_RESULTS: AgentResponse["results"];
export declare const INITIAL_STATE: PlannerState;
