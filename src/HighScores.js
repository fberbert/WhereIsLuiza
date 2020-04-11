import React, { useState } from 'react'
import { 
    View, Modal, StyleSheet, Text, TouchableWithoutFeedback, 
    ImageBackground, Animated, Easing, 
    ScrollView, FlatList } from 'react-native'
import Icon from 'react-native-vector-icons/FontAwesome5'

const wallpaper = require('../assets/images/forest-background2.jpg')

 var animateValue = new Animated.Value(0)

const titleMargin = animateValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 30, 0]
})

function animate() {
    animateValue.setValue(0)
    Animated.timing(
        animateValue,
        {
            toValue: 1,
            duration: 4000,
            easing: Easing.linear,
            useNativeDriver: false
        }
    ).start(() => animate())
}

export default function HighScores(props) {
    // const [isVisible, setVisible] = useState(props.visible)

    const players = [
        {"id": 1, "rank": 1, "name": "Luiza", "score": 10},
        {"id": 3, "rank": 2, "name": "Papai da Luiza", "score": 8},
        {"id": 2, "rank": 3, "name": "Juliana", "score": 7},
        {"id": 4, "rank": 4, "name": "Vó Nani", "score": 7},
        {"id": 6, "rank": 5, "name": "Dinda", "score": 6},
        {"id": 5, "rank": 6, "name": "Tia Jaque", "score": 5},
        {"id": 8, "rank": 7, "name": "Maria", "score": 4},
        {"id": 7, "rank": 8, "name": "Tio Daniel", "score": 4},
        {"id": 9, "rank": 9, "name": "Lucas Neto", "score": 3},
        {"id": 10, "rank": 10, "name": "Ana da Frozen", "score": 1},
]

       const PlayerItem = props =>
        <View style={{
            flexDirection: "row", 
            }}>

            <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                height: 40,
                }}>
                <View><Icon name="trophy" size={30} style={{color: '#FFCE42'}} /></View>
                <Text style={[
                    {
                        alignItems: "center", 
                        justifyContent: "center",
                        color: 'black',
                        fontWeight: 'bold',
                        marginTop: -30,
                    }
                ]}>{props.rank}</Text>
            </View>

            <View style={{flex: 3}}><Text style={styles.rankItem}>{props.name}</Text></View>
            <View style={{flex: 1, alignItems: 'center'}}><Text style={styles.rankItem}>{props.score}</Text></View>
        </View>

    const renderItem = ({ item }) => {
        return <PlayerItem {...item} />
    }

    // if (props.visible!=isVisible) {
    //     setVisible(props.visible)
    // }
    // console.log(`modal: ${props.visible} | ${isVisible} | ${modalClicked}`)
    // animate()

    return(
            <Modal 
            visible={props.visible}
            transparent={true}
            animationType="slide"
            >

            <ImageBackground source={wallpaper} resizeMode="stretch" 
            style={styles.wallpaper}>

            <View style={styles.myContainer}>

                <View style={styles.myHeader}>
                    <Animated.Text style={{
                        marginLeft: titleMargin,
                        color: '#fff',
                        fontSize: 40,
                        fontFamily: 'BowlbyOneSC-Regular',
                        textShadowColor: '#000',
                        textShadowRadius: 20,
                        textShadowOffset: {width: 2, height: 2},
                    }}>Hall da Fama
                    </Animated.Text>
                </View>

                <View style={{
                    marginTop: 15,
                    flexDirection: "row", 
                    width: '80%', 
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: 5,
                    }}>
                    <View style={{flex: 1, alignItems: 'center'}}><Text style={[styles.rankItem, {fontSize: 15}]}>RANK</Text></View>
                    <View style={{flex: 3}}><Text style={[styles.rankItem, {fontSize: 15}]}>NOME</Text></View>
                    <View style={{flex: 1, alignItems: 'center'}}><Text style={[styles.rankItem, {fontSize: 15}]}>PONTOS</Text></View>
                </View>

                {/* <ScrollView style={{width: '80%'}}> */}
                    <FlatList data={players} renderItem={renderItem}
                         style={{
                            width: '80%',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            paddingTop: 5,
                         }}
                        keyExtractor={(_, index) => index.toString()} />
                {/* </ScrollView> */}

                <View style={styles.closeView}>
                    <TouchableWithoutFeedback onPress={() => {
                        props.onCancel()
                        console.log("fechar...")
                    }}>
                        <Icon name="home" size={30} style={{color: "#ffffff" }} />
                    </TouchableWithoutFeedback>
                </View>

            </View>
            </ImageBackground>
            </Modal>
    )
}

const styles = StyleSheet.create({
    myContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    closeView: {
        position: "absolute",
        right: 20,
        bottom: 20,
    },
    myText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'right'
    },
    rankItem: {
        color: 'white',
        fontSize: 20,
        marginRight: 15,
        fontFamily: 'FredokaOne-Regular',
    },
    wallpaper: {
        flex: 1,
        resizeMode: "cover",
        justifyContent: "center"
    },
    myHeader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 10,
    },

})