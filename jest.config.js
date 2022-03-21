/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  transform: {
    "^.+\\.tsx?$": "@swc/jest"
  },
  extensionsToTreatAsEsm: [".ts"],
}

export default config;
