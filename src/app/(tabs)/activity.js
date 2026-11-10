import React from 'react';
import { router } from 'expo-router';
import Activity from '../../screens/Activity';
import { useData } from '../../state';

export default function ActivityScreen() {
  const { data, period, setPeriod, activityCategory, setActivityCategory } = useData();
  return (
    <Activity data={data} period={period} setPeriod={setPeriod} onEdit={(t) => router.push(`/edit/${t.id}`)}
      category={activityCategory} setCategory={setActivityCategory} />
  );
}
