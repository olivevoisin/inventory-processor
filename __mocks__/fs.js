/**
 * Mock pour le module fs
 */
const fs = {
  promises: {
    readdir: jest.fn().mockResolvedValue([
      'invoice1.pdf',
      'invoice2.pdf',
      'test.txt'
    ]),
    access: jest.fn().mockResolvedValue(true),
    mkdir: jest.fn().mockResolvedValue(undefined),
    rename: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockImplementation((path) => {
      if (path.includes('error')) {
        return Promise.reject(new Error('Failed to read file'));
      }
      return Promise.resolve(Buffer.from('mock file content'));
    }),
    writeFile: jest.fn().mockResolvedValue(undefined)
  },
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function(event, handler) {
      if (event === 'end') {
        handler();
      }
      return this;
    })
  }),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
};

module.exports = fs;
