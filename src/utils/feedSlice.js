
import { createSlice } from "@reduxjs/toolkit";

export const feedSlice = createSlice({
    name: "feed",
    initialState: {
        feed: [],
    },
    reducers: {
        setFeed: (state, action) => {
            state.feed = action.payload;
        },
        clearFeed: (state) => {
            state.feed = [];
        },
    },
});

export const { setFeed, clearFeed } = feedSlice.actions;