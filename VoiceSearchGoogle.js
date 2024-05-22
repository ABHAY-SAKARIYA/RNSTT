import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from "expo-file-system";
import axios from 'axios';

const recordingOptions = {
  // android not currently in use. Not getting results from speech to text with .m4a
  // but parameters are required
  android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
  },
  ios: {
      extension: '.wav',
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
  },
};

export default function VoiceSearchGoogle() {
  const [recording, setRecording] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [RecordPermission, setRecordPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('')
  const [transliteratedText,setTransliteratedText] = useState("");

  const getRecordPermission = async () => {
    const permission = await Audio.requestPermissionsAsync();
    // console.log("Recording Permission===>",permission);
    setRecordPermission(permission.granted);
    console.log(RecordPermission)
  }

  useEffect(()=>{
    getRecordPermission();
  },[])

  const deleteAudioFile = async () => {
    try {

      const info = await FileSystem.getInfoAsync(recording.getURI());
      if (info) {
        await FileSystem.deleteAsync(info.uri);
        console.log("deleted")
      }
    } catch (er) {
      console.log("error while deleting", er);
    }
  }


  const startRecording = async () => {
    if (!RecordPermission) return

    setIsRecording(true);
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: true,
    });
    
    const recording = new Audio.Recording();
    
    try {
      
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      
    } catch (error) {
      console.log("error while recording audio",error);
      stopRecording()
    }


    setRecording(recording)

  }

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI()
      sendAudioToGoogle(uri)
    } catch (error) {
      console.log("error while stop recording", error)
    }
  }


  const sendAudioToGoogle = async (uri) => {
    try {
      const token = "ya29.c.c0AY_VpZgdW3tAtnv4rVLbNES-LoVuIUcUDk4H8Y-xSYFtthvrrpOT4naL0KkUY7W0PmGxRkzXue4dD4jLPuhyLAm5S4NQuKhkpFEFj2zNycUkMfoTyR8gVJNtIh0cs2Ce_FkVFpnDE_8j2UhST51C3b-QLHNHQM_nqRl6kQmWyvbH6_Sduzzzkzb5cWXdzECoLZ8cD3fXPXpUnzIgHmlPmWKLNFmahLGDas0uSXGtW9A5zaAhhcKy6ttqXcGT8bZVle3dN9e8kGOPTb1py_ScPU9mbHNCocIHP10UbChjzgvIPvoXgFPR-JdWGPIxiGnRmYoc1UU7YuYPufnONdsrJRCtXBSI8CDQ90063z1nqpWfBv_eYo7D0sYN384A3_sSpbFrj5efov5F-hcqqBpyeQybv8jdd3SwyQBV4fSQRv6Y2ethcO_a4mBc2YbdhpJ1hXozMo5RFUY6M2kbiaw6c7MOxg52d2F9vzWSZh5sudjFdRSuoraYWbyvfvatFzsQ7M0xwicVqMRWuegMfozw86enr5RBr2sgqOyps_5Y97UktWMaclr_xoUyvuckp0gwu9w3fRa_usrzOQ5YInmQZ2OxFc4J__05aSg7j-gY-tIQzSiMz1U-tiZbX33ymIfhYiRqhg2yYMec0jSyJRIXraRh8IVoY76RqQQ94IjRJzjBb-bZe33MIl2ox_UvlOp5ctwyy6JiUcFOco2Q843QYfVJYjpX62ZOY8pXIXF0-Wcer5dfvSX8hvvcOhqURc41Sk6a1dbpg-60bvvS1dI8pQgvoiRWYIz5BVuQS7oi3SRiYF2ba6V3jRkBfunkzdQ3mk89qoYc46wtf4OwbBJw5lM7JQc8IiMm41j6O_Ms4IgeVbankS5s7qZyaxfsF4jR65aSfqmvpRcx43gSyY3sFsIt8by-ivfMoR4O4X62izBjntZ9faYjFeSyqyZevYScsycQifcQ3o96iZ7-xe14jk3Rgqxi6j1F3pIOMR8dd-eB1mIaOI6Ucjo"
      const apiUrl = 'https://speech.googleapis.com/v1/speech:recognize';

      const audioData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const requestPayload = {
        config: {
          encoding: 'MP3',
          sampleRateHertz: 48000,
          languageCode: 'en-IN'
        },
        audio: {
          content: audioData,
        },
      };

      const response = await axios.post(apiUrl, requestPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTranscription(response.data.results[0].alternatives[0].transcript);
      console.log(response.data.results);
      deleteAudioFile();
    } catch (error) {
      deleteAudioFile();
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(`API error: ${error.response.data.error.message}`);
      } else if (error.request) {
        console.error('Error request:', error.request);
        throw new Error('Network error');
      } else {
        console.error('Error message:', error.message);
        throw new Error('An unexpected error occurred');
      }
    }
  };

  // useEffect(()=>{
  //   return recording ? 
  //     recording.stopAndUnloadAsync() : undefined
  // },[]);


  return (
    <View style={styles.container}>
      <Pressable
        style={[ styles.button, isRecording && { width:90, height: 90, backgroundColor:"red" } ]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
      >
        <Text style={{ fontSize: 20 }}>{isRecording ? "stop" : "start"}</Text>
      </Pressable>
      <Text style={{ marginTop: 20 }}>Transcription</Text>
      <Text style={{ fontSize: 20 }}>{transcription}</Text>      
      <Text style={{ fontSize: 20,marginTop:10 }}>{transliteratedText}</Text>      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100 + "%",
    height: 100 + "%",
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: "relative"
  },
  button: {
    position: "absolute",
    bottom: 0,
    borderColor: "black", 
    borderWidth: 1, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    marginBottom: 100, 
    width: 80, 
    height: 80, 
    borderRadius: 50, 
    justifyContent: "center", 
    alignItems: "center",
  }
});
