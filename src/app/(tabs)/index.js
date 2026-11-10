import React from 'react';
import Dashboard from '../../screens/Dashboard';
import { useData } from '../../state';

export default function HomeScreen() {
  const { data, period, setPeriod, update, account } = useData();
  return <Dashboard data={data} period={period} setPeriod={setPeriod} update={update} synced={!!account.user} />;
}
