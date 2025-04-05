/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    clearMocks: true, // Automatically clear mock calls and instances between every test
    coverageProvider: "v8", // Optional: for code coverage reporting
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    // Optional: Define roots if your tests are not in the root or src
    // roots: ["<rootDir>/src", "<rootDir>/tests"],
    testMatch: [ // Where to find test files
        "**/?(*.)+(spec|test).[tj]s?(x)"
    ]
};