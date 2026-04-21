import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// Create a test connection
const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'test'
}).catch(() => null);

if (connection) {
  console.log('Connected to test DB');
  connection.end();
} else {
  console.log('Cannot connect to test DB');
}

// Check what insert returns
console.log('Checking Drizzle insert return type...');
const db = drizzle(mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'test'
}));

// Log the insert method signature
console.log(typeof db.insert);
