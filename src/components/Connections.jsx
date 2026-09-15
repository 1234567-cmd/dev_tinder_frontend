import React from 'react'
import axios from 'axios';
import { BASE_URL } from '../utils/constants';
import {useEffect} from 'react';


export const Connections = () => {
  const [connections, setConnections] = React.useState([])

  const getConnections = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/user/connections`, { withCredentials: true });
      console.log('Connections fetched:', res.data.connections);
      setConnections(res.data.connections);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  }

  React.useEffect(() => {
    getConnections();
  }, []);

  if (connections.length === 0) {
    return (
      <div className="flex justify-center my-10">
        <h1 className="text-2xl font-bold">No connections yet</h1>
      </div>
    )
  }
  return (
    <div className="flex justify-center my-10">
      <h1 className="text-2xl font-bold">Connections</h1>
    </div>
  )
}
