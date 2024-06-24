/* eslint-disable */
export default {
  displayName: 'nx-dev-ui-community',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/nx-dev/ui-community',
  preset: '../../jest.preset.js',
};
