/**
 * Importing these separately from `platform/detection` and `lib/app-info` to
 * avoid future conflicts and/or circular deps
 */

import {Platform} from 'react-native'
import {nativeApplicationVersion, nativeBuildVersion} from 'expo-application'
import {init} from '@sentry/react-native'

import {BUILD_ENV, IS_DEV, IS_TESTFLIGHT} from 'lib/app-info'

/**
 * Examples:
 * - `dev`
 * - `1.57.0`
 */
const release = nativeApplicationVersion ?? 'dev'

/**
 * Examples:
 * - `web.dev`
 * - `ios.dev`
 * - `android.dev`
 * - `web.1.57.0`
 * - `ios.1.57.0.3`
 * - `android.1.57.0.46`
 */
const dist = `${Platform.OS}.${nativeBuildVersion}.${
  IS_TESTFLIGHT ? 'tf' : ''
}${IS_DEV ? 'dev' : ''}`

init({
  enabled: !__DEV__,
  autoSessionTracking: false,
  dsn: 'https://2ed052d8898987fad73c6b30b8000d72@o416616.ingest.us.sentry.io/4508176244277248',
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  environment: BUILD_ENV ?? 'development',
  dist,
  release,
})
