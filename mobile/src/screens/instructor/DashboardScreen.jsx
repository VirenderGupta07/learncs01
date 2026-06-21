import { View, Text } from 'react-native';

export default function InstructorDashboardScreen() {
  // Mirrors frontend/src/pages/instructor/Dashboard.jsx: GET /courses?mine=true.
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>My Courses</Text>
    </View>
  );
}
