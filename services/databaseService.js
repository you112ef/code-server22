const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class DatabaseService {
  constructor() {
    this.connections = new Map();
    this.initializeConnections();
  }

  async initializeConnections() {
    // MongoDB connection
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully');
      } catch (error) {
        console.error('MongoDB connection error:', error);
      }
    }

    // PostgreSQL connection
    if (process.env.POSTGRES_URL) {
      try {
        this.pgPool = new Pool({
          connectionString: process.env.POSTGRES_URL
        });
        console.log('PostgreSQL pool created');
      } catch (error) {
        console.error('PostgreSQL connection error:', error);
      }
    }

    // MySQL connection
    if (process.env.MYSQL_URL) {
      try {
        this.mysqlPool = mysql.createPool({
          uri: process.env.MYSQL_URL
        });
        console.log('MySQL pool created');
      } catch (error) {
        console.error('MySQL connection error:', error);
      }
    }
  }

  async query(database, query, parameters = []) {
    try {
      const dbType = this.getDatabaseType(database);
      
      switch (dbType) {
        case 'mongodb':
          return await this.mongoQuery(database, query, parameters);
        case 'postgresql':
          return await this.postgresQuery(database, query, parameters);
        case 'mysql':
          return await this.mysqlQuery(database, query, parameters);
        case 'sqlite':
          return await this.sqliteQuery(database, query, parameters);
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        query,
        parameters
      };
    }
  }

  async insert(database, table, data) {
    try {
      const dbType = this.getDatabaseType(database);
      
      switch (dbType) {
        case 'mongodb':
          return await this.mongoInsert(database, table, data);
        case 'postgresql':
          return await this.postgresInsert(database, table, data);
        case 'mysql':
          return await this.mysqlInsert(database, table, data);
        case 'sqlite':
          return await this.sqliteInsert(database, table, data);
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        table,
        data
      };
    }
  }

  async update(database, table, data, where) {
    try {
      const dbType = this.getDatabaseType(database);
      
      switch (dbType) {
        case 'mongodb':
          return await this.mongoUpdate(database, table, data, where);
        case 'postgresql':
          return await this.postgresUpdate(database, table, data, where);
        case 'mysql':
          return await this.mysqlUpdate(database, table, data, where);
        case 'sqlite':
          return await this.sqliteUpdate(database, table, data, where);
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        table,
        data,
        where
      };
    }
  }

  async delete(database, table, where) {
    try {
      const dbType = this.getDatabaseType(database);
      
      switch (dbType) {
        case 'mongodb':
          return await this.mongoDelete(database, table, where);
        case 'postgresql':
          return await this.postgresDelete(database, table, where);
        case 'mysql':
          return await this.mysqlDelete(database, table, where);
        case 'sqlite':
          return await this.sqliteDelete(database, table, where);
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        table,
        where
      };
    }
  }

  async createTable(database, tableName, schema) {
    try {
      const dbType = this.getDatabaseType(database);
      
      switch (dbType) {
        case 'mongodb':
          return await this.mongoCreateCollection(database, tableName, schema);
        case 'postgresql':
          return await this.postgresCreateTable(database, tableName, schema);
        case 'mysql':
          return await this.mysqlCreateTable(database, tableName, schema);
        case 'sqlite':
          return await this.sqliteCreateTable(database, tableName, schema);
        default:
          throw new Error(`Unsupported database type: ${dbType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        tableName,
        schema
      };
    }
  }

  // MongoDB operations
  async mongoQuery(database, query, parameters) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      
      const db = client.db(database);
      const collection = db.collection(query.collection);
      
      let result;
      if (query.operation === 'find') {
        result = await collection.find(query.filter || {}).toArray();
      } else if (query.operation === 'findOne') {
        result = await collection.findOne(query.filter || {});
      } else if (query.operation === 'aggregate') {
        result = await collection.aggregate(query.pipeline || []).toArray();
      } else if (query.operation === 'count') {
        result = await collection.countDocuments(query.filter || {});
      }
      
      await client.close();
      
      return {
        success: true,
        data: result,
        count: Array.isArray(result) ? result.length : 1
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async mongoInsert(database, collection, data) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      
      const db = client.db(database);
      const coll = db.collection(collection);
      
      const result = await coll.insertMany(Array.isArray(data) ? data : [data]);
      
      await client.close();
      
      return {
        success: true,
        insertedCount: result.insertedCount,
        insertedIds: result.insertedIds
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        insertedCount: 0
      };
    }
  }

  async mongoUpdate(database, collection, data, where) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      
      const db = client.db(database);
      const coll = db.collection(collection);
      
      const result = await coll.updateMany(where, { $set: data });
      
      await client.close();
      
      return {
        success: true,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        modifiedCount: 0
      };
    }
  }

  async mongoDelete(database, collection, where) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      
      const db = client.db(database);
      const coll = db.collection(collection);
      
      const result = await coll.deleteMany(where);
      
      await client.close();
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        deletedCount: 0
      };
    }
  }

  async mongoCreateCollection(database, collectionName, schema) {
    try {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      
      const db = client.db(database);
      await db.createCollection(collectionName);
      
      // Create indexes if specified
      if (schema.indexes) {
        const coll = db.collection(collectionName);
        for (const index of schema.indexes) {
          await coll.createIndex(index.fields, index.options || {});
        }
      }
      
      await client.close();
      
      return {
        success: true,
        collection: collectionName,
        created: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        collection: collectionName
      };
    }
  }

  // PostgreSQL operations
  async postgresQuery(database, query, parameters) {
    try {
      const client = await this.pgPool.connect();
      
      const result = await client.query(query, parameters);
      
      client.release();
      
      return {
        success: true,
        data: result.rows,
        count: result.rowCount,
        fields: result.fields
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async postgresInsert(database, table, data) {
    try {
      const client = await this.pgPool.connect();
      
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      
      const result = await client.query(query, values);
      
      client.release();
      
      return {
        success: true,
        data: result.rows[0],
        insertedCount: result.rowCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        insertedCount: 0
      };
    }
  }

  async postgresUpdate(database, table, data, where) {
    try {
      const client = await this.pgPool.connect();
      
      const setClause = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const whereClause = Object.keys(where).map((key, index) => `${key} = $${Object.keys(data).length + index + 1}`).join(' AND ');
      
      const values = [...Object.values(data), ...Object.values(where)];
      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
      
      const result = await client.query(query, values);
      
      client.release();
      
      return {
        success: true,
        data: result.rows,
        modifiedCount: result.rowCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        modifiedCount: 0
      };
    }
  }

  async postgresDelete(database, table, where) {
    try {
      const client = await this.pgPool.connect();
      
      const whereClause = Object.keys(where).map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      const values = Object.values(where);
      
      const query = `DELETE FROM ${table} WHERE ${whereClause}`;
      
      const result = await client.query(query, values);
      
      client.release();
      
      return {
        success: true,
        deletedCount: result.rowCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        deletedCount: 0
      };
    }
  }

  async postgresCreateTable(database, tableName, schema) {
    try {
      const client = await this.pgPool.connect();
      
      const columns = schema.columns.map(col => {
        let columnDef = `${col.name} ${col.type}`;
        if (col.primaryKey) columnDef += ' PRIMARY KEY';
        if (col.notNull) columnDef += ' NOT NULL';
        if (col.unique) columnDef += ' UNIQUE';
        if (col.default) columnDef += ` DEFAULT ${col.default}`;
        return columnDef;
      }).join(', ');
      
      const query = `CREATE TABLE ${tableName} (${columns})`;
      
      await client.query(query);
      
      // Create indexes if specified
      if (schema.indexes) {
        for (const index of schema.indexes) {
          const indexQuery = `CREATE INDEX ${index.name} ON ${tableName} (${index.columns.join(', ')})`;
          await client.query(indexQuery);
        }
      }
      
      client.release();
      
      return {
        success: true,
        table: tableName,
        created: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        table: tableName
      };
    }
  }

  // MySQL operations
  async mysqlQuery(database, query, parameters) {
    try {
      const connection = await this.mysqlPool.getConnection();
      
      const [rows] = await connection.execute(query, parameters);
      
      connection.release();
      
      return {
        success: true,
        data: rows,
        count: Array.isArray(rows) ? rows.length : 1
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async mysqlInsert(database, table, data) {
    try {
      const connection = await this.mysqlPool.getConnection();
      
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');
      
      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      const [result] = await connection.execute(query, values);
      
      connection.release();
      
      return {
        success: true,
        insertId: result.insertId,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        insertId: null
      };
    }
  }

  async mysqlUpdate(database, table, data, where) {
    try {
      const connection = await this.mysqlPool.getConnection();
      
      const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
      
      const values = [...Object.values(data), ...Object.values(where)];
      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      
      const [result] = await connection.execute(query, values);
      
      connection.release();
      
      return {
        success: true,
        affectedRows: result.affectedRows,
        changedRows: result.changedRows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        affectedRows: 0
      };
    }
  }

  async mysqlDelete(database, table, where) {
    try {
      const connection = await this.mysqlPool.getConnection();
      
      const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(where);
      
      const query = `DELETE FROM ${table} WHERE ${whereClause}`;
      
      const [result] = await connection.execute(query, values);
      
      connection.release();
      
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        affectedRows: 0
      };
    }
  }

  async mysqlCreateTable(database, tableName, schema) {
    try {
      const connection = await this.mysqlPool.getConnection();
      
      const columns = schema.columns.map(col => {
        let columnDef = `${col.name} ${col.type}`;
        if (col.primaryKey) columnDef += ' PRIMARY KEY';
        if (col.notNull) columnDef += ' NOT NULL';
        if (col.unique) columnDef += ' UNIQUE';
        if (col.default) columnDef += ` DEFAULT ${col.default}`;
        if (col.autoIncrement) columnDef += ' AUTO_INCREMENT';
        return columnDef;
      }).join(', ');
      
      const query = `CREATE TABLE ${tableName} (${columns})`;
      
      await connection.execute(query);
      
      // Create indexes if specified
      if (schema.indexes) {
        for (const index of schema.indexes) {
          const indexQuery = `CREATE INDEX ${index.name} ON ${tableName} (${index.columns.join(', ')})`;
          await connection.execute(indexQuery);
        }
      }
      
      connection.release();
      
      return {
        success: true,
        table: tableName,
        created: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        table: tableName
      };
    }
  }

  // SQLite operations
  async sqliteQuery(database, query, parameters) {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(database);
      
      db.all(query, parameters, (err, rows) => {
        db.close();
        
        if (err) {
          resolve({
            success: false,
            error: err.message,
            data: null
          });
        } else {
          resolve({
            success: true,
            data: rows,
            count: rows.length
          });
        }
      });
    });
  }

  async sqliteInsert(database, table, data) {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(database);
      
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');
      
      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      db.run(query, values, function(err) {
        db.close();
        
        if (err) {
          resolve({
            success: false,
            error: err.message,
            insertId: null
          });
        } else {
          resolve({
            success: true,
            insertId: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  async sqliteUpdate(database, table, data, where) {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(database);
      
      const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
      
      const values = [...Object.values(data), ...Object.values(where)];
      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      
      db.run(query, values, function(err) {
        db.close();
        
        if (err) {
          resolve({
            success: false,
            error: err.message,
            changes: 0
          });
        } else {
          resolve({
            success: true,
            changes: this.changes
          });
        }
      });
    });
  }

  async sqliteDelete(database, table, where) {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(database);
      
      const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(where);
      
      const query = `DELETE FROM ${table} WHERE ${whereClause}`;
      
      db.run(query, values, function(err) {
        db.close();
        
        if (err) {
          resolve({
            success: false,
            error: err.message,
            changes: 0
          });
        } else {
          resolve({
            success: true,
            changes: this.changes
          });
        }
      });
    });
  }

  async sqliteCreateTable(database, tableName, schema) {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(database);
      
      const columns = schema.columns.map(col => {
        let columnDef = `${col.name} ${col.type}`;
        if (col.primaryKey) columnDef += ' PRIMARY KEY';
        if (col.notNull) columnDef += ' NOT NULL';
        if (col.unique) columnDef += ' UNIQUE';
        if (col.default) columnDef += ` DEFAULT ${col.default}`;
        return columnDef;
      }).join(', ');
      
      const query = `CREATE TABLE ${tableName} (${columns})`;
      
      db.run(query, (err) => {
        if (err) {
          db.close();
          resolve({
            success: false,
            error: err.message,
            table: tableName
          });
        } else {
          // Create indexes if specified
          if (schema.indexes) {
            let indexCount = 0;
            const createIndex = (index) => {
              const indexQuery = `CREATE INDEX ${index.name} ON ${tableName} (${index.columns.join(', ')})`;
              db.run(indexQuery, (err) => {
                if (err) {
                  db.close();
                  resolve({
                    success: false,
                    error: err.message,
                    table: tableName
                  });
                } else {
                  indexCount++;
                  if (indexCount === schema.indexes.length) {
                    db.close();
                    resolve({
                      success: true,
                      table: tableName,
                      created: new Date()
                    });
                  }
                }
              });
            };
            
            schema.indexes.forEach(createIndex);
          } else {
            db.close();
            resolve({
              success: true,
              table: tableName,
              created: new Date()
            });
          }
        }
      });
    });
  }

  getDatabaseType(database) {
    if (typeof database === 'string') {
      if (database.includes('mongodb') || database.includes('mongo')) return 'mongodb';
      if (database.includes('postgres') || database.includes('postgresql')) return 'postgresql';
      if (database.includes('mysql')) return 'mysql';
      if (database.includes('sqlite')) return 'sqlite';
    }
    
    if (database.type) return database.type;
    
    return 'mongodb'; // Default
  }

  async getConnectionStatus() {
    const status = {
      mongodb: false,
      postgresql: false,
      mysql: false,
      sqlite: false
    };

    // Check MongoDB
    try {
      await mongoose.connection.db.admin().ping();
      status.mongodb = true;
    } catch (error) {
      status.mongodb = false;
    }

    // Check PostgreSQL
    try {
      if (this.pgPool) {
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
        status.postgresql = true;
      }
    } catch (error) {
      status.postgresql = false;
    }

    // Check MySQL
    try {
      if (this.mysqlPool) {
        const connection = await this.mysqlPool.getConnection();
        await connection.ping();
        connection.release();
        status.mysql = true;
      }
    } catch (error) {
      status.mysql = false;
    }

    return status;
  }

  async closeConnections() {
    try {
      if (this.pgPool) {
        await this.pgPool.end();
      }
      
      if (this.mysqlPool) {
        await this.mysqlPool.end();
      }
      
      await mongoose.connection.close();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DatabaseService();