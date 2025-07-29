
class LeumasEmbeddingManager {
    static instance = null;

    static getInstance() {
        if (this.instance === null) {
            this.instance = new LeumasEmbeddingManager();
        }
        return this.instance;
    }

    getEmbedding(text) {
        const words = text.toLowerCase().split(/\s+/);
        const wordFrequency = {};
        words.forEach(word => {
            if (word) {
                wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
        });
        return wordFrequency;
    }
}

async function getLeumasEmbedding(text) {
    const extractor = LeumasEmbeddingManager.getInstance();
    return extractor.getEmbedding(text);
}

module.exports = {
    getLeumasEmbedding,
};
