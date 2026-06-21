import { View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * YouTube lectures embed cleanly via WebView pointed at the standard embed
 * URL. S3-hosted lectures should instead use a native video component
 * (e.g. expo-av's <Video>) fed the same signed playback URL the web app
 * fetches from GET /courses/lectures/:lectureId/playback-url.
 */
export default function CoursePlayerScreen({ route }) {
  const { youtubeVideoId } = route.params || {};

  if (youtubeVideoId) {
    return (
      <View style={{ flex: 1 }}>
        <WebView source={{ uri: `https://www.youtube.com/embed/${youtubeVideoId}` }} allowsFullscreenVideo />
      </View>
    );
  }

  return <View style={{ flex: 1 }} />;
}
