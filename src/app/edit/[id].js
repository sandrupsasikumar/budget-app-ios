import React, { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import AddEdit from '../../screens/AddEdit';
import { useData } from '../../state';

export default function EditScreen() {
  const { id } = useLocalSearchParams();
  const { data, saveTx, delTx } = useData();
  const existing = data.transactions.find((t) => t.id === id);
  const left = useRef(false);
  const done = () => {
    if (left.current) return; // Delete and the check below can both ask to leave.
    left.current = true;
    if (router.canGoBack()) router.back(); else router.replace('/activity');
  };

  // The transaction can disappear underneath us (deleted here or synced from the cloud).
  useEffect(() => { if (!existing) done(); }, [existing]);
  if (!existing) return null;

  return <AddEdit key={existing.id} data={data} existing={existing} onSave={saveTx} onDelete={delTx} onDone={done} />;
}
