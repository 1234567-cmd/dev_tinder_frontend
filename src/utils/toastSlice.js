import { createSlice, nanoid } from '@reduxjs/toolkit'

export const toastSlice = createSlice({
    name: 'toast',
    initialState: {
        toasts: [],
    },
    reducers: {
        addToast: (state, action) => {
            state.toasts.push(action.payload);
        },
        removeToast: (state, action) => {
            state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
        },
    },
});

export const { addToast, removeToast } = toastSlice.actions;

// Shows a toast and hides it after `duration` ms.
// Usage: dispatch(showToast('Saved!')) or dispatch(showToast('Failed', 'error'))
export const showToast = (message, type = 'success', duration = 3000) => (dispatch) => {
    const id = nanoid();
    dispatch(addToast({ id, message, type }));
    setTimeout(() => dispatch(removeToast(id)), duration);
};

export default toastSlice.reducer;
