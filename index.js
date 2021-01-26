import { AppRegistry } from 'react-native'
import Game from './src/Game'
import { name as appName } from './app.json'
require('react-native').unstable_enableLogBox()

AppRegistry.registerComponent(appName, () => Game)
