const API = {

    async get(url) {
        const response = await fetch(url);

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