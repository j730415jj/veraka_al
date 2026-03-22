import React from 'react';
import { Operation, Client, Vehicle } from '../types';

interface Props {
  title?: string;
  type?: string;
  operations: Operation[];
  clients: Client[];
  vehicles: Vehicle[];
  userRole: string;
  userIdentifier: string;
}

const StatementView: React.FC<Props> = ({ operations, clients, vehicles, userRole, userIdentifier }) => {
  return (
    <div className="flex flex-col h-full p-6">
      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-4">세금 계산서</h2>
      <div className="bg-white rounded-xl p-4 text-sm text-slate-500">
        준비 중입니다.
      </div>
    </div>
  );
};

export default StatementView;