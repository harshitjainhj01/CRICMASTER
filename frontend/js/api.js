const API_BASE = "http://127.0.0.1:8000";

const API = {

    async get(url) {
        const target = url.startsWith("http") ? url : `${API_BASE}${url}`;
        const response = await fetch(target);

        if (!response.ok) {
            throw new Error(
                `API request failed: ${response.status}`
            );
        }

        return response.json();
    },

    async health() {
        return this.get("/api/health");
    },

    async liveMatches() {
        return this.get("/api/cricket/live");
    }

};