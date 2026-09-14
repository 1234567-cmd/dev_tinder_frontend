import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'
import { feedSlice } from './feedSlice'
import toastReducer from './toastSlice'


export const appStore = configureStore({
  reducer: {
    user: userReducer,
    feed: feedSlice.reducer,
    toast: toastReducer,
  },
})