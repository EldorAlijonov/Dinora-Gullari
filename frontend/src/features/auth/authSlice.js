import { createSlice } from '@reduxjs/toolkit';

localStorage.removeItem('token');
const user = localStorage.getItem('user');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: user ? JSON.parse(user) : null,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      localStorage.removeItem('user');
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
