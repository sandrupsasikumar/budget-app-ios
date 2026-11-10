import React from 'react';
import AddEdit from '../../screens/AddEdit';
import { useData } from '../../state';

export default function AddScreen() {
  const { data, saveTx } = useData();
  return <AddEdit data={data} onSave={saveTx} />;
}
