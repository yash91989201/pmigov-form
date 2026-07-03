import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FillForm } from './components/FillForm';
import { AdminPanel } from './components/AdminPanel';
import { ViewForm } from './components/ViewForm';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FillForm />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/view/:id" element={<ViewForm />} />
      </Routes>
    </BrowserRouter>
  );
}
