import React, { Component } from 'react'
import { 
    View, Text, StyleSheet, TouchableWithoutFeedback, 
    Modal, ImageBackground, BackHandler, 
    Animated, Easing, TextInput
} from 'react-native'
import Orientation from 'react-native-orientation-locker'
import Icon from 'react-native-vector-icons/Fontisto'
import Sound from 'react-native-sound'
import Lives from './Lives'
import Trophies from './Trophies'
// import GameOver from './GameOver'
import CloseApp from './CloseApp'
import HighScores, { getData } from './HighScores'
import AsyncStorage from '@react-native-community/async-storage'
import cssValues from './cssValues'

//animations
import Animation from 'lottie-react-native'
import trophy from '../assets/lottie/trophy.json'
import spider from '../assets/lottie/spider.json'

const cupImage = require('../assets/images/cup-resized.png')
const cupWrong = require('../assets/images/cup-wrong-resized.png')
const luizaHead = require('../assets/images/luizaHead-draw.png')
const detectiveImage = require('../assets/images/detective-original.png')
// const empty = require('../assets/images/1px.png')
const wallpaper = require('../assets/images/forest-background.jpg')
// const wallpaperEnd = require('../assets/images/forest-background2.jpg')
const themeBackground = '#FF92B2'
const music = '../assets/sounds/forest.mp3'
const sndYes = '../assets/sounds/got-it.mp3'
const sndNo = '../assets/sounds/errou.mp3'
const sndLive = '../assets/sounds/vida.mp3'
const sndGameOver = '../assets/sounds/game-over.mp3'
const sndBoing = '../assets/sounds/boing.wav'
const sndSpider = '../assets/sounds/spider.mp3'

const initialState = {
    yourScore: 0,
    lives: 3,
    streak: 0,
    openned: false,
    imgCupLeft: cupImage,
    imgCupCenter: cupImage,
    imgCupRight: cupImage,
    cupArray: Array(3).fill(false),
    musicOn: true,
    effectsOn: true,
    gameOver: false,
    highScore: 0,
    modalCloseApp: false,
    modalHighScores: false,
    playerName: '',
}

//background music
Sound.setCategory('Playback')

let myMusic = new Sound(require(music), () => {})
myMusic.setNumberOfLoops(-1)
myMusic.setVolume(0.2)

//sound effects
let effectYes = new Sound(require(sndYes), () => {})
let effectNo  = new Sound(require(sndNo), () => {})
let effectLive  = new Sound(require(sndLive), () => {})
let effectGameOver  = new Sound(require(sndGameOver), () => {})
let effectBoing  = new Sound(require(sndBoing), () => {})
let effectSpider  = new Sound(require(sndSpider), () => {})
effectYes.setVolume(1)
effectNo.setVolume(1)
effectLive.setVolume(1)
effectGameOver.setVolume(1)
effectBoing.setVolume(1)
effectSpider.setVolume(1)


export default class Game extends Component {

    constructor() {
        super()
        this.animateValue = new Animated.Value(0)
        this.springValue = new Animated.Value(1)
        this.riseValue = new Animated.Value(0)
    }

    state = {
        ...initialState
    }

    async componentDidMount() {
        Orientation.lockToLandscape()

        this.animate()

        const stateString = await AsyncStorage.getItem('luizaState')
        const state = JSON.parse(stateString) || initialState
        this.setState(state)

        this.setState({modalCloseApp: false})
        this.setState({modalHighScores: false})
        this.newGame()

        this.state.musicOn && myMusic.play()
    }

    componentWillUnmount() {
        myMusic.stop()
        myMusic.release()
        this.syncState()
    }

    syncState() {
        AsyncStorage.setItem('luizaState', JSON.stringify(this.state))
    }

    closeApp() {
        this.syncState()
        myMusic.stop()
        myMusic.release()
        BackHandler.exitApp()
    }

    async saveHighScore() {

        let myHeaders = new Headers();
        myHeaders.append('pragma', 'no-cache');
        myHeaders.append('cache-control', 'no-cache');
        myHeaders.append('charset', 'utf-8');

        let formData = new FormData();
        formData.append('name', encodeURI(this.state.playerName));
        formData.append('score', this.state.yourScore)

        fetch(
            'http://187.84.229.156:8040/publico/WhereIsLuiza/index.php',
            {
                method: "POST",
                headers: myHeaders,
                body: formData
            })
            .then((response) => response.text())
            .then((responseData) => {
                // console.log("retorno do post: " + responseData)
            })

        getData()
    }

