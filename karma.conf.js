module.exports = function(config) {
  config.set({
    browsers: ['ChromeHeadlessCI'],
    frameworks: ['jasmine'],
    files: [
      './src/**/*.spec.ts'
    ],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--remote-debugging-port=9222'
        ]
      }
    },

    singleRun: true
  });
};

