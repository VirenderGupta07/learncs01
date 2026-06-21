import { View, Text } from 'react-native';

/**
 * Mobile counterpart to frontend/src/pages/admin/VideoManager.jsx. Same
 * admin-only, permission-gated endpoints (/admin/courses/:id/lectures/:id/video/*).
 * S3 uploads from mobile use expo-document-picker / expo-image-picker to
 * select a video file, then PUT it to the presigned URL exactly as the web
 * client does with fetch().
 */
export default function AdminVideoManagerScreen() {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Video Management</Text>
    </View>
  );
}
