import { View, Text } from 'react-native'
import React from 'react'
import VoiceSearchGoogle from './VoiceSearchGoogle'
import VoiceSearchOpenAi from './VoiceSearchOpenAi'

export default function App() {
  return (
    <View>
      <VoiceSearchGoogle/>
      {/* <VoiceSearchOpenAi/> */}
    </View>
  )
}