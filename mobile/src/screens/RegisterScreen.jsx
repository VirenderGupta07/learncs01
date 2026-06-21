import { View, Text } from 'react-native';

export default function RegisterScreen() {
  // Mirrors LoginScreen.jsx, posting to /auth/register and persisting the
  // returned token the same way (see store/authSlice.js).
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Create account</Text>
    </View>
  );
}
