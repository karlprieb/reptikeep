process.env.TZ = "America/Sao_Paulo";

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo/ios",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  // jest-expo/ios's own moduleNameMapper tries "^@/(.*)$" before the more
  // specific "^@/assets/(.*)$", so @/assets/* was resolving into src/ by
  // mistake. Overriding this key (same string, so preset merge order still
  // applies) to try assets/ first fixes it.
  moduleNameMapper: {
    "^@/(.*)$": ["<rootDir>/$1", "<rootDir>/src/$1"],
  },
};
