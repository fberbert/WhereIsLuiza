import React from 'react'
import { StyleSheet, Text } from 'react-native'
// import Icon from 'react-native-vector-icons/Fontisto'

//animations
import Animation from 'lottie-react-native'
import anim from '../assets/lottie/heart.json'


export default function Lives(props) {
    // console.log(`viu: ${props.number}`)

    return Array(props.number).fill(0).map((value, index) => {
        // return <Text key={index}><Icon name="heart" size={15} style={styles.heart} />&nbsp;</Text>
        return <Text key={index}>
            <Animation 
            style={{
                width: 30,
                height: 30,
            }}
            autoPlay loop
            source={anim}
             />&nbsp;</Text>
    })
}

const styles = StyleSheet.create({
    heart: {
        color: '#ff0000',
    }
})