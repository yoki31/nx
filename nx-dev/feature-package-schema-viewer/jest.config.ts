/* eslint-disable */
export default {
  displayName: 'nx-dev-feature-package-schema-viewer',
  globals: {},
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/nx-dev/feature-package-schema-viewer',
  preset: '../../jest.preset.js',
};
