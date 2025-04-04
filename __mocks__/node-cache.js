function NodeCache() {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };
}
module.exports = NodeCache;
