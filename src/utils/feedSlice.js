
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
        removeUserFromFeed: (state, action) => {
            state.feed = state.feed.filter((user) => user._id !== action.payload);
        },
    },
});

export const { setFeed, clearFeed, removeUserFromFeed } = feedSlice.actions;