import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/axiosClient';
import endpoints from '../../api/endpoints';

export const fetchCart = createAsyncThunk('cart/fetch', async () => {
  const { data } = await axiosClient.get(endpoints.cart.base);
  return data.data.cart;
});

export const addToCart = createAsyncThunk('cart/addItem', async (courseId) => {
  const { data } = await axiosClient.post(endpoints.cart.items, { courseId });
  return data.data.cart;
});

export const removeFromCart = createAsyncThunk('cart/removeItem', async (courseId) => {
  const { data } = await axiosClient.delete(endpoints.cart.removeItem(courseId));
  return data.data.cart;
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
      });
  },
});

export default cartSlice.reducer;
