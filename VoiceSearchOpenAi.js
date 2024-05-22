import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';


const recordingOptions = {
  // android not currently in use. Not getting results from speech to text with .m4a
  // but parameters are required
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 16000,
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


const VoiceSearchOpenAi = () => {
  const [recording, setRecording] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [RecordPermission, setRecordPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('')

  const getRecordPermission = async () => {
    const permission = await Audio.requestPermissionsAsync();
    // console.log("Recording Permission===>",permission);
    setRecordPermission(permission.granted);
    console.log(RecordPermission)
  }

  useEffect(() => {
    getRecordPermission();
  }, [])

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
      console.log("error while recording audio", error);
      stopRecording()
    }


    setRecording(recording)

  }

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI()
      sendAudioToWhisper(uri)
    } catch (error) {
      console.log("error while stop recording", error)
    }
  }


  const sendAudioToWhisper = async (uri) => {
    try {
      const api_key = "sk-test-service-OUGDPni2hXompjOYZzxTT3BlbkFJwJZw9n6EtSuzM7DLIfDd"

      const fileInfo = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });



      const fileName = uri.split("/").pop();
      console.log(fileName,uri)

      const sentFile = `${FileSystem.documentDirectory}${fileName}`


    const formData = new FormData();
    formData.append('file', {
      uri: sentFile,
      type: 'audio/mpeg',
      name: "audioFile.m4a",
    });

      
      formData.append('model', 'whisper-1');

      // console.log(formData)

      // const response = await axios.post(
      //   'https://api.openai.com/v1/audio/transcriptions',
      //   formData,
      //   {
      //     headers: {
      //       "Authorization": `Bearer ${api_key}`,
      //       "Content-Type": "multipart/form-data",
      //     },
      //   }
      // );

      const response = await FileSystem.uploadAsync(
        'https://api.openai.com/v1/audio/transcriptions',
        uri,
        {
          // Optional: Additional HTTP headers to send with the request.
          headers: {
            Authorization: `Bearer ${api_key}`,
            // any other headers your endpoint requires
          },
  
          // Options specifying how to upload the file.
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file', // Name of the field for the uploaded file
          mimeType: 'audio/mpeg', // MIME type of the uploading file
          parameters: {
            // Optional: Any additional parameters you want to send with the file upload
            model: 'whisper-1', // For example, if you're using OpenAI's model parameter
          },
        }
      );


      // setTranscription(response.data.transcription);
      console.log(response);
      deleteAudioFile()
    } catch (error) {
      deleteAudioFile()
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




  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isRecording && { width: 90, height: 90, backgroundColor: "red" }]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
      >
        <Text style={{ fontSize: 20 }}>{isRecording ? "stop" : "start"}</Text>
      </Pressable>
      <Text style={{ marginTop: 20 }}>Transcription</Text>
      <Text style={{ fontSize: 20 }}>{transcription}</Text>
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

export default VoiceSearchOpenAi;
