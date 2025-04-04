describe('Minimal Test Suite', () => {
  test('true is true', () => {
    expect(true).toBe(true);
  });
  
  test('can add numbers', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('can handle promises', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});
