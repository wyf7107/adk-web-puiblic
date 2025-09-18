module.exports = function(config) {
  config.set({
    frameworks: ['jasmine', 'karma-typescript'],
    preprocessors: {
      'src/**/*.ts': ['karma-typescript']
    },
    karmaTypescriptConfig: {
      tsconfig: './tsconfig.json',
      reports: {
        "html": "coverage",
        "text-summary": "" // Log to console
      }
    },
    reporters: ['progress', 'karma-typescript'],
    files: [
      './src/**/*.spec.ts'
    ],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
        ]
      }
    },
    singleRun: true
  });
};

