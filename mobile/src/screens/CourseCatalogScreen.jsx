import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import axiosClient from '../api/axiosClient';

export default function CourseCatalogScreen({ navigation }) {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    axiosClient.get('/courses').then(({ data }) => setCourses(data.data.courses));
  }, []);

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={courses}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('CoursePlayer', { slug: item.slug })}
          style={{ padding: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}
        >
          <Text style={{ fontWeight: '600' }}>{item.title}</Text>
          <Text style={{ color: '#6b7280' }}>{item.category}</Text>
        </Pressable>
      )}
    />
  );
}
