import React from 'react';
import { router } from 'expo-router';
import Dashboard from '../../screens/Dashboard';
import { useData } from '../../state';

export default function HomeScreen() {
  const { data, period, setPeriod, update, account, setActivityCategory, startDraft } = useData();
  const openCategory = (category) => { setActivityCategory(category); router.navigate('/activity'); };
  const logBill = (b) => { startDraft({ store: b.name, amount: b.cost, category: b.category }); router.navigate('/add'); };
  return (
    <Dashboard data={data} period={period} setPeriod={setPeriod} update={update} synced={!!account.user}
      onOpenCategory={openCategory} onLogBill={logBill} />
  );
}
