import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';

const API_URL = '/api/reminders';

export const fetchReminders = createAsyncThunk('reminders/fetchReminders', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get(API_URL);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to fetch reminders'));
  }
});

export const addReminder = createAsyncThunk('reminders/addReminder', async (reminderData, { rejectWithValue }) => {
  try {
    const response = await api.post(API_URL, reminderData);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to add reminder'));
  }
});

export const completeReminder = createAsyncThunk('reminders/completeReminder', async (id, { rejectWithValue }) => {
  try {
    const response = await api.put(`${API_URL}/${id}/complete`);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to complete reminder'));
  }
});

export const deleteReminder = createAsyncThunk('reminders/deleteReminder', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`${API_URL}/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to delete reminder'));
  }
});

const reminderSlice = createSlice({
  name: 'reminders',
  initialState: {
    list: [],
    activeAlerts: [],
    loading: false,
    error: null
  },
  reducers: {
    addAlert: (state, action) => {
      // Avoid duplicate alerts
      if (!state.activeAlerts.some(a => a.id === action.payload.id)) {
        state.activeAlerts.push(action.payload);
      }
    },
    dismissAlert: (state, action) => {
      state.activeAlerts = state.activeAlerts.filter(a => a.id !== action.payload);
    },
    addReminderLocally: (state, action) => {
      const exists = state.list.some(r => r.id === action.payload.id);
      if (!exists) {
        state.list.push(action.payload);
        state.list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      }
    },
    updateReminderLocally: (state, action) => {
      const index = state.list.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Reminders
      .addCase(fetchReminders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Reminder
      .addCase(addReminder.fulfilled, (state, action) => {
        state.list.push(action.payload);
        state.list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      })
      // Complete Reminder
      .addCase(completeReminder.fulfilled, (state, action) => {
        const index = state.list.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      // Delete Reminder
      .addCase(deleteReminder.fulfilled, (state, action) => {
        state.list = state.list.filter(r => r.id !== action.payload);
      });
  }
});

export const { addAlert, dismissAlert, addReminderLocally, updateReminderLocally } = reminderSlice.actions;

export default reminderSlice.reducer;
