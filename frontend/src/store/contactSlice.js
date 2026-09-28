import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { getErrorMessage } from '../utils/errorMessage';

const API_URL = '/api/contacts';

export const fetchContacts = createAsyncThunk('contacts/fetchContacts', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to fetch contacts'));
  }
});

export const addContact = createAsyncThunk('contacts/addContact', async (contactData, { rejectWithValue }) => {
  try {
    const response = await axios.post(API_URL, contactData);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to add contact'));
  }
});

export const bulkImportContacts = createAsyncThunk('contacts/bulkImport', async (contacts, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/bulk`, { contacts });
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to import contacts'));
  }
});

export const updateContact = createAsyncThunk('contacts/updateContact', async ({ id, contactData }, { rejectWithValue }) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, contactData);
    return response.data;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update contact'));
  }
});

export const deleteContact = createAsyncThunk('contacts/deleteContact', async (id, { rejectWithValue }) => {
  try {
    await axios.delete(`${API_URL}/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to delete contact'));
  }
});

const contactSlice = createSlice({
  name: 'contacts',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Contacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add Contact
      .addCase(addContact.fulfilled, (state, action) => {
        state.list.push(action.payload);
        state.list.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(bulkImportContacts.fulfilled, (state, action) => {
        state.list.push(...action.payload.imported);
        state.list.sort((a, b) => a.name.localeCompare(b.name));
      })
      // Update Contact
      .addCase(updateContact.fulfilled, (state, action) => {
        const index = state.list.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      // Delete Contact
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.list = state.list.filter(c => c.id !== action.payload);
      });
  },
});

export default contactSlice.reducer;
