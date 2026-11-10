import React from 'react';
import Budget from '../../screens/Budget';
import { useData } from '../../state';

export default function BudgetScreen() {
  const { data, update, setData, reminderCount, account } = useData();
  return <Budget data={data} update={update} replaceAll={setData} reminderCount={reminderCount} account={account} />;
}
