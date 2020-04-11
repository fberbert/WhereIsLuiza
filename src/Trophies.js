import React from 'react'
import { Text } from 'react-native'

//animations
import Animation from 'lottie-react-native'
import anim from '../assets/lottie/trophy.json'


export default function Trophies(props) {
    // console.log(`viu: ${props.number}`)

    return Array(props.number).fill(0).map((value, index) => {
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
