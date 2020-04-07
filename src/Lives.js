import React from 'react'
import { StyleSheet, Text } from 'react-native'
import Icon from 'react-native-vector-icons/Fontisto'

export default function Lives(props) {
    // console.log(`viu: ${props.number}`)

    return Array(props.number).fill(0).map((value, index) => {
        return <Text key={index}><Icon name="heart" size={15} style={styles.heart} />&nbsp;</Text>
    })
}

const styles = StyleSheet.create({
    heart: {
        color: '#ff0000',
    }
})