    newGame(isReset) {

        let cupArray = this.state.cupArray
        cupArray.fill(false)
        cupArray[Math.floor(Math.random() * cupArray.length)] = true
        this.setState({cupArray})

        let imgCupLeft, imgCupCenter, imgCupRight
        imgCupLeft = imgCupCenter = imgCupRight = cupImage 
        this.setState({
            imgCupLeft, 
            imgCupCenter, 
            imgCupRight, 
            openned: false,
        })

        isReset && this.setState({
            yourScore: 0, 
            lives: 3, 
            streak: 0,
            gameOver: false
        })
 
        this.state.musicOn && myMusic.play()

        this.syncState()
        console.log(`novo jogo... ${cupArray}`)

    }

    checkCup(cupId) {

        let openned = !this.state.openned

        if (this.state.lives<=0) {
            return false
        } 

        if (this.state.openned) {
            // let imgCupLeft, imgCupCenter, imgCupRight
            // imgCupLeft = imgCupCenter = imgCupRight = cupImage 
            // this.setState({imgCupLeft, imgCupCenter, imgCupRight, openned})
            this.newGame(false)
            return
        }

        let cupArray = this.state.cupArray
        let yourScore = this.state.yourScore
        let streak = this.state.streak
        let lives = this.state.lives
        let gotIt = false
        let cupMap = {
            "0": "imgCupLeft",
            "1": "imgCupCenter",
            "2": "imgCupRight",
        }

        if (cupArray[cupId]) { //find

            gotIt = true

            yourScore += 1
            streak += 1


            //foreach 2 streaks, +1 live
            let wonLive = 0
            if (streak===2) {
                streak = 0
                lives += 1
                wonLive = 1
            }

            this.state.effectsOn && effectYes.play(() => {
                wonLive && effectLive.play()
            })


            // this.setState({[cupMap[cupId]]: luizaHead})

        } else { // did not find

            lives -= 1
            this.setState({lives})

            this.state.effectsOn && effectNo.play()
            // this.setState({[cupMap[cupId]]: cupWrong})

            if (parseInt(lives)===0) {
                //gameover
                this.state.effectsOn && effectGameOver.play()

                if (this.state.highScore < this.state.yourScore) {
                    this.setState({highScore: this.state.yourScore})
                }

                this.setState({gameOver: true})
            }
        }
        this.setState({yourScore, lives, streak, openned})

        //open cups
        let cupStatus
        for (let i=0; i<cupArray.length; i++) {

            if (cupArray[i]) {
                cupStatus = luizaHead                
            } else if (gotIt) {
                cupStatus = cupImage
            } else {
                cupStatus = cupWrong
            }

            this.setState({[cupMap[i]]: cupStatus})
        }
        this.syncState()
    }

    toggleMusic() {
        let musicOn = !this.state.musicOn

        if (musicOn) {
            myMusic = new Sound(require(music), () => {})
            myMusic.setVolume(0.2)
            myMusic.play()
        } else {
            // myMusic.pause()
            myMusic.stop()
            myMusic.release()
        }

        this.setState({musicOn})
        this.syncState()
    }

    toggleEffects() {
        let effectsOn = !this.state.effectsOn
        this.setState({effectsOn})
        this.syncState()
    }

    spring() {
        this.springValue.setValue(0.8)
        Animated.spring(
            this.springValue,
            {
                toValue: 1,
                friction: 1,
                useNativeDriver: false
            }
        ).start()
    }

    rise() {
        this.riseValue.setValue(0)
        Animated.timing(
            this.riseValue,
            {
                toValue: 1,
                duration: 500,
                easing: Easing.linear,
                useNativeDriver: false
            }
        ).start()
    }

    animate() {
        this.animateValue.setValue(0)
        Animated.timing(
            this.animateValue,
            {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: false
            }
        ).start(() => this.animate())
    }

