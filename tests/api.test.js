const assert = require('assert');
const http = require('http');

describe('API Tests', () => {
  it('should return a list of components', (done) => {
    http.get('http://localhost:42389/api/components', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const components = JSON.parse(data);
        assert(Array.isArray(components), 'Response should be an array');
        assert(components.length > 0, 'Should return at least one component');
        done();
      });
    }).on('error', (err) => {
      done(err);
    });
  });
});
