import React, { useState } from 'react'
import { View, Modal, StyleSheet, Text, TouchableWithoutFeedback } from 'react-native'


export default function GameOver(props) {
    const [isVisible, setVisible] = useState(props.visible)
    const [modalClicked, setModalClicked] = useState(false)
    // setVisible(props.visible)

    if (props.visible!=isVisible) {
        setVisible(props.visible)
    }
    // console.log(`modal: ${props.visible} | ${isVisible} | ${modalClicked}`)
    return(
            <Modal 
            visible={isVisible}
            transparent={true}
            animationType="slide"
            >
        <View style={styles.modalView}>
                <TouchableWithoutFeedback onPress={() => {
                    // setModalClicked(true)
                    setVisible(false)
                }}>
                <Text style={styles.myText}>Fim de Jogo</Text>
                </TouchableWithoutFeedback>
        </View>
            </Modal>
    )
}

const styles = StyleSheet.create({
    modalView: {
        flex: 1,
        backgroundColor: "#000",
        opacity: 0.7,
        alignItems: "center",
        justifyContent: "center",
    },
    myText: {
        color: '#fff',
        fontSize: 60,
        fontWeight: 'bold',
    }
})