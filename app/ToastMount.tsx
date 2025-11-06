'use client';

import { ToastContainer } from 'react-toastify';

export default function ToastMount() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={2500}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      pauseOnHover
      draggable
      theme="light"
    />
  );
}
