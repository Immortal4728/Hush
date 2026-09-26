import React from 'react';
import Demo from '../components/ui/demo';
import { Header } from '../components/Header';

export const TigerDemoPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen">
      <Header />
      <Demo />
    </div>
  );
};
