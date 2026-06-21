import { View, Text } from 'react-native';

export default function StudentDashboardScreen() {
  // Mirrors frontend/src/pages/student/Dashboard.jsx: GET /auth/me, list
  // user.purchasedCourses, link into CoursePlayerScreen per course.
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>My Courses</Text>
    </View>
  );
}
