import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CourseCatalogScreen from '../screens/CourseCatalogScreen';
import CoursePlayerScreen from '../screens/student/CoursePlayerScreen';
import StudentDashboardScreen from '../screens/student/DashboardScreen';
import InstructorDashboardScreen from '../screens/instructor/DashboardScreen';
import AdminVideoManagerScreen from '../screens/admin/VideoManagerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function RoleAwareTabs() {
  const role = useSelector((state) => state.auth.user?.role);

  return (
    <Tab.Navigator>
      <Tab.Screen name="Courses" component={CourseCatalogScreen} />
      {role === 'student' && <Tab.Screen name="My Learning" component={StudentDashboardScreen} />}
      {role === 'instructor' && <Tab.Screen name="Instructor Studio" component={InstructorDashboardScreen} />}
      {role === 'admin' && <Tab.Screen name="Video Management" component={AdminVideoManagerScreen} />}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const isAuthenticated = useSelector((state) => !!state.auth.user);

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={RoleAwareTabs} />
          <Stack.Screen name="CoursePlayer" component={CoursePlayerScreen} options={{ headerShown: true }} />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
