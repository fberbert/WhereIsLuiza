import React, { Component } from 'react'
import { 
    View, Text, StyleSheet, TouchableWithoutFeedback, 
    Image, Modal, ImageBackground, BackHandler
} from 'react-native'
import Orientation from 'react-native-orientation-locker'
import Icon from 'react-native-vector-icons/Fontisto'
import Sound from 'react-native-sound'
import Lives from './Lives'
// import GameOver from './GameOver'
import CloseApp from './CloseApp'
import AsyncStorage from '@react-native-community/async-storage'

const cupImage = require('../assets/images/cup.png')
const cupWrong = require('../assets/images/cup-wrong.png')
const luizaHead = require('../assets/images/luizaHead.png')
const detectiveImage = require('../assets/images/detective-original.png')
const empty = require('../assets/images/1px.png')
const wallpaper = require('../assets/images/forest-background.jpg')
const themeBackground = '#FF92B2'
const music = '../assets/sounds/forest.mp3'
const sndYes = '../assets/sounds/got-it.mp3'
const sndNo = '../assets/sounds/errou.mp3'
const sndLive = '../assets/sounds/vida.mp3'
const sndGameOver = '../assets/sounds/game-over.mp3'

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
}

//background music
Sound.setCategory('Playback')
let myMusic = new Sound(require(music), (error) => {

    if (error) {
        console.log('failed to load the sound', error)
    }

    // myMusic.play((success) => {
    // if (success) {
    //         console.log('successfully finished playing')
    //     } else {
    //         console.log('playback failed due to audio decoding errors')
    //         this.setState({musicOn: false})
    //     }
    // })
    myMusic.setNumberOfLoops(-1)
    myMusic.setVolume(0.2)
})

//sound effects
let effectYes = new Sound(require(sndYes), (error) => {})
let effectNo  = new Sound(require(sndNo), (error) => {})
let effectLive  = new Sound(require(sndLive), (error) => {})
let effectGameOver  = new Sound(require(sndGameOver), (error) => {})
effectYes.setVolume(1)
effectNo.setVolume(1)
effectLive.setVolume(1)
effectGameOver.setVolume(1)


export default class Game extends Component {

    state = {
        ...initialState
    }

    async componentDidMount() {
        Orientation.lockToLandscape()

        const stateString = await AsyncStorage.getItem('luizaState')
        const state = JSON.parse(stateString) || initialState
        this.setState(state)

        this.newGame()

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
        BackHandler.exitApp()
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

            this.state.effectsOn && effectYes.play((success) => {
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
            myMusic.play()
        } else {
            myMusic.pause()
        }

        this.setState({musicOn})
        this.syncState()
    }

    toggleEffects() {
        let effectsOn = !this.state.effectsOn
        this.setState({effectsOn})
        this.syncState()
    }

    render() {
        return(
            <ImageBackground source={wallpaper} resizeMode="stretch" 
            style={styles.wallpaper}>
            <View style={styles.myContainer}>
                  
                <CloseApp visible={this.state.modalCloseApp} 
                onBaby={this.newGame}
                onCancel={() => this.setState({modalCloseApp:false})} />

                <Modal 
                visible={this.state.gameOver}
                transparent={true}
                animationType="slide"
                >
                    <View style={styles.modalView}>
                        <TouchableWithoutFeedback onPress={() => {
                            this.newGame(true)
                        }}>
                        <Text>
                            <Text style={styles.modalText}>Fim de Jogo</Text>
                        </Text>
                        </TouchableWithoutFeedback>
                    </View>
                </Modal>
            
                <View style={styles.detectiveView}>
                    <Image source={detectiveImage} style={styles.detectiveImage}></Image>
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
                    <Text style={styles.myTitle}>Onde Está Luiza?</Text>
                </View>

                <View style={styles.myScore}>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreText}>Acertos: {this.state.yourScore}</Text>
                        </View>
                    <View style={styles.scoreItem}>
                        <TouchableWithoutFeedback
                        underlayColor={themeBackground}
                        onPress={() => this.newGame(true)}>
                            <Text style={styles.butNewGame}>Novo Jogo</Text>
                        </TouchableWithoutFeedback>
                        </View>
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreText}>Vidas: <Lives number={this.state.lives} /></Text>
                        </View>
                </View>
                <View style={styles.myBoard}>
                    <View style={styles.boardItem}>
                        <TouchableWithoutFeedback  
                        underlayColor={themeBackground}
                        onPress={ () => { this.checkCup(0) }}
                        >
                            <Image 
                                style={styles.cup}
                                source={this.state.imgCupLeft} ></Image>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={styles.boardItem}>
                        <TouchableWithoutFeedback
                        underlayColor={themeBackground}
                        onPress={ () => { this.checkCup(1) }}
                        >
                            <Image 
                                style={styles.cup}
                                source={this.state.imgCupCenter} ></Image>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={styles.boardItem}>
                        <TouchableWithoutFeedback
                        underlayColor={themeBackground}
                        onPress={ () => { this.checkCup(2) }}
                        >
                            <Image 
                                style={styles.cup}
                                source={this.state.imgCupRight} ></Image>
                        </TouchableWithoutFeedback>
                    </View>
                </View>

                <View style={styles.highScoreView}>
                    <Text style={styles.textHighScore}>Recorde: {this.state.highScore}</Text>
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
        fontFamily: 'BowlbyOneSC-Regular',
        // fontWeight: "bold",
        // textTransform: "uppercase",
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
        fontFamily: 'FredokaOne-Regular',
        fontSize: 20,
        color: '#fff',
        backgroundColor: 'rgba(0, 5, 5, 0.6)',
        padding: 10,
    },
    butNewGame: {
        fontSize: 20,
        fontFamily: 'FredokaOne-Regular',
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
        left: 0,
        marginBottom: 20,
    },
    detectiveImage: {
        width: 110,
        height: 140,
        opacity: 1,
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
        position: "absolute",
        right: 0,
        bottom: 0,
        padding: 10,
        marginRight: 10,
    }, 
    textHighScore: {
        color: '#fff',
        fontFamily: 'FredokaOne-Regular',
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
        fontSize: 60,
        fontFamily: 'FredokaOne-Regular',
        textTransform: 'uppercase',
    }


})