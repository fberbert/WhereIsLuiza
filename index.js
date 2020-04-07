require('react-native').unstable_enableLogBox()
/**
 * @format
 */

import {AppRegistry} from 'react-native';
import Game from './src/Game';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => Game);
