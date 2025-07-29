
const { pipeline } = require('@xenova/transformers');

class EmbeddingManager {
    static instance = null;
    static model = 'Xenova/all-MiniLM-L6-v2';

    static async getInstance() {
        if (this.instance === null) {
            this.instance = await pipeline('feature-extraction', this.model);
        }
        return this.instance;
    }
}

async function getEmbedding(text) {
    const extractor = await EmbeddingManager.getInstance();
    const result = await extractor(text, {
        pooling: 'mean',
        normalize: true,
    });
    return result.data;
}

module.exports = {
    getEmbedding,
};
