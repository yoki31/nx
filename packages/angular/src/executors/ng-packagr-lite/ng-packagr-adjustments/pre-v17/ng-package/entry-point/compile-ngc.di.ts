/**
 * Adapted from the original ng-packagr source.
 *
 * Changes made:
 * - Use our own compileNgcTransformFactory instead of the one provided by ng-packagr.
 * - Use NX_STYLESHEET_PROCESSOR instead of STYLESHEET_PROCESSOR.
 * - Use NX_STYLESHEET_PROCESSOR_TOKEN instead of STYLESHEET_PROCESSOR_TOKEN.
 * - USE NX_OPTIONS_TOKEN instead of OPTIONS_TOKEN.
 */

import { InjectionToken, Provider } from 'injection-js';
import type { Transform } from 'ng-packagr/lib/graph/transform';
import { provideTransform } from 'ng-packagr/lib/graph/transform.di';
import {
  NX_STYLESHEET_PROCESSOR,
  NX_STYLESHEET_PROCESSOR_TOKEN,
} from '../../styles/stylesheet-processor.di';
import { NX_OPTIONS_TOKEN } from '../options.di';
import { nxCompileNgcTransformFactory } from './compile-ngc.transform';

export const NX_COMPILE_NGC_TOKEN = new InjectionToken<Transform>(
  `nx.v1.compileNgc`
);
export const NX_COMPILE_NGC_TRANSFORM = provideTransform({
  provide: NX_COMPILE_NGC_TOKEN,
  useFactory: nxCompileNgcTransformFactory,
  deps: [NX_STYLESHEET_PROCESSOR_TOKEN, NX_OPTIONS_TOKEN],
});
export const NX_COMPILE_NGC_PROVIDERS: Provider[] = [
  NX_STYLESHEET_PROCESSOR,
  NX_COMPILE_NGC_TRANSFORM,
];
