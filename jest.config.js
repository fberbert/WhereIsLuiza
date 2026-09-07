module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: ['node_modules/(?!(react-native|@react-native|@react-native-async-storage)/)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.ts'],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
}
