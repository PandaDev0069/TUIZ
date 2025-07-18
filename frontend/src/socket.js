import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
    transports: ['websocket'],
}); // Adjust the URL as needed

export default socket;