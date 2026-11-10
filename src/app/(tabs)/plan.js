import React from 'react';
import { router } from 'expo-router';
import Plan from '../../screens/Plan';
import { useData } from '../../state';

export default function PlanScreen() {
  const { data, update, startDraft } = useData();
  const log = (x) => { startDraft({ store: x.name, amount: x.cost, category: x.category }); router.navigate('/add'); };
  return <Plan data={data} update={update} onLog={log} />;
}
