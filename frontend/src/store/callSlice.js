import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = '/api/calls';

export const fetchCallLogs = createAsyncThunk('calls/fetchCallLogs', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch call logs');
  }
});

export const fetchCallReports = createAsyncThunk('calls/fetchCallReports', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/reports`);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to fetch call reports');
  }
});

export const saveCallLog = createAsyncThunk('calls/saveCallLog', async (callData, { rejectWithValue }) => {
  try {
    const response = await axios.post(API_URL, callData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to save call log');
  }
});

export const updateCallLogNotes = createAsyncThunk('calls/updateCallLogNotes', async ({ id, notes }, { rejectWithValue }) => {
  try {
    const response = await axios.put(`${API_URL}/${id}/notes`, { notes });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to update call notes');
  }
});

export const deleteCallLog = createAsyncThunk('calls/deleteCallLog', async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${API_URL}/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error || 'Failed to delete call log');
  }
});

const initialState = {
  logs: [],
  reports: {
    summary: { totalCalls: 0, completedCalls: 0, missedCalls: 0, avgDuration: 0, totalDuration: 0 },
    volumeTrend: [],
    statusSegments: [],
    directionSegments: []
  },
  activeCall: null, // null, or active call object
  callStatus: 'IDLE', // IDLE, RINGING, CONNECTED, INCOMING
  loading: false,
  error: null
};

const callSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    startOutboundCall: (state, action) => {
      // action.payload: { id, name, phone } (Contact)
      state.callStatus = 'RINGING';
      state.activeCall = {
        id: `out-${Date.now()}`,
        contactId: action.payload.id || null,
        contactName: action.payload.name,
        contactPhone: action.payload.phone,
        direction: 'OUTBOUND',
        status: 'COMPLETED', // default to completed if they answer
        duration: 0,
        notes: '',
        isMuted: false,
        isHeld: false,
        // Recording is mandatory for every call. Agents cannot disable it.
        isRecording: true,
        recordingBlob: null
      };
    },
    receiveInboundCall: (state, action) => {
      // action.payload: { id, contactId, contactName, contactPhone }
      state.callStatus = 'INCOMING';
      state.activeCall = {
        id: action.payload.id,
        contactId: action.payload.contactId || null,
        contactName: action.payload.contactName,
        contactPhone: action.payload.contactPhone,
        direction: 'INBOUND',
        status: 'COMPLETED',
        duration: 0,
        notes: '',
        isMuted: false,
        isHeld: false,
        isRecording: true,
        recordingBlob: null
      };
    },
    answerCall: (state) => {
      if (state.callStatus === 'INCOMING') {
        state.callStatus = 'CONNECTED';
      }
    },
    connectCall: (state) => {
      if (state.callStatus === 'RINGING') {
        state.callStatus = 'CONNECTED';
      }
    },
    incrementCallDuration: (state) => {
      if (state.activeCall && state.callStatus === 'CONNECTED' && !state.activeCall.isHeld) {
        state.activeCall.duration += 1;
      }
    },
    toggleMute: (state) => {
      if (state.activeCall) {
        state.activeCall.isMuted = !state.activeCall.isMuted;
      }
    },
    toggleHold: (state) => {
      if (state.activeCall) {
        state.activeCall.isHeld = !state.activeCall.isHeld;
      }
    },
    toggleRecording: (state) => {
      if (state.activeCall) {
        state.activeCall.isRecording = !state.activeCall.isRecording;
      }
    },
    updateLiveNotes: (state, action) => {
      if (state.activeCall) {
        state.activeCall.notes = action.payload;
      }
    },
    setRecordingBlob: (state, action) => {
      if (state.activeCall) {
        state.activeCall.recordingBlob = action.payload; // Base64 or Blob reference
      }
    },
    declineInboundCall: (state) => {
      state.callStatus = 'IDLE';
      state.activeCall = null;
    },
    endActiveCall: (state) => {
      state.callStatus = 'IDLE';
      state.activeCall = null;
    },
    addCallLogLocally: (state, action) => {
      const exists = state.logs.some(l => l.id === action.payload.id);
      if (!exists) {
        state.logs.unshift(action.payload);
      }
    },
    updateCallLogLocally: (state, action) => {
      const index = state.logs.findIndex(l => l.id === action.payload.id);
      if (index !== -1) {
        state.logs[index] = action.payload;
      }
    },
    updateReportsLocally: (state, action) => {
      state.reports = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Logs
      .addCase(fetchCallLogs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCallLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchCallLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Reports
      .addCase(fetchCallReports.fulfilled, (state, action) => {
        state.reports = action.payload;
      })
      // Save Call Log
      .addCase(saveCallLog.fulfilled, (state, action) => {
        const exists = state.logs.some(l => l.id === action.payload.id);
        if (!exists) {
          state.logs.unshift(action.payload);
        }
      })
      // Update Call Notes
      .addCase(updateCallLogNotes.fulfilled, (state, action) => {
        const index = state.logs.findIndex(l => l.id === action.payload.id);
        if (index !== -1) {
          state.logs[index] = action.payload;
        }
      })
      // Delete Call Log
      .addCase(deleteCallLog.fulfilled, (state, action) => {
        state.logs = state.logs.filter(l => l.id !== action.payload);
      });
  }
});

export const {
  startOutboundCall,
  receiveInboundCall,
  answerCall,
  connectCall,
  incrementCallDuration,
  toggleMute,
  toggleHold,
  toggleRecording,
  updateLiveNotes,
  setRecordingBlob,
  declineInboundCall,
  endActiveCall,
  addCallLogLocally,
  updateCallLogLocally,
  updateReportsLocally
} = callSlice.actions;

export default callSlice.reducer;