    render() {

        const titleSize = this.animateValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [40, 35, 40]
        })

        const titleMargin = this.animateValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 30, 0]
        })

        const cupMargin = this.animateValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 30, 0]
        })

        return(
            <ImageBackground source={wallpaper} resizeMode="stretch" 
            style={styles.wallpaper}>
            <View style={styles.myContainer}>
                  
                <HighScores visible={this.state.modalHighScores} 
                    onCancel={() => {
                        // console.log("vamos fechar?")
                        this.setState({modalHighScores:false})
                    }} />

                <CloseApp visible={this.state.modalCloseApp} 
                onBaby={this.newGame}
                onCancel={() => this.setState({modalCloseApp:false})} />

                {/* Modal fim de jogo */}
                <Modal 
                visible={this.state.gameOver}
                transparent={true}
                animationType="slide"
                >

            {/* <ImageBackground source={wallpaperEnd} resizeMode="stretch" 
            style={styles.wallpaper}> */}

                    <View style={[styles.modalView,
                        {
                            // backgroundColor: 'none',
                            opacity: 0.8,
                            flexDirection: 'column',
                            flex: 2,
                    }
                    ]}>
                        <Text style={{textAlign: 'center'}}>
                            <Text style={styles.modalText}>Fim de Jogo{'\n'}
                            
                            <Animation 
                            style={{
                                width: 45,
                                height: 45,
                            }}
                            autoPlay loop
                            source={trophy}
                            />
                            &nbsp;= {this.state.yourScore}
                            </Text>
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}>
                            <TextInput placeholder="Digite seu nome" 
                            value={this.state.playerName} 
                            onChangeText={(playerName) => {
                                this.setState({playerName})
                            }}
                            autoCompleteType="name"
                            placeholderTextColor="#c0c0c0"
                            selectionColor="#c0c0c0"
                            style={{
                                borderColor: "#c0c0c0",
                                borderWidth: 0.5,
                                width: 250,
                                color: '#c0c0c0',
                                paddingLeft: 20,
                                fontSize: 20,
                                fontFamily: cssValues.defaultFontFamily,
                                marginRight: 10,
                            }}
                            />
                         <TouchableWithoutFeedback onPress={() => {
                            this.saveHighScore()
                            this.newGame(true)
                        }}>


                           <Icon name="save" size={40} 
                            style={{
                                color: '#fff'
                            }} />

                        </TouchableWithoutFeedback>
                            </View> 
 
                    </View>
                {/* </ImageBackground> */}


                </Modal>
            
                <View style={styles.spiderView}>
                    <TouchableWithoutFeedback onPress={() => {
                        this.state.effectsOn && effectSpider.play()
                    }}>
                    <Animation
                        style={{
                            width: 120,
                            height: 120,
                        }}
                        autoPlay loop
                        source={spider}
                    />
                    </TouchableWithoutFeedback>
                </View>


                <View style={styles.detectiveView}>
                    <TouchableWithoutFeedback onPress={() => {
                        this.spring()
                        this.state.effectsOn && effectBoing.play()
                    }}>
                    <Animated.Image source={detectiveImage} 
                    style={{
                        width: 110,
                        height: 140,
                        transform: [{scale: this.springValue}]
                    }}></Animated.Image>
                    </TouchableWithoutFeedback>
                </View>

                <View style={styles.volumeIconsView}>

                    <TouchableWithoutFeedback
                    onPress={ () => this.toggleEffects() }>
                        <Icon name="volume-mute" size={25} 
                        style={[styles.volumeIcon, !this.state.effectsOn ? {opacity: 0.5} : null]} />
                    </TouchableWithoutFeedback>

                    <TouchableWithoutFeedback
                    onPress={ () => this.toggleMusic() }>
                        <Icon name="music-note" size={25} 
                        style={[styles.volumeIcon, !this.state.musicOn ? {opacity: 0.5} : null]} />
                    </TouchableWithoutFeedback>

                    <TouchableWithoutFeedback
                    onPress={ () => {
                        this.setState({modalCloseApp: true})
                    }}>
                        <Icon name="close-a" size={25} 
                        style={styles.volumeIcon} />
                    </TouchableWithoutFeedback>


                </View>

                <View style={styles.myHeader}>
                    <Animated.Text style={{
                        marginLeft: titleMargin,
                        color: '#fff',
                        fontSize: 40,
                        fontFamily: 'BowlbyOneSC-Regular',
                        textShadowColor: '#000',
                        textShadowRadius: 20,
                        textShadowOffset: {width: 2, height: 2},
                    }}>Onde Está Luiza?
                    </Animated.Text>
                </View>

                <View style={styles.myScore}>
                    <View style={[styles.scoreItem, {
                        flex: 1,
                        flexDirection: 'row', 
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        marginRight: 20,
                        }]}>
                        <Trophies number={this.state.yourScore} />
                    </View>
                    {/* <View style={styles.scoreItem}>
                        <TouchableWithoutFeedback
                        underlayColor={themeBackground}
                        onPress={() => this.newGame(true)}>
                            <Text style={styles.butNewGame}>Novo Jogo</Text>
                        </TouchableWithoutFeedback>
                        </View> */}
                    <View style={[styles.scoreItem, {
                        flex: 1,
                        flexDirection: 'row',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        marginLeft: 20,
                        }]}>
                        <Lives number={this.state.lives} />
                        </View>
                </View>
                <View style={styles.myBoard}>
                    <View style={styles.boardItem}>
                        <TouchableWithoutFeedback  
                        underlayColor={themeBackground}
                        onPress={ () => {
                             this.checkCup(0) 
                        }}
                        >
                            <Animated.Image 
                                style={{
                                    width: 117,
                                    height: 120,
                                    marginBottom: cupMargin,
                                }}
                                source={this.state.imgCupLeft} ></Animated.Image>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={styles.boardItem}>
                        <TouchableWithoutFeedback
                        underlayColor={themeBackground}
                        onPress={ () => { this.checkCup(1) }}
                        >
                            <Animated.Image 
                                style={{
                                    width: 117,
                                    height: 120,
                                    marginBottom: cupMargin,
                                }}
                                source={this.state.imgCupCenter} ></Animated.Image>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={styles.boardItem}>
                        <TouchableWithoutFeedback
                        underlayColor={themeBackground}
                        onPress={ () => { this.checkCup(2) }}
                        >
                            <Animated.Image 
                                style={{
                                    width: 117,
                                    height: 120,
                                    marginBottom: cupMargin,
                                }}
                                source={this.state.imgCupRight} ></Animated.Image>
                        </TouchableWithoutFeedback>
                    </View>
                </View>

                <View style={styles.highScoreView}>
                    <TouchableWithoutFeedback onPress={() => {
                        this.setState({modalHighScores: true})
                    }}>
                    <Text style={styles.textHighScore}>Hall da Fama | Recorde: {this.state.highScore}</Text>
                    </TouchableWithoutFeedback>
                </View>
            </View>
            </ImageBackground>
        )
    }
}

