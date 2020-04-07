import React, { Component } from 'react'
import { Modal, View, Text, TouchableWithoutFeedback, StyleSheet, BackHandler } from 'react-native'

export default class CloseApp extends Component {

    closeApp() {
        BackHandler.exitApp()
    }

    render() {
        return(
            <Modal visible={this.props.visible} style={styles.myModal}
            transparent={true} animationType="fade"
            onRequestClose={this.props.onCancel}>
                <View style={styles.mainView}>
                    <Text style={styles.askText}>Sair do jogo?</Text>
                    <View style={{flexDirection: 'row'}}>
                    <TouchableWithoutFeedback onPress={this.closeApp}>
                        <Text style={styles.answerText}>Sim</Text>
                    </TouchableWithoutFeedback>
                    <TouchableWithoutFeedback onPress={this.props.onCancel}>
                        <Text style={styles.answerText}>Não</Text>
                    </TouchableWithoutFeedback>
                    </View>
                </View>
            </Modal>
        )
    }
}

const styles = StyleSheet.create({
    myModal: {
        // flex: 1,
        // backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    mainView: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: "center",
        alignItems: "center",
    },
    askText: {
        color: '#fff',
        fontFamily: 'FredokaOne-Regular',
        fontSize: 60,
    },
    answerText: {
        color: '#fff',
        fontFamily: 'FredokaOne-Regular',
        fontSize: 30,
        margin: 30,
    },
})