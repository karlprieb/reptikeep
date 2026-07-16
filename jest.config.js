/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo/ios",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
};