const styles = StyleSheet.create({
    myContainer: {
        flex: 1,
    },
    myHeader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
        // backgroundColor: themeBackground,
    },
    myScore: {
        flex: 1,
        flexDirection: 'row',
        marginLeft: 140,
        marginRight: 100,
        marginTop: 20,
    },
    myBoard: {
        flex: 6,
        flexDirection: 'row',
        marginLeft: 140,
        marginRight: 100,
    },
    myTitle: {
        color: '#fff',
        fontSize: 40,
        fontFamily: cssValues.titleFontFamily,
        textShadowColor: '#000',
        textShadowRadius: 20,
        textShadowOffset: {width: 2, height: 2},
    },
    scoreItem: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    boardItem: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    cup: {
        width: 80,
        height: 120,
    },
    scoreText: {
        fontFamily: cssValues.defaultFontFamily,
        fontSize: 20,
        color: '#fff',
        backgroundColor: 'rgba(0, 5, 5, 0.6)',
        padding: 10,
    },
    butNewGame: {
        fontSize: 20,
        fontFamily: cssValues.defaultFontFamily,
        backgroundColor: 'rgba(0, 5, 5, 0.6)',
        color: '#fff',
        textTransform: 'none',
        padding: 10,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: '#666',
    },
    detectiveView: {
        position: "absolute",
        bottom: 0,
        left: 10,
        marginBottom: 20,
    },
    detectiveImage: {
        width: 110,
        height: 140,
        opacity: 1,
    },
    spiderView: {
        position: "absolute",
        top: 0,
        left: 20,
    },
    volumeIconsView: {
        position: "absolute",
        flexDirection: "row",
        // backgroundColor: '#000',
        top: 0,
        right: 0,
        padding: 5,
    },
    volumeIcon: {
      color: '#fff',
      margin: 10,
      textShadowColor: '#000',
      textShadowRadius: 2,
      textShadowOffset: {width: 1, height: 1},
    },
    wallpaper: {
        flex: 1,
        resizeMode: "cover",
        justifyContent: "center"
    },
    highScoreView: {
        flexDirection: 'row',
        position: "absolute",
        right: 10,
        bottom: 10,
        padding: 10,
        marginRight: 10,
    }, 
    textHighScore: {
        color: '#fff',
        fontFamily:  cssValues.defaultFontFamily,
        fontSize: 20,

    },
    modalView: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: "#000",
        opacity: 0.7,
        alignItems: "center",
        justifyContent: "center",
    },
    modalText: {
        color: '#fff',
        fontSize: 45,
        fontFamily: cssValues.defaultFontFamily,
        textTransform: 'uppercase',
    }

})
