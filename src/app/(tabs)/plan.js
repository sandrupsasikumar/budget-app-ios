import React from 'react';
import Plan from '../../screens/Plan';
import { useData } from '../../state';

export default function PlanScreen() {
  const { data, update } = useData();
  return <Plan data={data} update={update} />;
}
