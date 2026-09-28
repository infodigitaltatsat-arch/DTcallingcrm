import { configureStore } from '@reduxjs/toolkit';
import contactReducer from './contactSlice';
import callReducer from './callSlice';
import reminderReducer from './reminderSlice';

import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactReducer,
    calls: callReducer,
    reminders: reminderReducer,
  },
});
