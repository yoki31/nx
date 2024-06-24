import {
  addDependenciesToPackageJson,
  detectPackageManager,
  type GeneratorCallback,
  type Tree,
} from '@nx/devkit';
import {
  babelPresetExpoVersion,
  babelRuntimeVersion,
  expoMetroConfigVersion,
  expoMetroRuntimeVersion,
  expoSplashScreenVersion,
  expoStatusBarVersion,
  jestExpoVersion,
  reactNativeSvgTransformerVersion,
  reactNativeSvgVersion,
  reactNativeWebVersion,
  reactTestRendererVersion,
  testingLibraryJestNativeVersion,
  testingLibraryReactNativeVersion,
  typesReactVersion,
} from './versions';

export function ensureDependencies(host: Tree): GeneratorCallback {
  const isPnpm = detectPackageManager(host.root) === 'pnpm';
  return addDependenciesToPackageJson(
    host,
    {
      'expo-splash-screen': expoSplashScreenVersion,
      'expo-status-bar': expoStatusBarVersion,
      'react-native-web': reactNativeWebVersion,
      '@expo/metro-config': expoMetroConfigVersion,
      '@expo/metro-runtime': expoMetroRuntimeVersion,
      'react-native-svg-transformer': reactNativeSvgTransformerVersion,
      'react-native-svg': reactNativeSvgVersion,
    },
    {
      '@types/react': typesReactVersion,
      'react-test-renderer': reactTestRendererVersion,
      '@testing-library/react-native': testingLibraryReactNativeVersion,
      '@testing-library/jest-native': testingLibraryJestNativeVersion,
      'jest-expo': jestExpoVersion,
      'babel-preset-expo': babelPresetExpoVersion,
      ...(isPnpm
        ? {
            '@babel/runtime': babelRuntimeVersion, // @babel/runtime is used by react-native-svg
          }
        : {}),
    }
  );
}
