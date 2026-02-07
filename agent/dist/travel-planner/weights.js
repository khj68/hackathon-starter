const PURPOSE_KEYWORDS = {
    relax: ["휴양", "힐링", "쉬고", "여유", "호캉스", "휴식", "쉬고싶", "쉬러", "쉬러가"],
    sightseeing: ["관광", "명소", "투어", "구경"],
    food: ["미식", "맛집", "먹방", "레스토랑", "카페"],
    shopping: ["쇼핑", "아울렛", "백화점"],
    business: ["출장", "비즈니스", "컨퍼런스", "회의"],
    family: ["가족", "아이", "부모님", "유아"],
    couple: ["커플", "신혼", "연인", "기념일"],
    activity: ["액티비티", "하이킹", "스포츠", "체험"],
};
function clamp(value, min = 0.05, max = 0.95) {
    if (Number.isNaN(value))
        return min;
    return Math.max(min, Math.min(max, value));
}
function addRationale(state, key, reason) {
    state.weightRationale.push({ key, reason });
    if (state.weightRationale.length > 40) {
        state.weightRationale = state.weightRationale.slice(-40);
    }
}
function adjustWeight(state, key, delta, reason) {
    const before = state.weights[key];
    const after = clamp(Number((before + delta).toFixed(3)));
    if (before !== after) {
        state.weights[key] = after;
        addRationale(state, key, reason);
    }
}
function parsePurposeTags(text) {
    const tags = new Set();
    for (const [tag, keywords] of Object.entries(PURPOSE_KEYWORDS)) {
        if (keywords.some((keyword) => text.includes(keyword))) {
            tags.add(tag);
        }
    }
    return [...tags];
}
export function inferPreferenceSignalsFromText(text) {
    const lower = text.toLowerCase();
    const purposeTags = parsePurposeTags(text);
    let budgetStyle;
    if (["최저가", "저렴", "가성비", "budget", "돈이 없", "돈없"].some((token) => lower.includes(token))) {
        budgetStyle = "budget";
    }
    else if (["프리미엄", "럭셔리", "고급", "premium"].some((token) => lower.includes(token))) {
        budgetStyle = "premium";
    }
    else if (["균형", "밸런스", "balanced"].some((token) => lower.includes(token))) {
        budgetStyle = "balanced";
    }
    let pace;
    if (["빡빡", "타이트", "tight", "후딱", "빨리"].some((token) => lower.includes(token))) {
        pace = "tight";
    }
    else if (["여유", "천천히", "느긋", "relaxed"].some((token) => lower.includes(token))) {
        pace = "relaxed";
    }
    else if (["보통", "balanced pace"].some((token) => lower.includes(token))) {
        pace = "balanced";
    }
    return {
        budgetStyle,
        reviewFocus: ["후기", "리뷰", "평점", "청결"].some((token) => text.includes(token)),
        routeFocus: ["동선", "이동 최소", "직항", "경유 싫", "가깝"].some((token) => text.includes(token)),
        locationFocus: ["위치", "중심", "역세권", "근처", "시내"].some((token) => text.includes(token)),
        comfortFocus: ["편한", "비즈니스석", "퍼스트", "5성", "풀빌라", "럭셔리"].some((token) => text.includes(token)),
        pace,
        purposeTags,
    };
}
export function applyPreferenceSignals(state, signals) {
    if (signals.budgetStyle) {
        state.trip.budgetStyle = signals.budgetStyle;
        if (signals.budgetStyle === "budget") {
            adjustWeight(state, "price", 0.12, "사용자가 가성비/최저가 선호를 언급함");
            adjustWeight(state, "comfort", -0.05, "가격 우선 응답으로 편의 가중치를 소폭 낮춤");
        }
        if (signals.budgetStyle === "premium") {
            adjustWeight(state, "comfort", 0.12, "사용자가 프리미엄 성향을 언급함");
            adjustWeight(state, "price", -0.06, "프리미엄 선호로 가격 가중치를 조정함");
            adjustWeight(state, "review", 0.03, "고급 숙소/항공 선택 시 후기 중요도가 함께 상승");
        }
        if (signals.budgetStyle === "balanced") {
            adjustWeight(state, "price", 0.03, "가격/퀄리티 균형 선호를 반영함");
            adjustWeight(state, "comfort", 0.03, "가격/퀄리티 균형 선호를 반영함");
        }
    }
    if (signals.reviewFocus) {
        adjustWeight(state, "review", 0.1, "사용자가 후기/평점을 중시한다고 언급함");
    }
    if (signals.routeFocus) {
        adjustWeight(state, "route", 0.1, "사용자가 동선/이동 최소화를 원함");
    }
    if (signals.locationFocus) {
        adjustWeight(state, "location", 0.1, "사용자가 위치/접근성을 중요하게 언급함");
    }
    if (signals.comfortFocus) {
        adjustWeight(state, "comfort", 0.1, "사용자가 편의/등급을 중요하게 언급함");
    }
    if (signals.pace) {
        state.trip.pace = signals.pace;
        if (signals.pace === "tight") {
            adjustWeight(state, "route", 0.05, "빡빡한 일정 선호로 동선 효율 가중치를 올림");
        }
        if (signals.pace === "relaxed") {
            adjustWeight(state, "comfort", 0.03, "여유로운 일정 선호로 편안함 가중치를 올림");
            adjustWeight(state, "route", -0.03, "이동 최소 압박을 소폭 완화함");
        }
    }
    if (signals.purposeTags && signals.purposeTags.length > 0) {
        const existing = new Set(state.trip.purposeTags);
        for (const tag of signals.purposeTags) {
            existing.add(tag);
        }
        state.trip.purposeTags = [...existing];
    }
    return state;
}
